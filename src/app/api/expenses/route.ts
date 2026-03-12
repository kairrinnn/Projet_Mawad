import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, amount, description, date } = await request.json();
    const expense = await prisma.expense.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        userId: session.user.id
      }
    });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
