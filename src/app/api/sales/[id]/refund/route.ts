import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const { id } = await params;

  try {
    const originalSale = await prisma.sale.findFirst({
      where: { id, userId: sessionResult.session.user.id },
      include: { product: true },
    });

    if (!originalSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (originalSale.isRefunded) {
      return NextResponse.json({ error: "Sale already refunded" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { isRefunded: true },
      });

      await tx.product.update({
        where: { id: originalSale.productId },
        data: { stock: { increment: originalSale.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: originalSale.productId,
          userId: sessionResult.session.user.id,
          type: "RETURN",
          quantity: originalSale.quantity,
          oldStock: Number(originalSale.product.stock),
          newStock: Number(originalSale.product.stock) + originalSale.quantity,
          reason: `Customer refund #${id.slice(-6)}`,
        },
      });

      return tx.sale.create({
        data: {
          productId: originalSale.productId,
          userId: sessionResult.session.user.id,
          quantity: -originalSale.quantity,
          salePrice: originalSale.salePrice,
          costPrice: originalSale.costPrice,
          totalPrice: -originalSale.totalPrice,
          profit: -originalSale.profit,
          discount: originalSale.discount,
          type: "REFUND",
          parentId: originalSale.id,
        },
        include: { product: true },
      });
    });

    await recordAuditLog({
      action: "REFUND_SALE",
      entityType: "Sale",
      entityId: id,
      userId: sessionResult.session.user.id,
      details: `Refund processed for sale ${id}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
