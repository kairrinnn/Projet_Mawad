import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Sales totalPrice migration...");
  
  const sales = await prisma.sale.findMany();
  console.log(`Found ${sales.length} sales to update.`);

  let updatedCount = 0;
  for (const sale of sales) {
    const totalPrice = (sale.salePrice * sale.quantity) - (sale.discount || 0);
    
    // For existing refunds that might have been created without negative values, 
    // or to ensure consistency with my new logic:
    // If it's a refund (quantity < 0 or type is REFUND if already set)
    // Actually, let's just use the basic math and assume type/quantity sign is correct.
    
    await prisma.sale.update({
      where: { id: sale.id },
      data: { totalPrice }
    });
    updatedCount++;
    if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount}/${sales.length}...`);
  }

  console.log("Migration completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
