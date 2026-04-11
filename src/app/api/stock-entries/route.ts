import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";

const stockEntrySchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  costPrice: z.coerce.number().finite().positive().max(1_000_000),
});

export async function DELETE() {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const userId = sessionResult.session.user.id;

  try {
    const { count } = await prisma.stockEntry.deleteMany({ where: { userId } });

    await recordAuditLog({
      action: "CLEAR_STOCK_HISTORY",
      entityType: "StockEntry",
      userId,
      details: `Historique stock vidé : ${count} ligne(s) supprimée(s). Stocks produits inchangés.`,
    });

    return NextResponse.json({ deleted: count });
  } catch {
    return NextResponse.json({ error: "Échec de la suppression" }, { status: 500 });
  }
}

export async function GET() {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const entries = await prisma.stockEntry.findMany({
      where: { userId: sessionResult.session.user.id },
      include: {
        product: true,
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Fetch stock entries error:", error);
    return NextResponse.json({ error: "Failed to fetch stock entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, stockEntrySchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: bodyResult.data.productId,
          userId: sessionResult.session.user.id,
          isArchived: false,
        },
        select: { id: true, stock: true },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      const entry = await tx.stockEntry.create({
        data: {
          productId: product.id,
          quantity: bodyResult.data.quantity,
          costPrice: bodyResult.data.costPrice,
          totalCost: bodyResult.data.quantity * bodyResult.data.costPrice,
          userId: sessionResult.session.user.id,
          date: new Date(),
        },
        include: { product: true },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock + bodyResult.data.quantity },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          userId: sessionResult.session.user.id,
          type: "IN",
          quantity: bodyResult.data.quantity,
          oldStock: product.stock,
          newStock: product.stock + bodyResult.data.quantity,
          reason: `Stock entry #${entry.id.slice(-6)}`,
        },
      });

      return entry;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create stock entry error:", error);
    return NextResponse.json({ error: "Failed to create stock entry" }, { status: 500 });
  }
}
