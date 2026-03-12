import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

async function processPost(request: Request) {
  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { items } = json; // Array of { productId, quantity, discount }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // 1. Fetch all unique products involved
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: session.user.id,
        isArchived: false
      }
    });

    // 2. Map and validate
    const productMap = new Map(products.map(p => [p.id, p]));
    
    // Check if any product is missing
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }
    }

    // 3. Process Transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdSales = [];

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const quantity = Number(item.quantity);
        const discount = Number(item.discount || 0);

        const totalRevenue = (product.salePrice * quantity) - discount;
        const totalCost = product.costPrice * quantity;
        const profit = totalRevenue - totalCost;

        const sale = await tx.sale.create({
          data: {
            productId: item.productId,
            userId: session.user.id,
            quantity,
            salePrice: product.salePrice,
            costPrice: product.costPrice,
            discount,
            profit
          }
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: quantity } }
        });

        createdSales.push(sale);
      }

      return createdSales;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Bulk sale error:", error);
    return NextResponse.json({ error: "Failed to process bulk sale", details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  return await processPost(request);
}
