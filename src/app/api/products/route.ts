import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";
import { productSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

async function resolveDbUser(sessionUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  const normalizedEmail = sessionUser.email?.toLowerCase().trim();
  const orConditions: Prisma.UserWhereInput[] = [{ id: sessionUser.id }];
  if (normalizedEmail) {
    orConditions.push({ email: { equals: normalizedEmail, mode: "insensitive" } });
  }

  let dbUser = await prisma.user.findFirst({
    where: { OR: orConditions },
  });

  if (!dbUser && sessionUser.email) {
    dbUser = await prisma.user.create({
      data: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: normalizedEmail,
        image: sessionUser.image,
      },
    });
  } else if (dbUser && normalizedEmail && dbUser.email !== normalizedEmail) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        name: sessionUser.name,
        email: normalizedEmail,
        image: sessionUser.image,
      },
    });
  }

  return dbUser;
}

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
    const supplierId = searchParams.get("supplierId");
    const barcode = searchParams.get("barcode");

    if (barcode) {
      const product = await prisma.product.findFirst({
        where: {
          barcode: barcode.trim(),
          userId: sessionResult.session.user.id,
          isArchived: false,
        },
        include: { supplier: true },
      });
      return NextResponse.json(product);
    }

    const whereClause: Prisma.ProductWhereInput = {
      userId: sessionResult.session.user.id,
      isArchived: false,
    };
    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        supplier: true,
        categoryRef: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
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

  const bodyResult = await parseJsonBody(request, productSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const dbUser = await resolveDbUser(sessionResult.session.user);
    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    const input = bodyResult.data;

    if (input.barcode) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          barcode: input.barcode,
          userId: dbUser.id,
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: "This barcode is already used in your inventory." },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        barcode: input.barcode,
        salePrice: input.salePrice,
        costPrice: input.costPrice,
        weightSalePrice: input.weightSalePrice ?? null,
        weightCostPrice: input.weightCostPrice ?? null,
        canBeSoldByWeight: input.canBeSoldByWeight,
        stock: input.stock,
        lowStockThreshold: input.lowStockThreshold,
        category: input.category,
        categoryId: input.categoryId,
        description: input.description,
        image: input.image,
        supplierId: input.supplierId,
        userId: dbUser.id,
      },
      include: {
        supplier: true,
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

    await recordAuditLog({
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      userId: dbUser.id,
      details: `Product created: ${product.name} (Initial stock: ${product.stock})`,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Create product error details:", error);
    const message = error instanceof Error ? error.message : "Failed to create product";
    const details =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "UNKNOWN";
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}
