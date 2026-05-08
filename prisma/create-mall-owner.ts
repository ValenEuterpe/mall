// prisma/create-mall-owner.ts
//
// One-shot script to create or update a mall owner without nuking data.
// Usage:
//   npx tsx prisma/create-mall-owner.ts
//
// Reads MALL_OWNER_EMAIL, MALL_OWNER_PASSWORD, MALL_OWNER_NAME,
// MALL_OWNER_PHONE, MALL_OWNER_ALLOWED_IPS from .env.local. If a record with
// the email already exists, updates the password and name in place.

import { config } from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

config({ path: path.join(process.cwd(), ".env.local") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

async function main() {
  const email = required("MALL_OWNER_EMAIL");
  const password = required("MALL_OWNER_PASSWORD");
  const name = process.env.MALL_OWNER_NAME ?? "Mall Administrator";
  const phone = process.env.MALL_OWNER_PHONE ?? null;
  const allowedIps = (process.env.MALL_OWNER_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const connectionString = required("DIRECT_URL");
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hashed = await bcrypt.hash(password, 12);

  const result = await prisma.mallOwner.upsert({
    where: { email },
    update: {
      password: hashed,
      name,
      phone,
      allowedIps,
    },
    create: {
      email,
      password: hashed,
      name,
      phone,
      allowedIps,
    },
  });

  console.log(`✅ Mall Owner ready: ${result.email} (id: ${result.id})`);
  console.log(`   allowedIps: ${allowedIps.length === 0 ? "(none — open access)" : allowedIps.join(", ")}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Failed to create/update mall owner:", err);
  process.exit(1);
});
