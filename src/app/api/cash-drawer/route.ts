import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireRole } from "@/lib/server/auth";
import { getBusinessPeriodBounds } from "@/lib/server/business-time";
import { parseJsonBody } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const cashDrawerSchema = z.object({
  startingCash: z.coerce.number().finite().min(0).max(1_000_000),
});

const closeDrawerSchema = z.object({
  closingCash: z.coerce.number().finite().min(0).max(1_000_000),
  expectedCash: z.coerce.number().finite().min(0).max(1_000_000),
  startingCash: z.coerce.number().finite().min(0).max(1_000_000).optional().default(500),
  notes: z.string().trim().max(500).optional().nullable(),
});

function getTodayStart() {
  return getBusinessPeriodBounds(new Date()).startOfDay;
}

export async function GET() {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const userId = sessionResult.session.user.id;
    const todayStart = getTodayStart();

    const cashDrawer = await prisma.cashDrawer.findUnique({
      where: { userId_date: { userId, date: todayStart } },
    });

    if (cashDrawer) {
      return NextResponse.json({ ...cashDrawer, carriedOver: false });
    }

    // Pas encore de caisse aujourd'hui — chercher la plus récente pour carry-over
    const prevDrawer = await prisma.cashDrawer.findFirst({
      where: { userId, date: { lt: todayStart } },
      orderBy: { date: "desc" },
    });

    // Si clôturée → reprendre le montant compté ; sinon → reprendre le fond de départ
    const suggestedFund = prevDrawer
      ? prevDrawer.closedAt
        ? Number(prevDrawer.closingCash)
        : Number(prevDrawer.startingCash)
      : null;

    return NextResponse.json({
      startingCash: suggestedFund ?? 500,
      expectedCash: suggestedFund ?? 500,
      closingCash: 0,
      variance: 0,
      closedAt: null,
      notes: null,
      carriedOver: suggestedFund !== null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch cash drawer" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, cashDrawerSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const date = getTodayStart();

  try {
    const cashDrawer = await prisma.cashDrawer.upsert({
      where: {
        userId_date: {
          userId: sessionResult.session.user.id,
          date,
        },
      },
      update: {
        startingCash: bodyResult.data.startingCash,
        expectedCash: bodyResult.data.startingCash,
        closedAt: null,
        closingCash: null,
        variance: null,
        notes: null,
      },
      create: {
        userId: sessionResult.session.user.id,
        date,
        startingCash: bodyResult.data.startingCash,
        expectedCash: bodyResult.data.startingCash,
      },
    });

    await recordAuditLog({
      action: "SET_CASH_DRAWER",
      entityType: "CashDrawer",
      entityId: cashDrawer.id,
      userId: sessionResult.session.user.id,
      details: `Fond de caisse ouvert : ${bodyResult.data.startingCash} DH`,
    });

    return NextResponse.json(cashDrawer);
  } catch {
    return NextResponse.json({ error: "Failed to update cash drawer" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, closeDrawerSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const date = getTodayStart();

  try {
    const existing = await prisma.cashDrawer.findUnique({
      where: {
        userId_date: {
          userId: sessionResult.session.user.id,
          date,
        },
      },
    });

    if (existing?.closedAt) {
      return NextResponse.json(
        { error: "This cash drawer is already closed for today" },
        { status: 400 }
      );
    }

    const variance = bodyResult.data.closingCash - bodyResult.data.expectedCash;

    const cashDrawer = await prisma.cashDrawer.upsert({
      where: {
        userId_date: {
          userId: sessionResult.session.user.id,
          date,
        },
      },
      update: {
        expectedCash: bodyResult.data.expectedCash,
        closingCash: bodyResult.data.closingCash,
        variance,
        notes: bodyResult.data.notes || null,
        closedAt: new Date(),
      },
      create: {
        userId: sessionResult.session.user.id,
        date,
        startingCash: bodyResult.data.startingCash,
        expectedCash: bodyResult.data.expectedCash,
        closingCash: bodyResult.data.closingCash,
        variance,
        notes: bodyResult.data.notes || null,
        closedAt: new Date(),
      },
    });

    await recordAuditLog({
      action: "CLOSE_CASH_DRAWER",
      entityType: "CashDrawer",
      entityId: cashDrawer.id,
      userId: sessionResult.session.user.id,
      details: `Caisse clôturée — Attendu : ${bodyResult.data.expectedCash} DH, Compté : ${bodyResult.data.closingCash} DH, Écart : ${variance} DH`,
    });

    return NextResponse.json(cashDrawer);
  } catch {
    return NextResponse.json({ error: "Failed to close cash drawer" }, { status: 500 });
  }
}
