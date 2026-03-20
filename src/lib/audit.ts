import { prisma } from "./prisma";

/**
 * Enregistre une action dans les logs d'audit.
 * 
 * @param action - Type d'action (ex: CREATE_SALE, UPDATE_PRODUCT, MANAGER_ACCESS)
 * @param entityType - Type d'entité concernée (ex: Sale, Product, Expense)
 * @param entityId - ID de l'entité concernée
 * @param details - Détails additionnels (format texte ou JSON stringifié)
 * @param userId - ID de l'utilisateur ayant effectué l'action
 */
export async function recordAuditLog({
  action,
  entityType,
  entityId,
  details,
  userId,
}: {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  userId?: string;
}) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details,
        userId,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    // On ne bloque pas l'exécution principale si le log échoue
  }
}
