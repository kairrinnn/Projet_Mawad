const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.hjqaoyqnavjvukmwqcpx:steinsgate666@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Start transaction
    await client.query('BEGIN');

    console.log('Migrating Product table...');
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "weightSalePrice" DOUBLE PRECISION');
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "weightCostPrice" DOUBLE PRECISION');
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "canBeSoldByWeight" BOOLEAN NOT NULL DEFAULT false');
    await client.query('ALTER TABLE "Product" ALTER COLUMN "stock" TYPE DOUBLE PRECISION');

    console.log('Migrating Sale table...');
    await client.query('ALTER TABLE "Sale" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION');
    await client.query('ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "soldByWeight" BOOLEAN NOT NULL DEFAULT false');

    console.log('Migrating StockEntry table...');
    await client.query('ALTER TABLE "StockEntry" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION');

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
