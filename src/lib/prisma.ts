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
  // SSL is required for Supabase (both pooler and direct connections)
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Singleton pattern: reuse the same client across hot-reloads in development
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
