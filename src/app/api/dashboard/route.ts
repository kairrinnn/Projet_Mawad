import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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
  const lowStockSelect = {
    id: true,
    name: true,
    stock: true,
    lowStockThreshold: true,
    image: true,
  } satisfies Prisma.ProductSelect;

  try {
    const now = new Date();
    const { startOfDay, nextDay, startOfWeek, startOfMonth } = getBusinessPeriodBounds(now);

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
        where: { userId, date: { gte: startOfDay, lt: nextDay }, type: { in: ["Daily", "Withdrawal"] } },
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
      prisma.product
        .findMany({
          where: { userId, isArchived: false },
          select: lowStockSelect,
        })
        .then((products) => products.filter((product) => product.stock <= product.lowStockThreshold)),
      prisma.sale.groupBy({
        by: ["productId"],
        where: { userId },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
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
    let dailyQuantityTotal = 0;
    let revenueForCaisse = 0;

    for (const transaction of todaysTransactions) {
      dailyRevenueTotal += Number(transaction.totalPrice);
      dailyProfitTotal += Number(transaction.profit);
      dailyQuantityTotal += transaction.quantity;

      if (transaction.paymentMethod === "CASH") {
        revenueForCaisse += Number(transaction.totalPrice);
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
    const expectedCash = startingCash + revenueForCaisse - currentExpenses;

    return NextResponse.json({
      daily: {
        revenue: dailyRevenueTotal,
        profit: dailyProfitTotal - Number(dailyExpenses._sum?.amount || 0),
        grossProfit: dailyProfitTotal,
        expenses: Number(dailyExpenses._sum?.amount || 0),
        quantity: dailyQuantityTotal,
      },
      weekly: {
        revenue: Number(weeklySales._sum?.totalPrice || 0),
        profit: Number(weeklySales._sum?.profit || 0) - Number(weeklyExpenses._sum?.amount || 0),
        grossProfit: Number(weeklySales._sum?.profit || 0),
        expenses: Number(weeklyExpenses._sum?.amount || 0),
        quantity: Number(weeklySales._sum?.quantity || 0),
      },
      monthly: {
        revenue: Number(monthlySales._sum?.totalPrice || 0),
        profit: netMonthlyProfit,
        grossProfit: grossMonthlyProfit,
        expenses: Number(monthlyExpenses._sum?.amount || 0),
        quantity: Number(monthlySales._sum?.quantity || 0),
      },
      total: {
        revenue: Number(totalSales._sum?.totalPrice || 0),
        profit: Number(totalSales._sum?.profit || 0) - Number(totalExpenses._sum?.amount || 0),
        grossProfit: Number(totalSales._sum?.profit || 0),
        expenses: Number(totalExpenses._sum?.amount || 0),
        quantity: Number(totalSales._sum?.quantity || 0),
      },
      cashDrawer: {
        startingCash,
        expectedCash,
        currentRevenue: revenueForCaisse,
        currentExpenses,
        closingCash: Number(cashDrawer?.closingCash || 0),
        variance: Number(cashDrawer?.variance || 0),
        isClosed: Boolean(cashDrawer?.closedAt),
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
