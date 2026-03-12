import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

// Provide a completely isolated mock for Next.js static evaluation workers
if (process.env.BUILD_MODE === "1" || process.env.npm_lifecycle_event === "build") {
  prismaInstance = new Proxy({}, {
    get: function(target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      return new Proxy({}, {
        get: () => () => Promise.resolve([]) // Mock all DB calls (findMany, create, etc.)
      });
    }
  }) as unknown as PrismaClient;
} else {
  prismaInstance = new PrismaClient();
}

export const prisma = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
