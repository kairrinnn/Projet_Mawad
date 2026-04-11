import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";
import { productUpdateSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

async function getSessionOrResponse() {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult;
  }

  return sessionResult;
}

async function processGet(request: NextRequest) {
  const sessionResult = await getSessionOrResponse();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const id = request.nextUrl.pathname.split("/").pop() || "";

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { barcode: id }],
        userId: sessionResult.session.user.id,
        isArchived: false,
      },
      include: {
        supplier: true,
        categoryRef: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processGet(request);
}

async function processDelete(request: NextRequest) {
  const sessionResult = await getSessionOrResponse();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const id = request.nextUrl.pathname.split("/").pop() || "";

  try {
    const product = await prisma.product.findFirst({
      where: { id, userId: sessionResult.session.user.id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const currentStock = product.stock;
      const unitCost = Number(product.costPrice);

      if (currentStock !== 0) {
        await tx.stockEntry.create({
          data: {
            productId: id,
            quantity: -currentStock,
            costPrice: unitCost,
            totalCost: -currentStock * unitCost,
            userId: sessionResult.session.user.id,
            date: new Date(),
          },
        });

        // PrismaPg transaction client does not currently expose stockMovement typing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).stockMovement.create({
          data: {
            productId: id,
            userId: sessionResult.session.user.id,
            type: "ADJUSTMENT",
            quantity: Math.abs(currentStock),
            oldStock: currentStock,
            newStock: 0,
            reason: "Product archived and remaining stock removed from history",
          },
        });
      }

      await tx.product.update({
        where: { id },
        data: {
          isArchived: true,
          barcode: null,
          stock: 0,
        },
      });
    });

    await recordAuditLog({
      action: "ARCHIVE_PRODUCT",
      entityType: "Product",
      entityId: id,
      userId: sessionResult.session.user.id,
      details: `Produit archivé : ${product.name} (stock retiré : ${product.stock})`,
    });

    return NextResponse.json({ message: "Product archived" });
  } catch (error) {
    console.error("Archive product error:", error);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processDelete(request);
}

async function processPatch(request: NextRequest) {
  const sessionResult = await getSessionOrResponse();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const id = request.nextUrl.pathname.split("/").pop() || "";
  const bodyResult = await parseJsonBody(request, productUpdateSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id, userId: sessionResult.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const input = bodyResult.data;
    if (input.barcode) {
      const duplicate = await prisma.product.findFirst({
        where: {
          barcode: input.barcode,
          userId: sessionResult.session.user.id,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "This barcode is already used by another product." },
          { status: 400 }
        );
      }
    }

    const updateData: Prisma.ProductUncheckedUpdateInput = {
      name: input.name,
      barcode: input.barcode,
      category: input.category,
      description: input.description,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      salePrice: input.salePrice,
      costPrice: input.costPrice,
      weightSalePrice: input.weightSalePrice,
      weightCostPrice: input.weightCostPrice,
      canBeSoldByWeight: input.canBeSoldByWeight,
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      image: input.image,
    };

    const oldStock = existing.stock;
    const newStock = input.stock ?? oldStock;
    const stockDiff = newStock - oldStock;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: updateData,
        include: { supplier: true },
      });

      if (stockDiff !== 0) {
        // PrismaPg transaction client does not currently expose stockMovement typing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).stockMovement.create({
          data: {
            productId: id,
            userId: sessionResult.session.user.id,
            type: "ADJUSTMENT",
            quantity: Math.abs(stockDiff),
            oldStock,
            newStock,
            reason: "Manual stock adjustment from product form",
          },
        });
      }

      if (stockDiff !== 0) {
        const costPrice = input.costPrice ?? Number(existing.costPrice);
        await tx.stockEntry.create({
          data: {
            productId: id,
            quantity: stockDiff,
            costPrice,
            totalCost: stockDiff * Number(costPrice),
            userId: sessionResult.session.user.id,
            date: new Date(),
          },
        });
      }

      return product;
    });

    await recordAuditLog({
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: id,
      userId: sessionResult.session.user.id,
      details: `Produit modifié : ${result.name}${stockDiff !== 0 ? ` (ajustement stock : ${stockDiff > 0 ? "+" : ""}${stockDiff})` : ""}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processPatch(request);
}

export async function generateStaticParams() {
  return [];
}
