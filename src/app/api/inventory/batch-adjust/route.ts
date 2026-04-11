import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireRole } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const batchAdjustSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        newStock: z.coerce.number().finite().min(0).max(1_000_000),
      })
    )
    .min(1)
    .max(500),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json({ adjusted: 0, skipped: 0, errors: [] });
  }

  const result = await requireRole("MANAGER");
  if ("response" in result) {
    return result.response;
  }

  const userId = result.session.user.id;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = batchAdjustSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { items, note } = parsed.data;
  const reason = note?.trim() || "Inventaire physique";

  let adjusted = 0;
  let skipped = 0;
  const errors: Array<{ productId: string; error: string }> = [];

  for (const item of items) {
    try {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, userId },
        select: { id: true, stock: true, costPrice: true },
      });

      if (!product) {
        errors.push({ productId: item.productId, error: "Produit introuvable" });
        continue;
      }

      const oldStock = Number(product.stock);
      const newStock = item.newStock;
      const diff = newStock - oldStock;

      if (diff === 0) {
        skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId,
            type: "ADJUSTMENT",
            quantity: Math.abs(diff),
            oldStock,
            newStock,
            reason,
          },
        });

        const costPrice = Number(product.costPrice);
        await tx.stockEntry.create({
          data: {
            productId: item.productId,
            userId,
            quantity: diff,
            costPrice,
            totalCost: diff * costPrice,
            date: new Date(),
          },
        });
      });

      adjusted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      errors.push({ productId: item.productId, error: msg });
    }
  }

  await recordAuditLog({
    action: "PHYSICAL_INVENTORY",
    entityType: "Product",
    userId,
    details: `Inventaire physique : ${adjusted} produit(s) ajusté(s), ${skipped} inchangé(s), ${errors.length} erreur(s). Note: ${reason}`,
  });

  return NextResponse.json({ adjusted, skipped, errors });
}
