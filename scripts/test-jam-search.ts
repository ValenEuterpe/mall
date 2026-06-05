import { config } from "dotenv";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";
import {
  buildFilterSqlAndParams,
  buildSearchBaseParams,
  buildSearchJoinSql,
  buildSearchMatchSql,
  buildSearchScoreSql,
  getSearchSqlPlaceholders,
  shouldUseTrigram,
} from "../src/app/api/v1/products/helpers/search-sql";

config({ path: path.join(process.cwd(), ".env.local") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const q = "jam";
  const tokenizedQ = q.split(/\s+/).filter((w) => w.length >= 2);
  const prefix = `${q}%`;
  const useTrigram = shouldUseTrigram(q);
  const ph = getSearchSqlPlaceholders(useTrigram);
  const filters = {};
  const { sql: filterSql, params: filterParams } = buildFilterSqlAndParams(
    filters,
    ph.filterStartIdx
  );
  const searchSql = buildSearchMatchSql(ph);
  const scoreSql = buildSearchScoreSql(ph);
  const limitIdx = ph.filterStartIdx + filterParams.length;
  const offsetIdx = limitIdx + 1;

  const sql = `SELECT p.id,
                (${scoreSql}) AS score,
                COUNT(*) OVER()::bigint AS total_count
         FROM products p
         ${buildSearchJoinSql()}
         WHERE ${filterSql} AND (${searchSql})
         ORDER BY score DESC NULLS LAST, p."createdAt" DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  console.log("SQL (truncated):", sql.slice(0, 200), "...");
  console.log("Params:", { tokenizedQ, q, prefix, filterParams, limit: 12, offset: 0 });

  try {
    const col = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'searchText'`
    );
    console.log("searchText column exists:", col.length > 0);

    const rows = await prisma.$queryRawUnsafe<
      { id: string; score: number; total_count: bigint }[]
    >(
      sql,
      ...buildSearchBaseParams(tokenizedQ, q, prefix, useTrigram),
      ...filterParams,
      12,
      0
    );
    console.log("OK rows:", rows.length, "total:", rows[0]?.total_count);
  } catch (e) {
    console.error("QUERY FAILED:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
