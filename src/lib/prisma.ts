import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Lazy PrismaClient: only created when first accessed, NOT at module import time
// This prevents build-phase crashes when DATABASE_URL is a mock URL
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      const url = process.env.DATABASE_URL;

      // During build phase, return mock responses
      if (!url || url.includes("mock") || url.includes("dummy") || process.env.BUILD_MODE === "1") {
        if (prop === '$connect' || prop === '$disconnect') {
          return () => Promise.resolve();
        }
        return new Proxy({}, {
          get: () => (..._args: any[]) => Promise.resolve([])
        });
      }

      // Runtime: create real PrismaClient with pg driver adapter
      const adapter = new PrismaPg(url);
      globalForPrisma.prisma = new PrismaClient({ adapter });
    }

    return (globalForPrisma.prisma as any)[prop];
  }
});
