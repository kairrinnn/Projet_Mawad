import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Ignorer durant le build
  if (process.env.DATABASE_URL?.includes("mock") || process.env.BUILD_MODE === "1") {
    return NextResponse.json({ success: false });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json({ error: "PIN requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pinCode: true }
    });

    if (!user || !user.pinCode) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier si le PIN est encore en clair (pour la migration transparente)
    // bcrypt hashes commencent généralement par $2
    const isHashed = user.pinCode.startsWith("$2");
    let isValid = false;

    if (isHashed) {
      isValid = await bcrypt.compare(pin, user.pinCode);
    } else {
      // Migration transparente : si le PIN clair correspond, on le hache immédiatement
      if (pin === user.pinCode) {
        isValid = true;
        const hashedPin = await bcrypt.hash(pin, 10);
        await prisma.user.update({
          where: { id: session.user.id },
          data: { pinCode: hashedPin }
        });
      }
    }

    // Audit log
    await recordAuditLog({
      action: isValid ? "MANAGER_ACCESS_SUCCESS" : "MANAGER_ACCESS_FAILURE",
      userId: session.user.id,
      details: isValid ? "Accès réussi à l'espace gérant" : "Tentative d'accès avec code erroné",
      entityType: "ManagerAccess"
    });

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "PIN incorrect" }, { status: 403 });
    }
  } catch (error) {
    console.error("Erreur vérification PIN:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
