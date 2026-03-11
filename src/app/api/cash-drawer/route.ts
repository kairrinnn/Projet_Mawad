import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const cashDrawer = await prisma.cashDrawer.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    return NextResponse.json(cashDrawer || { startingCash: 500 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cash drawer" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const { startingCash } = await req.json();
    
    const cashDrawer = await prisma.cashDrawer.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: { startingCash: Number(startingCash) },
      create: {
        userId,
        date: today,
        startingCash: Number(startingCash),
      },
    });

    return NextResponse.json(cashDrawer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update cash drawer" }, { status: 500 });
  }
}
