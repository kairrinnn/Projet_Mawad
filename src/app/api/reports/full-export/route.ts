import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, isBuildPhase } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return 0;
}

export async function GET() {
  if (isBuildPhase()) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      counts: {},
      products: [],
      categories: [],
      suppliers: [],
      sales: [],
      expenses: [],
      stockEntries: [],
      stockMovements: [],
      auditLogs: [],
    });
  }

  const result = await requireRole("MANAGER");
  if ("response" in result) {
    return result.response;
  }

  const userId = result.session.user.id;

  try {
    const [
      products,
      categories,
      suppliers,
      sales,
      expenses,
      stockEntries,
      stockMovements,
      auditLogs,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { name: true } },
          categoryRef: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.sale.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { name: true, barcode: true } },
        },
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      prisma.stockEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        include: {
          product: { select: { name: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { name: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      counts: {
        products: products.length,
        categories: categories.length,
        suppliers: suppliers.length,
        sales: sales.length,
        expenses: expenses.length,
        stockEntries: stockEntries.length,
        stockMovements: stockMovements.length,
        auditLogs: auditLogs.length,
      },
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        salePrice: toNumber(product.salePrice),
        costPrice: toNumber(product.costPrice),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        category: product.categoryRef?.name || product.category || "",
        supplier: product.supplier?.name || "",
        archived: product.isArchived,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
      suppliers: suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact || "",
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      })),
      sales: sales.map((sale) => ({
        id: sale.id,
        date: sale.createdAt.toISOString(),
        product: sale.product.name,
        barcode: sale.product.barcode || "",
        quantity: sale.quantity,
        salePrice: toNumber(sale.salePrice),
        costPrice: toNumber(sale.costPrice),
        totalPrice: toNumber(sale.totalPrice),
        profit: toNumber(sale.profit),
        discount: toNumber(sale.discount),
        type: sale.type,
        refunded: sale.isRefunded,
        soldByWeight: sale.soldByWeight,
      })),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        date: expense.date.toISOString(),
        type: expense.type,
        amount: toNumber(expense.amount),
        description: expense.description || "",
        createdAt: expense.createdAt.toISOString(),
      })),
      stockEntries: stockEntries.map((entry) => ({
        id: entry.id,
        date: entry.date.toISOString(),
        product: entry.product.name,
        quantity: entry.quantity,
        costPrice: toNumber(entry.costPrice),
        totalCost: toNumber(entry.totalCost),
      })),
      stockMovements: stockMovements.map((movement) => ({
        id: movement.id,
        date: movement.createdAt.toISOString(),
        product: movement.product.name,
        type: movement.type,
        quantity: movement.quantity,
        oldStock: movement.oldStock,
        newStock: movement.newStock,
        reason: movement.reason || "",
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        date: log.createdAt.toISOString(),
        action: log.action,
        entityType: log.entityType || "",
        entityId: log.entityId || "",
        details: log.details || "",
      })),
    });
  } catch (error) {
    console.error("Full export error:", error);
    return NextResponse.json(
      { error: "Failed to build full export" },
      { status: 500 }
    );
  }
}
