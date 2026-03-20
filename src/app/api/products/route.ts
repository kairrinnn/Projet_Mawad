import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const barcode = searchParams.get("barcode");
    
    if (barcode) {
      const product = await prisma.product.findFirst({
        where: { 
          barcode: barcode.trim(),
          userId: session.user.id,
          isArchived: false
        },
        include: { supplier: true }
      });
      return NextResponse.json(product);
    }

    const whereClause: any = { 
      userId: session.user.id,
      isArchived: false
    };
    if (supplierId) whereClause.supplierId = supplierId;

    const products = await (prisma.product as any).findMany({
      where: whereClause,
      include: {
        supplier: true,
        categoryRef: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if ((process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1")) return NextResponse.json([]);

  await headers();

  let session; try { session = await auth(); } catch (e) { return NextResponse.json({ error: "Auth failed" }, { status: 500 }); }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const normalizedEmail = session.user.email?.toLowerCase().trim();
    const orConditions: any[] = [{ id: session.user.id }];
    if (normalizedEmail) {
      orConditions.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
    }

    let dbUser = await prisma.user.findFirst({
      where: { OR: orConditions }
    });

    if (!dbUser && session.user.email) {
      dbUser = await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name,
          email: normalizedEmail,
          image: session.user.image,
        }
      });
    } else if (dbUser && normalizedEmail && dbUser.email !== normalizedEmail) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { 
          name: session.user.name,
          email: normalizedEmail,
          image: session.user.image 
        }
      });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "Profil utilisateur introuvable. Veuillez vous déconnecter et vous reconnecter." }, { status: 401 });
    }

    const json = await request.json();
    const { 
      name, barcode, salePrice, costPrice, stock, category, categoryId,
      description, supplierId, image, canBeSoldByWeight, 
      weightSalePrice, weightCostPrice 
    } = json;

    if (!name || !salePrice || !costPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (barcode && barcode.trim() !== "") {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          barcode: barcode.trim(),
          userId: dbUser.id
        }
      });

      if (existingProduct) {
        return NextResponse.json({ error: "Ce code-barres est déjà utilisé dans votre inventaire." }, { status: 400 });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        barcode: barcode && barcode.trim() !== "" ? barcode : null,
        salePrice: parseFloat(salePrice),
        costPrice: parseFloat(costPrice),
        weightSalePrice: weightSalePrice ? parseFloat(weightSalePrice) : null,
        weightCostPrice: weightCostPrice ? parseFloat(weightCostPrice) : null,
        canBeSoldByWeight: Boolean(canBeSoldByWeight),
        stock: parseFloat(stock) || 0,
        lowStockThreshold: parseFloat(json.lowStockThreshold) || 5,
        category,
        categoryId: categoryId === "none" ? null : categoryId,
        description,
        image,
        supplierId: supplierId === "none" ? null : supplierId,
        userId: dbUser.id,
      },
      include: {
        supplier: true,
      }
    });

    if (product.stock > 0) {
      await prisma.stockEntry.create({
        data: {
          productId: product.id,
          quantity: product.stock,
          costPrice: product.costPrice,
          totalCost: product.stock * Number(product.costPrice),
          userId: dbUser.id,
          date: new Date()
        }
      });
    }

    // Audit log
    await recordAuditLog({
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      userId: dbUser.id,
      details: `Création du produit: ${product.name} (Stock initial: ${product.stock})`,
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Create product error details:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to create product",
      details: error.code || "UNKNOWN"
    }, { status: 500 });
  }
}
