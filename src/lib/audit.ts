import { prisma } from "./prisma";

export interface AuditLogInput {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  userId?: string;
}

/**
 * Enregistre une action dans les logs d'audit.
 * Ne bloque jamais l'exécution principale si l'enregistrement échoue.
 */
export async function recordAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
        userId: input.userId,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
