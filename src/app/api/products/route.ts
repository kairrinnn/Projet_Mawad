import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
    
    // Si recherche par code-barres directe
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

    // Filtrage par userId obligatoire et non-archivé
    const whereClause: any = { 
      userId: session.user.id,
      isArchived: false
    };
    if (supplierId) whereClause.supplierId = supplierId;

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        supplier: true,
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
    // Vérifier si l'utilisateur existe en base par ID ou Email (auto-sync robuste)
    const normalizedEmail = session.user.email?.toLowerCase().trim();
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          normalizedEmail ? { email: { equals: normalizedEmail, mode: 'insensitive' } } : {}
        ].filter(Boolean) as any
      }
    });

    if (!dbUser && session.user.email) {
      // Creation si vraiment aucun match
      dbUser = await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name,
          email: normalizedEmail,
          image: session.user.image,
        }
      });
    } else if (dbUser && normalizedEmail && dbUser.email !== normalizedEmail) {
      // Mise à jour si l'email a changé ou pour normaliser
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
    const { name, barcode, salePrice, costPrice, stock, category, description, supplierId, image } = json;

    if (!name || !salePrice || !costPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Vérifier si le code-barres existe déjà POUR CET UTILISATEUR
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
        stock: parseInt(stock) || 0,
        category,
        description,
        image,
        supplierId: supplierId === "none" ? null : supplierId,
        userId: dbUser.id,
      },
      include: {
        supplier: true,
      }
    });

    // Log initial stock if > 0
    if (product.stock > 0) {
      await prisma.stockEntry.create({
        data: {
          productId: product.id,
          quantity: product.stock,
          costPrice: product.costPrice,
          totalCost: product.stock * product.costPrice,
          userId: dbUser.id,
          date: new Date()
        }
      });
    }
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Create product error details:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to create product",
      details: error.code || "UNKNOWN"
    }, { status: 500 });
  }
}
