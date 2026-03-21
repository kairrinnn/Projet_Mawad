import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

type SessionResult =
  | { session: Session; response?: never }
  | { session?: never; response: NextResponse };

export function isBuildPhase() {
  return process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1";
}

export async function requireSession(): Promise<SessionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    return { session };
  } catch {
    return {
      response: NextResponse.json({ error: "Auth failed" }, { status: 500 }),
    };
  }
}

export async function requireRole(role: UserRole): Promise<SessionResult> {
  const result = await requireSession();
  if ("response" in result) {
    return result;
  }

  if (result.session.user.role !== role) {
    return {
      response: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    };
  }

  return result;
}
