import { config } from "dotenv";
import { PrismaClient } from "./generated/client";
import pg from "pg";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildSearchIndex } from "../src/lib/search/tokens";

config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in your environment");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Backfilling searchTokens with new transliteration...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name_en: true,
      name_ru: true,
      name_am: true,
      description_en: true,
      description_ru: true,
      description_am: true,
      brand: true,
      productType: true,
      keywords: true,
      sku: true,
    },
  });

  console.log(`Found ${products.length} products to update`);

  let updated = 0;
  for (const product of products) {
    const { searchTokens, searchText } = buildSearchIndex(product);
    await prisma.product.update({
      where: { id: product.id },
      data: { searchTokens, searchText },
    });
    updated++;
    if (updated % 10 === 0) {
      console.log(`✓ Updated ${updated}/${products.length} products`);
    }
  }

  console.log(
    `✅ Backfill complete! Updated ${updated} products with new searchTokens`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Backfill failed:", error);
  process.exit(1);
});
