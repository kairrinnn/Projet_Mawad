import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "MANAGER") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
