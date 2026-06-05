-- Idempotent restore after mistaken index drop in 20260604083508
CREATE INDEX IF NOT EXISTS "products_searchText_trgm_idx"
  ON "products" USING GIN ("searchText" gin_trgm_ops);
