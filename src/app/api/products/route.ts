import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Vérifier si l'utilisateur existe encore en base (suite au reset)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Profil utilisateur introuvable. Veuillez vous déconnecter et vous reconnecter." }, { status: 401 });
    }

    const json = await request.json();
    const { name, barcode, salePrice, costPrice, stock, category, description, supplierId, image } = json;

    if (!name || !salePrice || !costPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Vérifier si le code-barres existe déjà
    if (barcode && barcode.trim() !== "") {
      const existingProduct = await prisma.product.findUnique({
        where: { barcode: barcode.trim() }
      });

      if (existingProduct) {
        return NextResponse.json({ error: "Ce code-barres est déjà utilisé par un autre produit." }, { status: 400 });
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
        userId: session.user.id,
      },
      include: {
        supplier: true,
      }
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
