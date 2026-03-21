import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Access denied. Manager role required." }, { status: 403 });
  }

  const userId = session.user.id;
  const lowStockSelect = {
    id: true,
    name: true,
    stock: true,
    lowStockThreshold: true,
    image: true,
  } satisfies Prisma.ProductSelect;

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Début de la semaine (lundi)
    const dayOfWeek = now.getDay() || 7; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- PARALLEL QUERIES START ---
    const [
        dailyExpenses,
        monthlyExpenses,
        dailyCashOut,
        weeklyExpenses,
        todaysTransactions,
        weeklySales,
        monthlySales,
        totalSales,
        totalExpenses,
        cashDrawer,
        lowStockItems,
        topSalesGrouped
    ] = await Promise.all([
        // Dépenses du jour (uniquement celles déjà payées/passées) - EXCLUANT les retraits gérant du profit
        prisma.expense.aggregate({
            where: { userId, date: { gte: startOfDay, lte: now }, type: { not: 'Withdrawal' } },
            _sum: { amount: true },
        }),
        // Dépenses du mois (uniquement celles déjà payées/passées)
        prisma.expense.aggregate({
            where: { userId, date: { gte: startOfMonth, lte: now }, type: { not: 'Withdrawal' } },
            _sum: { amount: true },
        }),
        // Dépenses quotidiennes (CAISSE) - Retraits gérant + Dépenses Caisse
        prisma.expense.aggregate({
            where: { userId, date: { gte: startOfDay, lte: now }, type: { in: ['Daily', 'Withdrawal'] } },
            _sum: { amount: true },
        }),
        // Dépenses de la semaine
        prisma.expense.aggregate({
            where: { userId, date: { gte: startOfWeek, lte: now }, type: { not: 'Withdrawal' } },
            _sum: { amount: true },
        }),
        // 1. Ventes et Remboursements du JOUR
        prisma.sale.findMany({
            where: { userId, createdAt: { gte: startOfDay } }
        }),
        // 2. Ventes de la semaine, mois et totales
        prisma.sale.aggregate({
            where: { userId, createdAt: { gte: startOfWeek } },
            _sum: { profit: true, quantity: true, totalPrice: true },
        }),
        prisma.sale.aggregate({
            where: { userId, createdAt: { gte: startOfMonth } },
            _sum: { profit: true, quantity: true, totalPrice: true },
        }),
        prisma.sale.aggregate({
            where: { userId },
            _sum: { profit: true, quantity: true, totalPrice: true },
        }),
        prisma.expense.aggregate({
            where: { userId, date: { lte: now }, type: { not: 'Withdrawal' } },
            _sum: { amount: true },
        }),
        // Fond de caisse d'aujourd'hui
        prisma.cashDrawer.findFirst({
            where: { userId, date: { gte: startOfDay } },
            orderBy: { date: 'desc' }
        }),
        prisma.product.findMany({
            where: { userId, isArchived: false },
            select: lowStockSelect
        }).then((products) => products.filter((product) => product.stock <= product.lowStockThreshold)),
        // OPTIMISATION CRITIQUE: GroupBy au lieu de findMany+Memory loop
        prisma.sale.groupBy({
            by: ['productId'],
            where: { userId },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        })
    ]);
    // --- PARALLEL QUERIES END ---

    // Fetch products for top sales in one go
    const productIds = topSalesGrouped.map(s => s.productId).filter(Boolean) as string[];
    const topProducts = productIds.length > 0 ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, image: true, category: true }
    }) : [];

    const enrichedTopSales = topSalesGrouped.map(s => {
        const prod = topProducts.find(p => p.id === s.productId);
        return {
            _sum: { quantity: s._sum.quantity },
            product: prod ? { name: prod.name, image: prod.image, category: prod.category } : null
        };
    });

    // Calcul des totaux du jour
    let dailyRevenueTotal = 0;
    let dailyProfitTotal = 0;
    let dailyQuantityTotal = 0;
    let revenueForCaisse = 0;

    // On a besoin de savoir si le parent d'un remboursement est d'aujourd'hui pour la règle "Caisse"
    const refundParentIds = todaysTransactions
        .filter(t => t.type === "REFUND" && t.parentId)
        .map(t => t.parentId as string);
    
    const parentSales = refundParentIds.length > 0 ? await prisma.sale.findMany({
        where: { id: { in: refundParentIds } },
        select: { id: true, createdAt: true }
    }) : [];

    const parentDateMap = new Map(parentSales.map(s => [s.id, s.createdAt]));

    for (const t of todaysTransactions) {
        dailyRevenueTotal += Number(t.totalPrice);
        dailyProfitTotal += Number(t.profit);
        dailyQuantityTotal += t.quantity;

        const parentDate = parentDateMap.get(t.parentId || "");
        if (t.type === "SALE" || (t.type === "REFUND" && parentDate && parentDate >= startOfDay)) {
            revenueForCaisse += Number(t.totalPrice);
        }
    }

    // Graphique 7 jours
    const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const [recentSales, recentExpenses] = await Promise.all([
        prisma.sale.findMany({
            where: { userId, createdAt: { gte: last7Days } },
            select: { createdAt: true, profit: true, quantity: true, totalPrice: true }
        }),
        prisma.expense.findMany({
            where: { userId, date: { gte: last7Days, lte: now }, type: { not: 'Withdrawal' } },
            select: { date: true, amount: true }
        })
    ]);

    const dataByDay: Record<string, { date: string; profit: number; revenue: number; expenses: number; quantity: number }> = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(last7Days); d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dataByDay[dateStr] = { date: dateStr, profit: 0, revenue: 0, expenses: 0, quantity: 0 };
    }

    recentSales.forEach(sale => {
        const dateStr = sale.createdAt.toISOString().split('T')[0];
        if (dataByDay[dateStr]) {
            dataByDay[dateStr].profit += Number(sale.profit);
            dataByDay[dateStr].revenue += Number(sale.totalPrice);
            dataByDay[dateStr].quantity += sale.quantity;
        }
    });

    recentExpenses.forEach(exp => {
        const dateStr = exp.date.toISOString().split('T')[0];
        if (dataByDay[dateStr]) dataByDay[dateStr].expenses += Number(exp.amount);
    });

    const grossMonthlyProfit = Number(monthlySales._sum?.profit || 0);
    const netMonthlyProfit = grossMonthlyProfit - Number(monthlyExpenses._sum?.amount || 0);

    return NextResponse.json({
        daily: { 
            revenue: dailyRevenueTotal,
            profit: dailyProfitTotal - Number(dailyExpenses._sum?.amount || 0), 
            grossProfit: dailyProfitTotal,
            expenses: Number(dailyExpenses._sum?.amount || 0),
            quantity: dailyQuantityTotal 
        },
        weekly: { 
            revenue: Number(weeklySales._sum?.totalPrice || 0),
            profit: Number(weeklySales._sum?.profit || 0) - Number(weeklyExpenses._sum?.amount || 0), 
            grossProfit: Number(weeklySales._sum?.profit || 0),
            expenses: Number(weeklyExpenses._sum?.amount || 0),
            quantity: Number(weeklySales._sum?.quantity || 0) 
        },
        monthly: { 
            revenue: Number(monthlySales._sum?.totalPrice || 0),
            profit: netMonthlyProfit, 
            grossProfit: grossMonthlyProfit,
            expenses: Number(monthlyExpenses._sum?.amount || 0),
            quantity: Number(monthlySales._sum?.quantity || 0) 
        },
        total: { 
            revenue: Number(totalSales._sum?.totalPrice || 0),
            profit: Number(totalSales._sum?.profit || 0) - Number(totalExpenses._sum?.amount || 0), 
            grossProfit: Number(totalSales._sum?.profit || 0),
            expenses: Number(totalExpenses._sum?.amount || 0),
            quantity: Number(totalSales._sum?.quantity || 0)
        },
        cashDrawer: {
            startingCash: Number(cashDrawer?.startingCash || 500),
            currentRevenue: revenueForCaisse,
            currentExpenses: Number(dailyCashOut._sum?.amount || 0),
            balance: Number(cashDrawer?.startingCash || 500) + revenueForCaisse - Number(dailyCashOut._sum?.amount || 0)
        },
        lowStockCount: lowStockItems.length,
        lowStockProducts: lowStockItems.slice(0, 5),
        topSales: enrichedTopSales,
        chartData: Object.values(dataByDay)
    });
  } catch (error: unknown) {
    console.error("Dashboard error:", error);
    const details = error instanceof Error ? error.message : "UNKNOWN";
    return NextResponse.json({ error: "Failed to fetch dashboard data", details }, { status: 500 });
  }
}
