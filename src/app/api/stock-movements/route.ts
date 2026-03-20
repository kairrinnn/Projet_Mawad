import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const limit = searchParams.get("limit") || "50";

    if (!productId) {
      return NextResponse.json({ error: "ProductId required" }, { status: 400 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { 
        userId: session.user.id,
        productId 
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Fetch stock movements error:", error);
    return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 });
  }
}
