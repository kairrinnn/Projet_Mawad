import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireSession } from "@/lib/server/auth";
import { consumeRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { parseJsonBody } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const verifyPinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "PIN must contain between 4 and 10 digits"),
});

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json({ success: false });
  }

  const sessionResult = await requireSession();
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const bodyResult = await parseJsonBody(request, verifyPinSchema);
  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limiterKey = `verify-pin:${sessionResult.session.user.id}:${ip}`;
  const rateLimit = consumeRateLimit(limiterKey, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many attempts. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionResult.session.user.id },
      select: { pinCode: true },
    });

    if (!user?.pinCode) {
      return NextResponse.json({ error: "Manager PIN is not configured" }, { status: 404 });
    }

    const pin = bodyResult.data.pin;
    const isHashed = user.pinCode.startsWith("$2");
    let isValid = false;

    if (isHashed) {
      isValid = await bcrypt.compare(pin, user.pinCode);
    } else if (pin === user.pinCode) {
      isValid = true;
      const hashedPin = await bcrypt.hash(pin, 10);
      await prisma.user.update({
        where: { id: sessionResult.session.user.id },
        data: { pinCode: hashedPin },
      });
    }

    await recordAuditLog({
      action: isValid ? "MANAGER_ACCESS_SUCCESS" : "MANAGER_ACCESS_FAILURE",
      userId: sessionResult.session.user.id,
      details: isValid
        ? "Accès gérant autorisé"
        : "Accès gérant refusé — code incorrect",
      entityType: "ManagerAccess",
    });

    if (!isValid) {
      return NextResponse.json({ success: false, error: "PIN incorrect" }, { status: 403 });
    }

    resetRateLimit(limiterKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify PIN error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
