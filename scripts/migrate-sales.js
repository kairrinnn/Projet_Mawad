const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Sales totalPrice migration (JS)...");
  
  try {
    const sales = await prisma.sale.findMany();
    console.log(`Found ${sales.length} sales to update.`);

    let updatedCount = 0;
    for (const sale of sales) {
      const totalPrice = (sale.salePrice * sale.quantity) - (sale.discount || 0);
      
      await prisma.sale.update({
        where: { id: sale.id },
        data: { totalPrice: parseFloat(totalPrice.toFixed(2)) }
      });
      updatedCount++;
      if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount}/${sales.length}...`);
    }

    console.log(`Migration completed successfully. ${updatedCount} sales updated.`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
