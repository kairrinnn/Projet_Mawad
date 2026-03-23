const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function readEnvValue(name) {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(new RegExp(`^${name}=\"([^\"]+)\"`, "m"));
  return match ? match[1] : null;
}

async function main() {
  const rawDatabaseUrl = readEnvValue("DATABASE_URL");
  if (!rawDatabaseUrl) {
    throw new Error("DATABASE_URL not found in .env");
  }

  const databaseUrl = rawDatabaseUrl.replace("?pgbouncer=true", "");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 15000,
    statement_timeout: 15000,
  });

  const statements = [
    "SET lock_timeout = '10s'",
    `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');
  END IF;
END
$$;`,
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT \'CASH\'',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "cashReceived" DECIMAL(12,2)',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "changeGiven" DECIMAL(12,2)',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "refundReason" TEXT',
    'ALTER TABLE "CashDrawer" ADD COLUMN IF NOT EXISTS "expectedCash" DECIMAL(12,2)',
    'ALTER TABLE "CashDrawer" ADD COLUMN IF NOT EXISTS "closingCash" DECIMAL(12,2)',
    'ALTER TABLE "CashDrawer" ADD COLUMN IF NOT EXISTS "variance" DECIMAL(12,2)',
    'ALTER TABLE "CashDrawer" ADD COLUMN IF NOT EXISTS "notes" TEXT',
    'ALTER TABLE "CashDrawer" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3)',
    'UPDATE "CashDrawer" SET "expectedCash" = COALESCE("expectedCash", "startingCash"), "variance" = COALESCE("variance", 0) WHERE "expectedCash" IS NULL OR "variance" IS NULL',
  ];

  await client.connect();
  try {
    for (const [index, statement] of statements.entries()) {
      console.log(`running_${index + 1}`);
      await client.query(statement);
    }

    const verification = await client.query(`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Sale' AND column_name = 'ticketNumber'
        ) AS sale_ticket,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Sale' AND column_name = 'paymentMethod'
        ) AS sale_payment,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'CashDrawer' AND column_name = 'closedAt'
        ) AS cash_closed
    `);

    console.log(JSON.stringify(verification.rows[0]));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
