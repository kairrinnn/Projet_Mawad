import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const entries = await prisma.stockEntry.findMany({
      where: { userId: session.user.id },
      include: {
        product: true
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Fetch stock entries error:", error);
    return NextResponse.json({ error: "Failed to fetch stock entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, quantity, costPrice } = await request.json();
    
    if (!productId || quantity === undefined || costPrice === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.stockEntry.create({
      data: {
        productId,
        quantity: parseInt(quantity),
        costPrice: parseFloat(costPrice),
        totalCost: parseInt(quantity) * parseFloat(costPrice),
        userId: session.user.id,
        date: new Date()
      },
      include: {
        product: true
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Create stock entry error:", error);
    return NextResponse.json({ error: "Failed to create stock entry" }, { status: 500 });
  }
}
