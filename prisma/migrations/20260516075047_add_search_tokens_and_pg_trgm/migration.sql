-- Enable pg_trgm once per database
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "searchTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- GIN index on searchTokens array
CREATE INDEX IF NOT EXISTS "products_searchTokens_idx" ON "products" USING GIN ("searchTokens");

-- GIN index on keywords array
CREATE INDEX IF NOT EXISTS "products_keywords_gin_idx" ON "products" USING GIN ("keywords");

-- Trigram GIN indexes on multilingual text columns
CREATE INDEX IF NOT EXISTS "products_name_en_trgm_idx"     ON "products" USING gin (name_en     gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_name_ru_trgm_idx"     ON "products" USING gin (name_ru     gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_name_am_trgm_idx"     ON "products" USING gin (name_am     gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_brand_trgm_idx"       ON "products" USING gin (brand       gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_producttype_trgm_idx" ON "products" USING gin ("productType" gin_trgm_ops);

-- Trigram on tag labels for search-by-tag-name
CREATE INDEX IF NOT EXISTS "tags_name_en_trgm_idx" ON "tags" USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tags_name_ru_trgm_idx" ON "tags" USING gin (name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tags_name_am_trgm_idx" ON "tags" USING gin (name_am gin_trgm_ops);