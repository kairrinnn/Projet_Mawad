import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    // On utilise findFirst car findUnique ne permet pas de filtrer par userId sur une clé id unique
    const product = await prisma.product.findFirst({
      where: { 
        OR: [
          { id: p.id },
          { barcode: p.id }
        ],
        userId: session.user.id,
        isArchived: false
      },
      include: {
        supplier: true,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    
    // On vérifie d'abord si le produit appartient à l'utilisateur
    const product = await prisma.product.findFirst({
      where: { id: p.id, userId: session.user.id }
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé ou non autorisé" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        isArchived: true,
        barcode: null // On libère le code-barres pour réutilisation
      }
    });
    return NextResponse.json({ message: "Product archived" });
  } catch (error) {
    console.error("Archive product error:", error);
    return NextResponse.json({ error: "Erreur lors de l'archivage du produit." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    const json = await request.json();
    console.log("PATCH Product Data received:", json);
    
    // Vérification de propriété
    const existing = await prisma.product.findFirst({
      where: { id: p.id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit non trouvé ou non autorisé" }, { status: 404 });
    }

    // Extraire les champs qui peuvent avoir besoin de conversion
    if (json.salePrice !== undefined) json.salePrice = Number(json.salePrice);
    if (json.costPrice !== undefined) json.costPrice = Number(json.costPrice);
    if (json.stock !== undefined) json.stock = Number(json.stock);
    
    // S'assurer que supplierId est null si "none"
    if (json.supplierId === "none") json.supplierId = null;

    // Vérifier si le nouveau code-barres existe déjà pour un AUTRE produit
    if (json.barcode && json.barcode.trim() !== "") {
      const barcodeClean = json.barcode.trim();
      const duplicate = await prisma.product.findFirst({
        where: { 
          barcode: barcodeClean,
          NOT: { id: p.id }
        }
      });

      if (duplicate) {
        return NextResponse.json({ error: "Ce code-barres est déjà utilisé par un autre produit." }, { status: 400 });
      }
    }

    const updateData: any = {
      name: json.name,
      barcode: json.barcode && json.barcode.trim() !== "" ? json.barcode : null,
      category: json.category,
      description: json.description,
      stock: json.stock,
      salePrice: json.salePrice,
      costPrice: json.costPrice,
      supplierId: json.supplierId,
      image: json.image,
    };

    const product = await prisma.product.update({
      where: { id: p.id },
      data: updateData,
      include: { supplier: true }
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
