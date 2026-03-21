import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";
import { supplierSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

async function processGet(request: NextRequest) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const id = request.nextUrl.pathname.split("/").pop() || "";
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        userId: sessionResult.session.user.id,
      },
      include: {
        products: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processGet(request);
}

async function processDelete(request: NextRequest) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const id = request.nextUrl.pathname.split("/").pop() || "";
    const existing = await prisma.supplier.findFirst({
      where: { id, userId: sessionResult.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.supplier.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Supplier deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  return processDelete(request);
}

async function processPatch(request: NextRequest) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, supplierSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const id = request.nextUrl.pathname.split("/").pop() || "";
    const existing = await prisma.supplier.findFirst({
      where: { id, userId: sessionResult.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: bodyResult.data,
    });
    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
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
