import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: 'file:prisma/dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const result = await prisma.product.updateMany({
    where: {
      isArchived: true,
      barcode: {
        not: null
      }
    },
    data: {
      barcode: null
    }
  })
  console.log(`Cleaned up ${result.count} archived products barcodes.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
