import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const limit = searchParams.get("limit");
    const recent = searchParams.get("recent");

    const whereClause: any = { userId: session.user.id };
    if (productId) whereClause.productId = productId;
    
    const take = limit ? parseInt(limit) : undefined;
    const orderBy = recent ? { createdAt: "desc" as const } : { createdAt: "desc" as const };

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        product: true,
      },
      orderBy,
      take,
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if ((process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { productId, quantity, discount = 0 } = json;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid product or quantity" }, { status: 400 });
    }

    // 1. Récupérer le produit (vérifier qu'il appartient à l'utilisateur)
    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        userId: session.user.id,
        isArchived: false
      }
    });

    if (!product) {
       return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }

    const salePrice = product.salePrice;
    const costPrice = product.costPrice;
    
    // La réduction est maintenant traitée comme un montant TOTAL sur la vente
    const totalRevenue = (salePrice * quantity) - discount;
    const totalCost = costPrice * quantity;
    const totalProfit = totalRevenue - totalCost;

    // 2. Transaction pour créer la vente et mettre à jour le stock
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          productId,
          userId: session.user.id,
          quantity: Number(quantity),
          salePrice: product.salePrice,
          costPrice: product.costPrice,
          discount: Number(discount),
          profit: totalProfit
        },
        include: { product: true }
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: product.stock - quantity }
      });

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Sale error:", error);
    return NextResponse.json({ error: "Failed to process sale" }, { status: 500 });
  }
}
