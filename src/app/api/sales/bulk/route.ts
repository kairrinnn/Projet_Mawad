import type { Product } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
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
    const items = bodyResult.data.items;

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: sessionResult.session.user.id,
        isArchived: false,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdSales = [];

      for (const item of items) {
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
            quantity: item.quantity,
            salePrice,
            costPrice,
            totalPrice: totalRevenue,
            discount: item.discount,
            profit,
            soldByWeight: item.soldByWeight,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: sessionResult.session.user.id,
            type: "OUT",
            quantity: item.quantity,
            oldStock: product.stock,
            newStock: product.stock - item.quantity,
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
      details: `Bulk sale created with ${items.length} items and ${result.length} sale rows`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Bulk sale error:", error);
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
