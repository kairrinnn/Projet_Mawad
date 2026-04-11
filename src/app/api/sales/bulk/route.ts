import type { Product } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { createTicketNumber, getCashHandling } from "@/lib/server/sales";
import { parseJsonBody } from "@/lib/server/validation";
import { bulkSaleSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

async function processPost(request: Request) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, bulkSaleSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const { items, paymentMethod, cashReceived } = bodyResult.data;

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: sessionResult.session.user.id,
        isArchived: false,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const productStockTracker = new Map<string, number>();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }

      const salePrice = Number(
        item.soldByWeight ? product.weightSalePrice || product.salePrice : product.salePrice
      );
      const subtotal = salePrice * item.quantity;
      if (item.discount > subtotal) {
        return NextResponse.json(
          { error: `Discount cannot exceed the subtotal for ${product.name}` },
          { status: 400 }
        );
      }

      const MAX_CASHIER_DISCOUNT_PCT = 0.30;
      if (
        sessionResult.session.user.role !== "MANAGER" &&
        item.discount > subtotal * MAX_CASHIER_DISCOUNT_PCT
      ) {
        return NextResponse.json(
          { error: `Remise limitée à ${MAX_CASHIER_DISCOUNT_PCT * 100}% pour un caissier (${product.name}). Contactez le gérant.` },
          { status: 400 }
        );
      }

      const remainingStock = productStockTracker.get(item.productId) ?? Number(product.stock);
      if (remainingStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      productStockTracker.set(item.productId, remainingStock - item.quantity);
    }

    const orderTotal = items.reduce((sum, item) => {
      const product = productMap.get(item.productId) as Product;
      const salePrice = Number(
        item.soldByWeight ? product.weightSalePrice || product.salePrice : product.salePrice
      );

      return sum + salePrice * item.quantity - item.discount;
    }, 0);

    const ticketNumber = createTicketNumber();
    const { normalizedCashReceived, changeGiven } = getCashHandling(
      paymentMethod,
      cashReceived,
      orderTotal
    );

    const result = await prisma.$transaction(async (tx) => {
      const createdSales = [];
      const movementTracker = new Map(products.map((product) => [product.id, Number(product.stock)]));

      for (const [index, item] of items.entries()) {
        const product = productMap.get(item.productId) as Product;
        const salePrice = Number(
          item.soldByWeight ? product.weightSalePrice || product.salePrice : product.salePrice
        );
        const costPrice = Number(
          item.soldByWeight ? product.weightCostPrice || product.costPrice : product.costPrice
        );

        const totalRevenue = salePrice * item.quantity - item.discount;
        const totalCost = costPrice * item.quantity;
        const profit = totalRevenue - totalCost;

        const sale = await tx.sale.create({
          data: {
            productId: item.productId,
            userId: sessionResult.session.user.id,
            ticketNumber,
            paymentMethod,
            quantity: item.quantity,
            salePrice,
            costPrice,
            totalPrice: totalRevenue,
            discount: item.discount,
            profit,
            soldByWeight: item.soldByWeight,
            cashReceived: index === 0 ? normalizedCashReceived : null,
            changeGiven: index === 0 ? changeGiven : 0,
          },
        });

        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            userId: sessionResult.session.user.id,
            isArchived: false,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (stockUpdate.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
        }

        const oldStock = movementTracker.get(item.productId) ?? Number(product.stock);
        const newStock = oldStock - item.quantity;
        movementTracker.set(item.productId, newStock);

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: sessionResult.session.user.id,
            type: "OUT",
            quantity: item.quantity,
            oldStock,
            newStock,
            reason: `Bulk sale #${sale.id.slice(-6)}`,
          },
        });

        createdSales.push(sale);
      }

      return createdSales;
    });

    await recordAuditLog({
      action: "CREATE_BULK_SALE",
      entityType: "Sale",
      userId: sessionResult.session.user.id,
      details: `Bulk sale created with ${items.length} items and ${result.length} sale rows via ${paymentMethod}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Bulk sale error:", error);
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK")) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_CASH_RECEIVED") {
      return NextResponse.json(
        { error: "Cash received must cover the total amount" },
        { status: 400 }
      );
    }

    const details = error instanceof Error ? error.message : "UNKNOWN";
    return NextResponse.json({ error: "Failed to process bulk sale", details }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processPost(request);
}
