import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  // During build phase with mock DB, create a client that won't connect
  if (!url || url.includes('mock') || url.includes('dummy') || process.env.BUILD_MODE === '1') {
    return new PrismaClient();
  }

  // Runtime: create connection pool then pass to PrismaPg adapter
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Singleton pattern: reuse the same client across hot-reloads in development
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
