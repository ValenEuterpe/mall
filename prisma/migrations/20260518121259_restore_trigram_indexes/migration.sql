-- Enable pg_trgm extension (idempotent - only runs if not exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes on product multilingual text columns
-- These restore indexes that were dropped by the new_search_engine_implementation migration
CREATE INDEX IF NOT EXISTS "products_name_en_trgm_idx" ON "products" USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_name_ru_trgm_idx" ON "products" USING gin (name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_name_am_trgm_idx" ON "products" USING gin (name_am gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_brand_trgm_idx"   ON "products" USING gin (brand       gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_producttype_trgm_idx" ON "products" USING gin ("productType" gin_trgm_ops);

-- GIN index on keywords array
CREATE INDEX IF NOT EXISTS "products_keywords_gin_idx" ON "products" USING gin ("keywords");

-- Trigram GIN indexes on tag labels
CREATE INDEX IF NOT EXISTS "tags_name_en_trgm_idx" ON "tags" USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tags_name_ru_trgm_idx" ON "tags" USING gin (name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tags_name_am_trgm_idx" ON "tags" USING gin (name_am gin_trgm_ops);