import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireRole } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const id = request.nextUrl.pathname.split("/").pop() || "";
  const userId = sessionResult.session.user.id;

  try {
    const entry = await prisma.stockEntry.findFirst({
      where: { id, userId },
      include: {
        product: {
          select: { id: true, name: true, stock: true },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    const nextStock = entry.product.stock - entry.quantity;
    if (nextStock < 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer cette ligne: le stock courant deviendrait negatif. Corrige d'abord le stock du produit.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockEntry.delete({
        where: { id: entry.id },
      });

      await tx.product.update({
        where: { id: entry.product.id },
        data: { stock: nextStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: entry.product.id,
          userId,
          type: "ADJUSTMENT",
          quantity: Math.abs(entry.quantity),
          oldStock: entry.product.stock,
          newStock: nextStock,
          reason: `Deleted stock history entry #${entry.id.slice(-6)}`,
        },
      });
    });

    await recordAuditLog({
      action: "DELETE_STOCK_ENTRY",
      entityType: "StockEntry",
      entityId: entry.id,
      userId,
      details: `Deleted stock history entry for ${entry.product.name} (quantity: ${entry.quantity})`,
    });

    return NextResponse.json({ message: "Stock history entry deleted" });
  } catch (error) {
    console.error("Delete stock entry error:", error);
    return NextResponse.json({ error: "Failed to delete stock entry" }, { status: 500 });
  }
}
