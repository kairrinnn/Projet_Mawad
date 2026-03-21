import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isBuildPhase, requireRole } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const cashDrawerSchema = z.object({
  startingCash: z.coerce.number().finite().min(0).max(1_000_000),
});

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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
    const cashDrawer = await prisma.cashDrawer.findUnique({
      where: {
        userId_date: {
          userId: sessionResult.session.user.id,
          date: getTodayStart(),
        },
      },
    });

    return NextResponse.json(cashDrawer || { startingCash: 500 });
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

  try {
    const cashDrawer = await prisma.cashDrawer.upsert({
      where: {
        userId_date: {
          userId: sessionResult.session.user.id,
          date: getTodayStart(),
        },
      },
      update: { startingCash: bodyResult.data.startingCash },
      create: {
        userId: sessionResult.session.user.id,
        date: getTodayStart(),
        startingCash: bodyResult.data.startingCash,
      },
    });

    return NextResponse.json(cashDrawer);
  } catch {
    return NextResponse.json({ error: "Failed to update cash drawer" }, { status: 500 });
  }
}
