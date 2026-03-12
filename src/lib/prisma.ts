import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Lazy PrismaClient: only created when first accessed, NOT at module import time
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

      // Runtime: create Pool then pass to PrismaPg adapter
      const pool = new pg.Pool({ connectionString: url });
      const adapter = new PrismaPg(pool);
      globalForPrisma.prisma = new PrismaClient({ adapter });
    }

    return (globalForPrisma.prisma as any)[prop];
  }
});
