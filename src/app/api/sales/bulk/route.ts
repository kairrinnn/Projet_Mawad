import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit";

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
      const product = productMap.get(item.productId)! as any;
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }
    }

    // 3. Process Transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdSales = [];

      for (const item of items) {
        const product = productMap.get(item.productId)! as any;
        const quantity = Number(item.quantity);
        const discount = Number(item.discount || 0);
        const soldByWeight = Boolean(item.soldByWeight);

        // Determine prices based on mode
        const salePrice = soldByWeight ? (product.weightSalePrice || product.salePrice) : product.salePrice;
        const costPrice = soldByWeight ? (product.weightCostPrice || product.costPrice) : product.costPrice;

        const totalRevenue = (salePrice * quantity) - discount;
        const totalCost = costPrice * quantity;
        const profit = totalRevenue - totalCost;

        const sale = await tx.sale.create({
          data: {
            productId: item.productId,
            userId: session.user.id,
            quantity,
            salePrice,
            costPrice,
            totalPrice: totalRevenue,
            discount,
            profit,
            soldByWeight
          }
        });

        await tx.product.update({
          where: { id: item.productId, userId: session.user.id },
          data: { stock: { decrement: quantity } }
        });

        // 4. Log movement
        await (tx as any).stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.user.id,
            type: "OUT",
            quantity,
            oldStock: product.stock,
            newStock: product.stock - quantity,
            reason: `Vente en lot #${sale.id.slice(-6)}`
          }
        });

        createdSales.push(sale);
      }

      return createdSales;
    });

    // Audit log
    await recordAuditLog({
      action: "CREATE_BULK_SALE",
      entityType: "Sale",
      userId: session.user.id,
      details: `Vente en lot de ${items.length} articles pour un total de ${result.length} ventes créées`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Bulk sale error:", error);
    return NextResponse.json({ error: "Failed to process bulk sale", details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  return await processPost(request);
}
