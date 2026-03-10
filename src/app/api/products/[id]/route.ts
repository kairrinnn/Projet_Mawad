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
        id: p.id,
        userId: session.user.id
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
      data: { isArchived: true }
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

    const product = await prisma.product.update({
      where: { id: p.id },
      data: json,
      include: { supplier: true }
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
