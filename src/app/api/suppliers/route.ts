import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";
import { supplierSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { userId: sessionResult.session.user.id },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Fetch suppliers error:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
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

  const bodyResult = await parseJsonBody(request, supplierSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionResult.session.user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: bodyResult.data.name,
        contact: bodyResult.data.contact,
        userId: sessionResult.session.user.id,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
