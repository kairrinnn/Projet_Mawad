import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  formatBusinessDateKey,
  getBusinessDayWindow,
  getBusinessPeriodBounds,
} from "@/lib/server/business-time";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1") {
    return NextResponse.json([]);
  }

  await headers();

  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Access denied. Manager role required." }, { status: 403 });
  }

  const userId = session.user.id;
  try {
    const now = new Date();
    const { startOfDay, nextDay, startOfWeek, startOfMonth } = getBusinessPeriodBounds(now);

    // Previous period bounds
    const prevDayStart = new Date(startOfDay); prevDayStart.setUTCDate(prevDayStart.getUTCDate() - 1);
    const prevWeekStart = new Date(startOfWeek); prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
    const prevMonthDate = new Date(startOfMonth); prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
    const { startOfMonth: prevMonthStart } = getBusinessPeriodBounds(prevMonthDate);

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
      topSalesGrouped,
      prevDaySales,
      prevDayExpenses,
      prevWeekSales,
      prevWeekExpenses,
      prevMonthSales,
      prevMonthExpenses,
      weeklyWeightSales,
      monthlyWeightSales,
      totalWeightSales,
    ] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId, date: { gte: startOfDay, lt: nextDay }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: startOfMonth, lte: now }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: startOfDay, lt: nextDay },
          OR: [{ type: { in: ["Daily", "Withdrawal"] } }, { paidInCash: true }],
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: startOfWeek, lte: now }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.sale.findMany({
        where: { userId, createdAt: { gte: startOfDay, lt: nextDay } },
      }),
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
        where: { userId, date: { lte: now }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.cashDrawer.findUnique({
        where: { userId_date: { userId, date: startOfDay } },
      }),
      prisma.$queryRaw<Array<{ id: string; name: string; stock: number; lowStockThreshold: number; image: string | null }>>`
        SELECT id, name, stock, "lowStockThreshold", image
        FROM "Product"
        WHERE "userId" = ${userId}
          AND "isArchived" = false
          AND stock <= "lowStockThreshold"
        LIMIT 50
      `,
      prisma.sale.groupBy({
        by: ["productId"],
        where: { userId },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      // Previous periods for N vs N-1 comparison
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: prevDayStart, lt: startOfDay } },
        _sum: { profit: true, totalPrice: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: prevDayStart, lt: startOfDay }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: prevWeekStart, lt: startOfWeek } },
        _sum: { profit: true, totalPrice: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: prevWeekStart, lt: startOfWeek }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: prevMonthStart, lt: startOfMonth } },
        _sum: { profit: true, totalPrice: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: prevMonthStart, lt: startOfMonth }, type: { not: "Withdrawal" } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: startOfWeek }, soldByWeight: true },
        _sum: { quantity: true },
      }),
      prisma.sale.aggregate({
        where: { userId, createdAt: { gte: startOfMonth }, soldByWeight: true },
        _sum: { quantity: true },
      }),
      prisma.sale.aggregate({
        where: { userId, soldByWeight: true },
        _sum: { quantity: true },
      }),
    ]);

    const productIds = topSalesGrouped.map((sale) => sale.productId).filter(Boolean) as string[];
    const topProducts =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, image: true, category: true },
          })
        : [];

    const enrichedTopSales = topSalesGrouped.map((sale) => {
      const product = topProducts.find((candidate) => candidate.id === sale.productId);
      return {
        _sum: { quantity: sale._sum.quantity },
        product: product
          ? { name: product.name, image: product.image, category: product.category }
          : null,
      };
    });

    let dailyRevenueTotal = 0;
    let dailyProfitTotal = 0;
    let dailyUnitsSold = 0;
    let dailyWeightKg = 0;
    let cashIn = 0;       // espèces reçues (ventes cash positives)
    let cashRefunds = 0;  // espèces rendues (remboursements cash)

    for (const transaction of todaysTransactions) {
      const totalPrice = Number(transaction.totalPrice);
      const profit = Number(transaction.profit);

      dailyRevenueTotal += totalPrice;
      dailyProfitTotal += profit;

      // Quantité : uniquement les ventes réelles (pas les remboursements, pas les ventes annulées)
      if (transaction.type !== "REFUND" && !transaction.isRefunded) {
        if (transaction.soldByWeight) {
          dailyWeightKg += transaction.quantity;
        } else {
          dailyUnitsSold += transaction.quantity;
        }
      }

      if (transaction.paymentMethod === "CASH") {
        if (totalPrice >= 0) {
          cashIn += totalPrice;
        } else {
          cashRefunds += Math.abs(totalPrice);
        }
      }
    }

    const last7Days = getBusinessDayWindow(7, now).start;
    const [recentSales, recentExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: { userId, createdAt: { gte: last7Days } },
        select: { createdAt: true, profit: true, quantity: true, totalPrice: true },
      }),
      prisma.expense.findMany({
        where: { userId, date: { gte: last7Days, lte: now }, type: { not: "Withdrawal" } },
        select: { date: true, amount: true },
      }),
    ]);

    const dataByDay: Record<
      string,
      { date: string; profit: number; revenue: number; expenses: number; quantity: number }
    > = {};

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(last7Days);
      date.setUTCDate(date.getUTCDate() + index);
      const key = formatBusinessDateKey(date);
      dataByDay[key] = { date: key, profit: 0, revenue: 0, expenses: 0, quantity: 0 };
    }

    recentSales.forEach((sale) => {
      const key = formatBusinessDateKey(sale.createdAt);
      if (dataByDay[key]) {
        dataByDay[key].profit += Number(sale.profit);
        dataByDay[key].revenue += Number(sale.totalPrice);
        dataByDay[key].quantity += sale.quantity;
      }
    });

    recentExpenses.forEach((expense) => {
      const key = formatBusinessDateKey(expense.date);
      if (dataByDay[key]) {
        dataByDay[key].expenses += Number(expense.amount);
      }
    });

    const grossMonthlyProfit = Number(monthlySales._sum?.profit || 0);
    const netMonthlyProfit = grossMonthlyProfit - Number(monthlyExpenses._sum?.amount || 0);
    const currentExpenses = Number(dailyCashOut._sum?.amount || 0);
    const startingCash = Number(cashDrawer?.startingCash || 500);
    const expectedCash = startingCash + cashIn - cashRefunds - currentExpenses;

    // Previous period net profits
    const prevDay = {
      profit: Number(prevDaySales._sum?.profit || 0) - Number(prevDayExpenses._sum?.amount || 0),
      grossProfit: Number(prevDaySales._sum?.profit || 0),
      expenses: Number(prevDayExpenses._sum?.amount || 0),
    };
    const prevWeek = {
      profit: Number(prevWeekSales._sum?.profit || 0) - Number(prevWeekExpenses._sum?.amount || 0),
      grossProfit: Number(prevWeekSales._sum?.profit || 0),
      expenses: Number(prevWeekExpenses._sum?.amount || 0),
    };
    const prevMonth = {
      profit: Number(prevMonthSales._sum?.profit || 0) - Number(prevMonthExpenses._sum?.amount || 0),
      grossProfit: Number(prevMonthSales._sum?.profit || 0),
      expenses: Number(prevMonthExpenses._sum?.amount || 0),
    };

    return NextResponse.json({
      daily: {
        revenue: dailyRevenueTotal,
        profit: dailyProfitTotal - Number(dailyExpenses._sum?.amount || 0),
        grossProfit: dailyProfitTotal,
        expenses: Number(dailyExpenses._sum?.amount || 0),
        quantity: dailyUnitsSold,
        weightKg: dailyWeightKg,
        prev: prevDay,
      },
      weekly: {
        revenue: Number(weeklySales._sum?.totalPrice || 0),
        profit: Number(weeklySales._sum?.profit || 0) - Number(weeklyExpenses._sum?.amount || 0),
        grossProfit: Number(weeklySales._sum?.profit || 0),
        expenses: Number(weeklyExpenses._sum?.amount || 0),
        quantity: Number(weeklySales._sum?.quantity || 0) - Number(weeklyWeightSales._sum?.quantity || 0),
        weightKg: Number(weeklyWeightSales._sum?.quantity || 0),
        prev: prevWeek,
      },
      monthly: {
        revenue: Number(monthlySales._sum?.totalPrice || 0),
        profit: netMonthlyProfit,
        grossProfit: grossMonthlyProfit,
        expenses: Number(monthlyExpenses._sum?.amount || 0),
        quantity: Number(monthlySales._sum?.quantity || 0) - Number(monthlyWeightSales._sum?.quantity || 0),
        weightKg: Number(monthlyWeightSales._sum?.quantity || 0),
        prev: prevMonth,
      },
      total: {
        revenue: Number(totalSales._sum?.totalPrice || 0),
        profit: Number(totalSales._sum?.profit || 0) - Number(totalExpenses._sum?.amount || 0),
        grossProfit: Number(totalSales._sum?.profit || 0),
        expenses: Number(totalExpenses._sum?.amount || 0),
        quantity: Number(totalSales._sum?.quantity || 0) - Number(totalWeightSales._sum?.quantity || 0),
        weightKg: Number(totalWeightSales._sum?.quantity || 0),
      },
      cashDrawer: {
        startingCash,
        expectedCash,
        currentRevenue: cashIn,
        cashRefunds,
        currentExpenses,
        closingCash: Number(cashDrawer?.closingCash || 0),
        variance: Number(cashDrawer?.variance || 0),
        isClosed: Boolean(cashDrawer?.closedAt),
        isOpened: Boolean(cashDrawer),
        closedAt: cashDrawer?.closedAt ?? null,
        balance: expectedCash,
      },
      lowStockCount: lowStockItems.length,
      lowStockProducts: lowStockItems.slice(0, 5),
      topSales: enrichedTopSales,
      chartData: Object.values(dataByDay),
    });
  } catch (error: unknown) {
    console.error("Dashboard error:", error);
    const details = error instanceof Error ? error.message : "UNKNOWN";
    return NextResponse.json({ error: "Failed to fetch dashboard data", details }, { status: 500 });
  }
}
