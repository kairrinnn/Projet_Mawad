import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = 'force-dynamic';

async function processGet(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop() || "";
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const product = await (prisma.product as any).findFirst({
      where: { 
        OR: [
          { id: id },
          { barcode: id }
        ],
        userId: session.user.id,
        isArchived: false
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);
  await headers();
  return await processGet(request);
}

async function processDelete(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop() || "";
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const product = await prisma.product.findFirst({
      where: { id: id, userId: session.user.id }
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé ou non autorisé" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: id },
      data: {
        isArchived: true,
        barcode: null
      }
    });

    // Audit log
    await recordAuditLog({
      action: "ARCHIVE_PRODUCT",
      entityType: "Product",
      entityId: id,
      userId: session.user.id,
      details: `Archivage du produit: ${product.name}`,
    });

    return NextResponse.json({ message: "Product archived" });
  } catch (error) {
    console.error("Archive product error:", error);
    return NextResponse.json({ error: "Erreur lors de l'archivage du produit." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);
  await headers();
  return await processDelete(request);
}

async function processPatch(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop() || "";
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const existing = await prisma.product.findFirst({
      where: { id: id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit non trouvé ou non autorisé" }, { status: 404 });
    }

    if (json.salePrice !== undefined) json.salePrice = Number(json.salePrice);
    if (json.costPrice !== undefined) json.costPrice = Number(json.costPrice);
    if (json.weightSalePrice !== undefined) json.weightSalePrice = json.weightSalePrice === "" ? null : Number(json.weightSalePrice);
    if (json.weightCostPrice !== undefined) json.weightCostPrice = json.weightCostPrice === "" ? null : Number(json.weightCostPrice);
    if (json.stock !== undefined) json.stock = Number(json.stock);
    
    if (json.supplierId === "none") json.supplierId = null;

    if (json.barcode && json.barcode.trim() !== "") {
      const barcodeClean = json.barcode.trim();
      const duplicate = await prisma.product.findFirst({
        where: { 
          barcode: barcodeClean,
          userId: session.user.id,
          NOT: { id: id }
        }
      });
      if (duplicate) {
        return NextResponse.json({ error: "Ce code-barres est déjà utilisé par un autre produit." }, { status: 400 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { // Prisma.ProductUncheckedUpdateInput but tx adapter omits some fields
      name: json.name,
      barcode: json.barcode && json.barcode.trim() !== "" ? json.barcode : null,
      category: json.category,
      description: json.description,
      stock: parseFloat(json.stock),
      lowStockThreshold: parseFloat(json.lowStockThreshold) || 5,
      salePrice: json.salePrice,
      costPrice: json.costPrice,
      weightSalePrice: json.weightSalePrice,
      weightCostPrice: json.weightCostPrice,
      canBeSoldByWeight: json.canBeSoldByWeight,
      supplierId: json.supplierId,
      categoryId: json.categoryId === "none" ? null : json.categoryId,
      image: json.image,
    };

    const oldStock = existing.stock;
    const newStock = (json.stock !== undefined) ? Number(json.stock) : oldStock;
    const stockDiff = newStock - oldStock;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: id },
        data: updateData,
        include: { supplier: true }
      });

      if (stockDiff !== 0) {
        // Note: stockMovement exists in schema but the Prisma transaction client
        // doesn't expose it when using the PrismaPg adapter — safe `any` cast here
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).stockMovement.create({
          data: {
            productId: id,
            userId: session.user.id,
            type: "ADJUSTMENT",
            quantity: Math.abs(stockDiff),
            oldStock: oldStock,
            newStock: newStock,
            reason: json.reason || "Ajustement manuel depuis la fiche produit"
          }
        });
      }

      if (stockDiff > 0) {
        await tx.stockEntry.create({
          data: {
            productId: id,
            quantity: stockDiff,
            costPrice: json.costPrice ?? existing.costPrice,
            totalCost: stockDiff * Number(json.costPrice ?? existing.costPrice),
            userId: session.user.id,
            date: new Date()
          }
        });
      }

      return product;
    });

    // Audit log
    await recordAuditLog({
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: id,
      userId: session.user.id,
      details: `Mise à jour du produit: ${result.name} (Diff stock: ${stockDiff})`,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);
  await headers();
  return await processPatch(request);
}

export async function generateStaticParams() {
  return [];
}
