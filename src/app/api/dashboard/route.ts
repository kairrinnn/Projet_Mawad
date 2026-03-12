import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.BUILD_MODE === "1") return NextResponse.json([]);

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

        // Fond de caisse d'aujourd'hui
        // Note: On utilise findFirst car l'heure peut varier légèrement si non tronquée
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
        
        const topSales = await prisma.sale.groupBy({
            by: ['productId'],
            where: { userId },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const topProductsIds = topSales.map(s => s.productId);
        const topProducts = await prisma.product.findMany({
            where: { id: { in: topProductsIds }, userId }
        });

        const enrichedTopSales = topSales.map(sale => ({
            ...sale,
            product: topProducts.find(p => p.id === sale.productId)
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

        return NextResponse.json({
            daily: { 
                revenue: dailySales._sum?.salePrice || 0,
                profit: dailySales._sum?.profit || 0, 
                quantity: dailySales._sum?.quantity || 0 
            },
            weekly: { 
                revenue: weeklySales._sum?.salePrice || 0,
                profit: weeklySales._sum?.profit || 0, 
                quantity: weeklySales._sum?.quantity || 0 
            },
            monthly: { 
                revenue: monthlySales._sum?.salePrice || 0,
                profit: monthlySales._sum?.profit || 0, 
                quantity: monthlySales._sum?.quantity || 0 
            },
            total: { 
                revenue: totalSales._sum?.salePrice || 0,
                profit: totalSales._sum?.profit || 0, 
                quantity: totalSales._sum?.quantity || 0 
            },
            cashDrawer: {
                startingCash: cashDrawer?.startingCash || 500,
                currentRevenue: dailySales._sum?.salePrice || 0
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
