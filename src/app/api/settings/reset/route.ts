import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { isBuildPhase, requireRole } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (isBuildPhase()) {
    return NextResponse.json({ reset: false, counts: {} });
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  const userId = sessionResult.session.user.id;

  try {
    const counts = await prisma.$transaction(async (tx) => {
      const auditLogs = await tx.auditLog.deleteMany({ where: { userId } });
      const sales = await tx.sale.deleteMany({ where: { userId } });
      const stockMovements = await tx.stockMovement.deleteMany({ where: { userId } });
      const stockEntries = await tx.stockEntry.deleteMany({ where: { userId } });
      const cashDrawers = await tx.cashDrawer.deleteMany({ where: { userId } });
      const expenses = await tx.expense.deleteMany({ where: { userId } });
      const products = await tx.product.deleteMany({ where: { userId } });
      const suppliers = await tx.supplier.deleteMany({ where: { userId } });
      const categories = await tx.category.deleteMany({ where: { userId } });

      return {
        auditLogs: auditLogs.count,
        sales: sales.count,
        stockMovements: stockMovements.count,
        stockEntries: stockEntries.count,
        cashDrawers: cashDrawers.count,
        expenses: expenses.count,
        products: products.count,
        suppliers: suppliers.count,
        categories: categories.count,
      };
    });

    await recordAuditLog({
      action: "RESET_ACCOUNT_DATA",
      entityType: "User",
      entityId: userId,
      userId,
      details: `Account data reset completed: ${JSON.stringify(counts)}`,
    });

    return NextResponse.json({ reset: true, counts });
  } catch (error) {
    console.error("Reset account data error:", error);
    return NextResponse.json({ error: "Failed to reset account data" }, { status: 500 });
  }
}
