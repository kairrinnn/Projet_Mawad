import { headers } from "next/headers";
import { NextResponse } from "next/server";
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

  const userId = session.user.id;

    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Débu de la semaine (lundi)
        const dayOfWeek = now.getDay() || 7; 
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Dépenses du jour (uniquement celles déjà payées/passées)
        const dailyExpenses = await prisma.expense.aggregate({
            where: { 
                userId, 
                date: { gte: startOfDay, lte: now } 
            },
            _sum: { amount: true },
        });

        // Dépenses du mois (uniquement celles déjà payées/passées)
        const monthlyExpenses = await prisma.expense.aggregate({
            where: { 
                userId, 
                date: { gte: startOfMonth, lte: now } 
            },
            _sum: { amount: true },
        });

        // Dépenses quotidiennes (CAISSE) - uniquement de type 'Daily'
        const dailyCashExpenses = await prisma.expense.aggregate({
            where: { 
                userId, 
                date: { gte: startOfDay, lte: now },
                type: 'Daily'
            },
            _sum: { amount: true },
        });

        // Dépenses de la semaine
        const weeklyExpenses = await prisma.expense.aggregate({
            where: { userId, date: { gte: startOfWeek, lte: now } },
            _sum: { amount: true },
        });

        // Ventes du jour
        const dailySales = await prisma.sale.aggregate({
            where: { userId, createdAt: { gte: startOfDay } },
            _sum: { profit: true, quantity: true, salePrice: true },
        });

        // Ventes de la semaine
        const weeklySales = await prisma.sale.aggregate({
            where: { userId, createdAt: { gte: startOfWeek } },
            _sum: { profit: true, quantity: true, salePrice: true },
        });

        // Ventes du mois
        const monthlySales = await prisma.sale.aggregate({
            where: { userId, createdAt: { gte: startOfMonth } },
            _sum: { profit: true, quantity: true, salePrice: true },
        });

        // Ventes totales
        const totalSales = await prisma.sale.aggregate({
            where: { userId },
            _sum: { profit: true, quantity: true, salePrice: true },
        });

        const totalExpenses = await prisma.expense.aggregate({
            where: { userId, date: { lte: now } },
            _sum: { amount: true },
        });

        // Fond de caisse d'aujourd'hui
        const cashDrawer = await (prisma as any).cashDrawer.findFirst({
            where: { 
                userId,
                date: { gte: startOfDay }
            },
            orderBy: { date: 'desc' }
        });

        const lowStockCount = await prisma.product.count({
            where: { userId, stock: { lte: 5 }, isArchived: false }
        });
        
        // Top Ventes
        const allSalesForTop = await prisma.sale.findMany({
            where: { userId },
            include: {
                product: {
                    select: { name: true, image: true, category: true }
                }
            }
        });

        const salesByName: Record<string, { name: string; quantity: number; image: string | null; category: string | null }> = {};
        
        allSalesForTop.forEach(sale => {
            const name = sale.product?.name || "Produit inconnu";
            if (!salesByName[name]) {
                salesByName[name] = { 
                    name, 
                    quantity: 0, 
                    image: sale.product?.image || null,
                    category: sale.product?.category || null
                };
            }
            salesByName[name].quantity += sale.quantity;
            if (sale.product?.image) salesByName[name].image = sale.product.image;
        });

        const enrichedTopSales = Object.values(salesByName)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
            .map(s => ({
                _sum: { quantity: s.quantity },
                product: { name: s.name, image: s.image, category: s.category }
            }));

        // Graphique 7 jours
        const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const recentSales = await prisma.sale.findMany({
            where: { userId, createdAt: { gte: last7Days } },
            select: { createdAt: true, profit: true, quantity: true, salePrice: true }
        });

        const salesByDay: Record<string, { date: string; profit: number; revenue: number; quantity: number }> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(last7Days);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            salesByDay[dateStr] = { date: dateStr, profit: 0, revenue: 0, quantity: 0 };
        }

        recentSales.forEach(sale => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (salesByDay[dateStr]) {
                salesByDay[dateStr].profit += sale.profit;
                salesByDay[dateStr].revenue += sale.salePrice;
                salesByDay[dateStr].quantity += sale.quantity;
            }
        });

        const grossMonthlyProfit = monthlySales._sum?.profit || 0;
        const netMonthlyProfit = grossMonthlyProfit - (monthlyExpenses._sum?.amount || 0);

        return NextResponse.json({
            daily: { 
                revenue: dailySales._sum?.salePrice || 0,
                profit: (dailySales._sum?.profit || 0) - (dailyExpenses._sum?.amount || 0), 
                grossProfit: dailySales._sum?.profit || 0,
                expenses: dailyExpenses._sum?.amount || 0,
                quantity: dailySales._sum?.quantity || 0 
            },
            weekly: { 
                revenue: weeklySales._sum?.salePrice || 0,
                profit: (weeklySales._sum?.profit || 0) - (weeklyExpenses._sum?.amount || 0), 
                grossProfit: weeklySales._sum?.profit || 0,
                expenses: weeklyExpenses._sum?.amount || 0,
                quantity: weeklySales._sum?.quantity || 0 
            },
            monthly: { 
                revenue: monthlySales._sum?.salePrice || 0,
                profit: netMonthlyProfit, 
                grossProfit: grossMonthlyProfit,
                expenses: monthlyExpenses._sum?.amount || 0,
                quantity: monthlySales._sum?.quantity || 0 
            },
            total: { 
                revenue: totalSales._sum?.salePrice || 0,
                profit: (totalSales._sum?.profit || 0) - (totalExpenses._sum?.amount || 0), 
                grossProfit: totalSales._sum?.profit || 0,
                expenses: totalExpenses._sum?.amount || 0,
                quantity: totalSales._sum?.quantity || 0 
            },
            cashDrawer: {
                startingCash: cashDrawer?.startingCash || 500,
                currentRevenue: dailySales._sum?.salePrice || 0,
                currentExpenses: dailyCashExpenses._sum?.amount || 0,
                balance: (cashDrawer?.startingCash || 500) + (dailySales._sum?.salePrice || 0) - (dailyCashExpenses._sum?.amount || 0)
            },
            lowStockCount,
            topSales: enrichedTopSales,
            chartData: Object.values(salesByDay)
        });
    } catch (error: any) {
        console.error("Dashboard error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data", details: error.message }, { status: 500 });
    }
}
