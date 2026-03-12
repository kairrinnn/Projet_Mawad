import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

// Provide a completely isolated mock for Next.js static evaluation workers
// We detect the build phase by checking if DATABASE_URL is missing, mock, or if BUILD_MODE is set.
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "mock" || process.env.DATABASE_URL.includes("dummy") || process.env.BUILD_MODE === "1") {
  prismaInstance = new Proxy({}, {
    get: function(target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      return new Proxy({}, {
        get: () => () => Promise.resolve([]) // Mock all DB calls
      });
    }
  }) as unknown as PrismaClient;
} else {
  prismaInstance = new PrismaClient();
}

export const prisma = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
