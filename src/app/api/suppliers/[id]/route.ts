import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

async function processGet(request: NextRequest) {
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.pathname.split('/').pop() || "";
    const supplier = await prisma.supplier.findFirst({
      where: { 
        id: id,
        userId: session.user.id
      },
      include: {
        products: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  return await processGet(request);
}

async function processDelete(request: NextRequest) {
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.pathname.split('/').pop() || "";
    
    // Vérification de propriété
    const existing = await prisma.supplier.findFirst({
      where: { id: id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Fournisseur non trouvé ou non autorisé" }, { status: 404 });
    }

    await prisma.supplier.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: "Supplier deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  return await processDelete(request);
}

async function processPatch(request: NextRequest) {
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.pathname.split('/').pop() || "";
    const json = await request.json();

    // Vérification de propriété
    const existing = await prisma.supplier.findFirst({
      where: { id: id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Fournisseur non trouvé ou non autorisé" }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id: id },
      data: json,
    });
    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  return await processPatch(request);
}

export async function generateStaticParams() {
  return [];
}
