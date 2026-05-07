import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: env("postgresql://postgres.dtzacauqwlcnuttacpll:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"),
    },
});