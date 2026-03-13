require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found in .env");
    return;
  }

  console.log("Connecting to database directly with pg...");
  const pool = new Pool({ connectionString: url });

  try {
    const client = await pool.connect();
    console.log("Connected. Running update...");
    
    const res = await client.query(
      `UPDATE "Sale" SET "totalPrice" = ("salePrice" * "quantity") - "discount"`
    );
    
    console.log(`Update successful. Records affected: ${res.rowCount}`);
    client.release();
  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await pool.end();
  }
}

main();
