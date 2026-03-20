import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { type, amount, description, date } = await request.json();
    const expense = await prisma.expense.update({
      where: { id, userId: session.user.id },
      data: {
        type,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : undefined,
      }
    });

    // Audit log
    await recordAuditLog({
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      userId: session.user.id,
      details: `Mise à jour de charge: ${type} - ${amount} DH`,
    });

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.expense.findUnique({
      where: { id, userId: session.user.id }
    });

    if (existing) {
      await prisma.expense.delete({
        where: { id, userId: session.user.id }
      });

      // Audit log
      await recordAuditLog({
        action: "DELETE_EXPENSE",
        entityType: "Expense",
        entityId: id,
        userId: session.user.id,
        details: `Suppression de charge: ${existing.type} - ${existing.amount} DH`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
