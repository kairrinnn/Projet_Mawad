import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Seul un gérant (ou l'utilisateur lui-même via la session) peut voir les logs
  // Pour l'instant, on filtre par userId de la session
  try {
    const logs = await (prisma as any).auditLog.findMany({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200, // Limite aux 200 derniers logs pour la performance
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
