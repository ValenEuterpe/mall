ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "searchText" TEXT;

CREATE INDEX IF NOT EXISTS "products_searchText_trgm_idx"
  ON "products" USING GIN ("searchText" gin_trgm_ops);
