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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current product stock
      const product = await tx.product.findUnique({
        where: { id: productId, userId: session.user.id },
        select: { stock: true }
      });
      if (!product) throw new Error("Product not found");

      // 2. Create the entry
      const entry = await tx.stockEntry.create({
        data: {
          productId,
          quantity: Number(quantity),
          costPrice: parseFloat(costPrice),
          totalCost: Number(quantity) * parseFloat(costPrice),
          userId: session.user.id,
          date: new Date()
        },
        include: { product: true }
      });

      // 3. Update product stock
      await tx.product.update({
        where: { id: productId, userId: session.user.id },
        data: { stock: product.stock + Number(quantity) }
      });

      // 4. Log movement
      await (tx as any).stockMovement.create({
        data: {
          productId,
          userId: session.user.id,
          type: "IN",
          quantity: Number(quantity),
          oldStock: product.stock,
          newStock: product.stock + Number(quantity),
          reason: `Approvisionnement #${entry.id.slice(-6)}`
        }
      });

      return entry;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create stock entry error:", error);
    return NextResponse.json({ error: "Failed to create stock entry" }, { status: 500 });
  }
}
