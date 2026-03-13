import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const originalSale = await prisma.sale.findUnique({
      where: { id, userId: session.user.id },
      include: { product: true }
    });

    if (!originalSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (originalSale.isRefunded) {
      return NextResponse.json({ error: "Sale already refunded" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark original sale as refunded
      await tx.sale.update({
        where: { id },
        data: { isRefunded: true }
      });

      // 2. Put items back in stock
      await tx.product.update({
        where: { id: originalSale.productId },
        data: { stock: { increment: originalSale.quantity } }
      });

      // 3. Create a REFUND record with NEGATIVE values to impact dashboard correctly
      const refundRecord = await tx.sale.create({
        data: {
          productId: originalSale.productId,
          userId: session.user.id,
          quantity: -originalSale.quantity, // Negative quantity
          salePrice: originalSale.salePrice,
          costPrice: originalSale.costPrice,
          totalPrice: -originalSale.totalPrice, // Negative total price -> decreases revenue
          profit: -originalSale.profit, // Negative profit -> decreases profit
          discount: originalSale.discount,
          type: "REFUND",
          parentId: originalSale.id
        },
        include: { product: true }
      });

      return refundRecord;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
