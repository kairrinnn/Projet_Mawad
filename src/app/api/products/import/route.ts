import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const importRowSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  salePrice: z.coerce.number().finite().positive("Prix de vente doit être positif").max(1_000_000),
  costPrice: z.coerce.number().finite().nonnegative("Prix d'achat doit être >= 0").max(1_000_000),
  stock: z.coerce.number().finite().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.coerce.number().finite().min(0).max(1_000_000).default(5),
  barcode: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null)),
  category: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null)),
  description: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) =>
      typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, 1000) : null
    ),
});

const importBodySchema = z.object({
  products: z.array(importRowSchema).min(1).max(500),
});

async function resolveDbUser(sessionUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  if (!sessionUser.email) return null;
  const normalizedEmail = sessionUser.email.toLowerCase().trim();
  return prisma.user.upsert({
    where: { id: sessionUser.id },
    update: { name: sessionUser.name, email: normalizedEmail, image: sessionUser.image },
    create: { id: sessionUser.id, name: sessionUser.name, email: normalizedEmail, image: sessionUser.image },
  });
}

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json({ created: 0, errors: [] });
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = importBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const dbUser = await resolveDbUser(sessionResult.session.user);
  if (!dbUser) {
    return NextResponse.json(
      { error: "Profil utilisateur introuvable. Reconnectez-vous." },
      { status: 401 }
    );
  }

  const rows = parsed.data.products;
  let created = 0;
  const errors: Array<{ row: number; name: string; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Check barcode uniqueness if provided
      if (row.barcode) {
        const existing = await prisma.product.findFirst({
          where: { barcode: row.barcode, userId: dbUser.id },
          select: { id: true },
        });
        if (existing) {
          errors.push({ row: rowNum, name: row.name, error: `Code-barres "${row.barcode}" déjà utilisé` });
          continue;
        }
      }

      const product = await prisma.product.create({
        data: {
          name: row.name,
          barcode: row.barcode,
          salePrice: row.salePrice,
          costPrice: row.costPrice,
          stock: row.stock,
          lowStockThreshold: row.lowStockThreshold,
          category: row.category,
          description: row.description,
          userId: dbUser.id,
        },
      });

      if (product.stock > 0) {
        await prisma.stockEntry.create({
          data: {
            productId: product.id,
            quantity: product.stock,
            costPrice: product.costPrice,
            totalCost: product.stock * Number(product.costPrice),
            userId: dbUser.id,
            date: new Date(),
          },
        });
      }

      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      errors.push({ row: rowNum, name: row.name, error: msg });
    }
  }

  await recordAuditLog({
    action: "IMPORT_PRODUCTS",
    entityType: "Product",
    userId: dbUser.id,
    details: `Import Excel: ${created} créés, ${errors.length} erreurs sur ${rows.length} lignes`,
  });

  return NextResponse.json({ created, errors }, { status: 200 });
}
