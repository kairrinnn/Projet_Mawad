require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Sales totalPrice migration (Raw SQL with dotenv)...");
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "Sale" SET "totalPrice" = ("salePrice" * "quantity") - "discount"`
    );
    console.log(`Successfully updated ${result} sales records.`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
