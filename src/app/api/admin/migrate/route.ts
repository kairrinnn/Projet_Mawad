import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sales = await prisma.sale.findMany();
    let updated = 0;

    for (const sale of sales) {
      const totalPrice = (sale.salePrice * sale.quantity) - (sale.discount || 0);
      await prisma.sale.update({
        where: { id: sale.id },
        data: { totalPrice: parseFloat(totalPrice.toFixed(2)) }
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
