import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const now = new Date();
    
    // Début de la journée
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Début de la semaine (lundi)
    const dayOfWeek = now.getDay() || 7; // Dimanche = 7
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);

    // Début du mois
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ventes du jour
    const dailySales = await prisma.sale.aggregate({
      where: { 
        userId,
        createdAt: { gte: startOfDay } 
      },
      _sum: { profit: true, quantity: true },
    });

    // Ventes de la semaine
    const weeklySales = await prisma.sale.aggregate({
      where: { 
        userId,
        createdAt: { gte: startOfWeek } 
      },
      _sum: { profit: true, quantity: true },
    });

    // Ventes du mois
    const monthlySales = await prisma.sale.aggregate({
      where: { 
        userId,
        createdAt: { gte: startOfMonth } 
      },
      _sum: { profit: true, quantity: true },
    });

    // Ventes totales
    const totalSales = await prisma.sale.aggregate({
      where: { userId },
      _sum: { profit: true, quantity: true },
    });

    // Produits en rupture ou proches de la rupture
    const lowStockProducts = await prisma.product.count({
      where: { 
        userId,
        stock: { lte: 5 },
        isArchived: false
      }
    });
    
    // Top 5 des ventes
    const topSales = await prisma.sale.groupBy({
        by: ['productId'],
        where: { userId },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
    });

    // Détail des top produits
    const topProductsIds = topSales.map(s => s.productId);
    const topProducts = await prisma.product.findMany({
        where: { 
          id: { in: topProductsIds },
          userId
        }
    });

    const enrichedTopSales = topSales.map(sale => ({
        ...sale,
        product: topProducts.find(p => p.id === sale.productId)
    }));

    // Graphique des ventes des 7 derniers jours
    const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const recentSales = await prisma.sale.findMany({
        where: { 
          userId,
          createdAt: { gte: last7Days } 
        },
        select: { createdAt: true, profit: true, quantity: true }
    });

    // Grouper les ventes par jour
    const salesByDay: Record<string, { date: string; profit: number; quantity: number }> = {};
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(last7Days);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        salesByDay[dateStr] = { date: dateStr, profit: 0, quantity: 0 };
    }

    recentSales.forEach(sale => {
        const dateStr = sale.createdAt.toISOString().split('T')[0];
        if (salesByDay[dateStr]) {
            salesByDay[dateStr].profit += sale.profit;
            salesByDay[dateStr].quantity += sale.quantity;
        }
    });

    const chartData = Object.values(salesByDay);

    return NextResponse.json({
      daily: { profit: dailySales._sum?.profit || 0, quantity: dailySales._sum?.quantity || 0 },
      weekly: { profit: weeklySales._sum?.profit || 0, quantity: weeklySales._sum?.quantity || 0 },
      monthly: { profit: monthlySales._sum?.profit || 0, quantity: monthlySales._sum?.quantity || 0 },
      total: { profit: totalSales._sum?.profit || 0, quantity: totalSales._sum?.quantity || 0 },
      lowStockCount: lowStockProducts,
      topSales: enrichedTopSales,
      chartData
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
