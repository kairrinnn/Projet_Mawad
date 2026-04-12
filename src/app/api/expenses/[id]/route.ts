import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";

const EXPENSE_TYPE_VALUES = ["Daily", "Salary", "Utility", "Rent", "Internet", "Stock", "Withdrawal"] as const;

const expenseUpdateSchema = z.object({
  type: z.enum(EXPENSE_TYPE_VALUES),
  amount: z.coerce.number().finite().positive().max(1_000_000),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date().optional(),
  paidInCash: z.boolean().optional().default(false),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, expenseUpdateSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const { id } = await params;

  try {
    const expense = await prisma.expense.update({
      where: { id, userId: sessionResult.session.user.id },
      data: {
        type: bodyResult.data.type,
        amount: bodyResult.data.amount,
        description: bodyResult.data.description || null,
        date: bodyResult.data.date,
        paidInCash: bodyResult.data.paidInCash ?? false,
      },
    });

    await recordAuditLog({
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      userId: sessionResult.session.user.id,
      details: `Dépense modifiée : ${expense.type} — ${expense.amount} DH`,
    });

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const { id } = await params;

  try {
    const existing = await prisma.expense.findUnique({
      where: { id, userId: sessionResult.session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id, userId: sessionResult.session.user.id },
    });

    await recordAuditLog({
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: id,
      userId: sessionResult.session.user.id,
      details: `Dépense supprimée : ${existing.type} — ${existing.amount} DH`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
