import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.BUILD_MODE === "1") return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
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
  if (process.env.BUILD_MODE === "1") return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    
    // Vérification de propriété avant suppression
    const product = await prisma.product.findFirst({
      where: { id: p.id, userId: session.user.id }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: p.id },
    });
    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.BUILD_MODE === "1") return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
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
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
