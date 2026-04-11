import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";

const expenseSchema = z.object({
  type: z.string().trim().min(1).max(64),
  amount: z.coerce.number().finite().positive().max(1_000_000),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date().optional(),
});

export async function GET() {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: sessionResult.session.user.id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, expenseSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        type: bodyResult.data.type,
        amount: bodyResult.data.amount,
        description: bodyResult.data.description || null,
        date: bodyResult.data.date ?? new Date(),
        userId: sessionResult.session.user.id,
      },
    });

    await recordAuditLog({
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      userId: sessionResult.session.user.id,
      details: `Dépense créée : ${expense.type} — ${expense.amount} DH`,
    });

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
