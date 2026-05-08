import { config } from "dotenv";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import pg from "pg";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";

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
  await prisma.product.deleteMany();
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

  // 2. Create Mall Owner
  console.log("👑 Creating Mall Owner...");

  const hashedPassword = await bcrypt.hash("MallMall2026", 12);

  const mallOwner = await prisma.mallOwner.create({
    data: {
      email: "mallowner@atomicmail.io",
      password: hashedPassword,
      name: "Mall Administrator",
      phone: "+1234567890",
      allowedIps: [], // Localhost for dev
    },
  });

  console.log(`✅ Mall Owner created: ${mallOwner.email}`);

  // 3. Seed Categories
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
              name_am: amCategory?.subcategories?.[subcategoryKey] || enCategory.subcategories[subcategoryKey],
            })
          ),
        },
      },
    });
  }

  console.log("✅ Categories seeded");

  // 3b. Seed Shop Types
  console.log("🏪 Seeding shop types...");

  const defaultShopTypes = [
    { key: "SHOP", name_en: "Shop", name_ru: "Магазин", name_am: "Խանdelays", icon: "store", supportsProducts: true, sortOrder: 0 },
    { key: "INFORMATION_BOARD", name_en: "Information Board", name_ru: "Информационная доска", name_am: null, icon: "info", supportsProducts: false, sortOrder: 1 },
    { key: "EATERY", name_en: "Eatery", name_ru: "Кафе/Столовая", name_am: null, icon: "utensils", supportsProducts: false, sortOrder: 2 },
    { key: "LOUNGE", name_en: "Lounge", name_ru: "Зона отдыха", name_am: null, icon: "sofa", supportsProducts: false, sortOrder: 3 },
    { key: "SERVICE_POINT", name_en: "Service Point", name_ru: "Пункт обслуживания", name_am: null, icon: "wrench", supportsProducts: false, sortOrder: 4 },
    { key: "STORAGE", name_en: "Storage", name_ru: "Склад", name_am: null, icon: "warehouse", supportsProducts: false, sortOrder: 5 },
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
