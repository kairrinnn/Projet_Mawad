import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";
import { saleSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const limit = searchParams.get("limit");

    const whereClause: Prisma.SaleWhereInput = { userId: sessionResult.session.user.id };
    if (productId) {
      whereClause.productId = productId;
    }

    const take = limit ? Number.parseInt(limit, 10) : undefined;
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, saleSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const { productId, quantity, discount } = bodyResult.data;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: sessionResult.session.user.id,
        isArchived: false,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }

    const salePrice = Number(product.salePrice);
    const costPrice = Number(product.costPrice);
    const totalRevenue = salePrice * quantity - discount;
    const totalCost = costPrice * quantity;
    const totalProfit = totalRevenue - totalCost;

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          productId,
          userId: sessionResult.session.user.id,
          quantity,
          salePrice: product.salePrice,
          costPrice: product.costPrice,
          totalPrice: totalRevenue,
          discount,
          profit: totalProfit,
        },
        include: { product: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: Number(product.stock) - quantity },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          userId: sessionResult.session.user.id,
          type: "OUT",
          quantity,
          oldStock: product.stock,
          newStock: product.stock - quantity,
          reason: `Sale #${sale.id.slice(-6)}`,
        },
      });

      return sale;
    });

    await recordAuditLog({
      action: "CREATE_SALE",
      entityType: "Sale",
      entityId: result.id,
      userId: sessionResult.session.user.id,
      details: `Sale created: ${quantity}x ${result.product?.name || productId} for ${totalRevenue} DH`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Sale error:", error);
    return NextResponse.json({ error: "Failed to process sale" }, { status: 500 });
  }
}
