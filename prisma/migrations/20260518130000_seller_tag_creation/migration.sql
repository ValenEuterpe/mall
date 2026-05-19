-- Seller-authored tags (v3): subcategory scope, Latin transliteration, author attribution, canonical pointer.
-- pg_trgm extension and trigram indexes on tags.name_* already exist from prior migrations.

-- New columns on tags
ALTER TABLE "tags" ADD COLUMN "subcategoryId" TEXT;
ALTER TABLE "tags" ADD COLUMN "transliteration" TEXT;
ALTER TABLE "tags" ADD COLUMN "createdBySellerId" TEXT;
ALTER TABLE "tags" ADD COLUMN "canonicalTagId" TEXT;

-- FK: tags.subcategoryId -> subcategories.id (SET NULL on subcategory delete; tag stays at category scope)
ALTER TABLE "tags"
  ADD CONSTRAINT "tags_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: tags.canonicalTagId -> tags.id (self-relation for synonyms / future merge tooling)
ALTER TABLE "tags"
  ADD CONSTRAINT "tags_canonicalTagId_fkey"
  FOREIGN KEY ("canonicalTagId") REFERENCES "tags"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tags_subcategoryId_idx" ON "tags"("subcategoryId");
CREATE INDEX "tags_canonicalTagId_idx" ON "tags"("canonicalTagId");

-- Trigram GIN on the new Latin form for in-DB fuzzy matching (transliterated search).
-- pg_trgm extension is already enabled by earlier migration.
CREATE INDEX "tags_transliteration_trgm_idx" ON "tags" USING gin ("transliteration" gin_trgm_ops);
