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
    const supplier = await prisma.supplier.findFirst({
      where: { 
        id: p.id,
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
    
    const existing = await prisma.supplier.findFirst({
      where: { id: p.id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.supplier.delete({
      where: { id: p.id },
    });
    return NextResponse.json({ message: "Supplier deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
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

    const existing = await prisma.supplier.findFirst({
      where: { id: p.id, userId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id: p.id },
      data: json,
    });
    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}
