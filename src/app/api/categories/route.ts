import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server/auth";
import { categorySchema } from "@/lib/server/schemas";
import { badRequest, parseJsonBody } from "@/lib/server/validation";

export async function GET() {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const categories = await prisma.category.findMany({
      where: { userId: sessionResult.session.user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, categorySchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const category = await prisma.category.upsert({
      where: {
        name_userId: {
          name: bodyResult.data.name,
          userId: sessionResult.session.user.id,
        },
      },
      update: {},
      create: {
        name: bodyResult.data.name,
        userId: sessionResult.session.user.id,
      },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return badRequest("ID is required");
    }

    await prisma.category.delete({
      where: { id, userId: sessionResult.session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
