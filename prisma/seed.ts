import { config } from "dotenv";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import pg from "pg";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";

import { buildTransliterations } from "../src/lib/search/transliterate";

config({ path: path.join(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in your environment");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instantiate the Client with the Adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Clean existing data
  console.log("🧹 Cleaning database...");

  await prisma.productDiscount.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shopContact.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.shopType.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.mallOwner.deleteMany();

  console.log("✅ Database cleaned");

  // 2. Seed Categories
  console.log("📚 Seeding categories...");

  const enData = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "prisma/data/categories/en.json"),
      "utf-8"
    )
  );
  const ruData = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "prisma/data/categories/ru.json"),
      "utf-8"
    )
  );
  const amData = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "prisma/data/categories/am.json"),
      "utf-8"
    )
  );

  for (const categoryKey in enData) {
    const enCategory = enData[categoryKey];
    const ruCategory = ruData[categoryKey];
    const amCategory = amData[categoryKey];

    await prisma.category.create({
      data: {
        key: categoryKey,
        name_en: enCategory.name,
        name_ru: ruCategory.name,
        name_am: amCategory?.name || enCategory.name,
        subcategories: {
          create: Object.keys(enCategory.subcategories).map(
            (subcategoryKey) => ({
              key: subcategoryKey,
              name_en: enCategory.subcategories[subcategoryKey],
              name_ru: ruCategory.subcategories[subcategoryKey],
              name_am:
                amCategory?.subcategories?.[subcategoryKey] ||
                enCategory.subcategories[subcategoryKey],
            })
          ),
        },
      },
    });
  }

  console.log("✅ Categories seeded");

  // 3a. Seed category tags (controlled vocabulary)
  console.log("🏷️  Seeding category tags...");

  const tagsByCategoryKey: Record<
    string,
    { key: string; name_en: string; name_ru: string; name_am: string | null }[]
  > = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "prisma/seeds/category-tags.json"),
      "utf-8"
    )
  );

  let tagInserted = 0;
  let tagSkipped = 0;

  for (const [categoryKey, tags] of Object.entries(tagsByCategoryKey)) {
    const category = await prisma.category.findUnique({
      where: { key: categoryKey },
      select: { id: true },
    });
    if (!category) {
      console.warn(`⚠️  Skipping tags for unknown category "${categoryKey}"`);
      continue;
    }
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const existing = await prisma.tag.findUnique({
        where: { categoryId_key: { categoryId: category.id, key: tag.key } },
        select: { id: true },
      });
      if (existing) {
        tagSkipped++;
        continue;
      }
      const transliteration =
        buildTransliterations([tag.name_ru, tag.name_am]).join(" ") || null;
      await prisma.tag.create({
        data: {
          categoryId: category.id,
          key: tag.key,
          name_en: tag.name_en,
          name_ru: tag.name_ru,
          name_am: tag.name_am ?? null,
          transliteration,
          sortOrder: i,
        },
      });
      tagInserted++;
    }
  }

  console.log(
    `✅ Tags seeded (inserted ${tagInserted}, skipped ${tagSkipped})`
  );

  // 3b. Seed Shop Types
  console.log("🏪 Seeding shop types...");

  const defaultShopTypes = [
    {
      key: "SHOP",
      name_en: "Shop",
      name_ru: "Магазин",
      name_am: "Խանdelays",
      icon: "store",
      supportsProducts: true,
      sortOrder: 0,
    },
    {
      key: "INFORMATION_BOARD",
      name_en: "Information Board",
      name_ru: "Информационная доска",
      name_am: null,
      icon: "info",
      supportsProducts: false,
      sortOrder: 1,
    },
    {
      key: "EATERY",
      name_en: "Eatery",
      name_ru: "Кафе/Столовая",
      name_am: null,
      icon: "utensils",
      supportsProducts: false,
      sortOrder: 2,
    },
    {
      key: "LOUNGE",
      name_en: "Lounge",
      name_ru: "Зона отдыха",
      name_am: null,
      icon: "sofa",
      supportsProducts: false,
      sortOrder: 3,
    },
    {
      key: "SERVICE_POINT",
      name_en: "Service Point",
      name_ru: "Пункт обслуживания",
      name_am: null,
      icon: "wrench",
      supportsProducts: false,
      sortOrder: 4,
    },
    {
      key: "STORAGE",
      name_en: "Storage",
      name_ru: "Склад",
      name_am: null,
      icon: "warehouse",
      supportsProducts: false,
      sortOrder: 5,
    },
  ];

  for (const st of defaultShopTypes) {
    await prisma.shopType.upsert({
      where: { key: st.key },
      update: {},
      create: st,
    });
  }

  // Assign default SHOP type to all existing shops
  const shopType = await prisma.shopType.findUnique({ where: { key: "SHOP" } });
  if (shopType) {
    await prisma.shop.updateMany({
      where: { shopTypeId: null },
      data: { shopTypeId: shopType.id },
    });
  }

  console.log("✅ Shop types seeded");

  // 4. Create Test Data (Development only)
  if (process.env.NODE_ENV === "development") {
    console.log("🧪 Creating test data...");

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: "customer@test.com",
        firstName: "Test",
        lastName: "Customer",
        password: await bcrypt.hash("Test1234!", 12),
        emailVerified: new Date(),
      },
    });

    console.log(`✅ Test customer: ${testUser.email}`);

    // Create test shops
    const testShop = await prisma.shop.create({
      data: {
        venue: "Main Market",
        building: "Block A",
        floor: "1",
        shopNumber: "01",
        fullCode: "MainMarketBlockAF1S01",
        shopName: "Test Electronics Shop",
        isActive: true,
      },
    });

    console.log(`✅ Test shop: ${testShop.fullCode}`);
  }

  console.log("✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
