import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, amount, description, date } = await request.json();
    const expense = await prisma.expense.update({
      where: { id: params.id, userId: session.user.id },
      data: {
        type,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : undefined,
      }
    });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.expense.delete({
      where: { id: params.id, userId: session.user.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
