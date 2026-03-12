import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

// Detect build phase: DATABASE_URL contains "mock" or BUILD_MODE is set
const isBuild = !process.env.DATABASE_URL || 
               process.env.DATABASE_URL.includes("mock") || 
               process.env.DATABASE_URL.includes("dummy") || 
               process.env.BUILD_MODE === "1";

if (isBuild) {
  // Proxy mock for build phase — returns empty arrays for all DB calls
  prismaInstance = new Proxy({}, {
    get: function(_target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      // Return a model-like proxy with all Prisma methods
      return new Proxy({}, {
        get: () => (..._args: any[]) => Promise.resolve([])
      });
    }
  }) as unknown as PrismaClient;
} else {
  // Runtime on Vercel: explicitly pass DATABASE_URL since Prisma v7 
  // removed url from schema.prisma
  prismaInstance = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
}

export const prisma = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
