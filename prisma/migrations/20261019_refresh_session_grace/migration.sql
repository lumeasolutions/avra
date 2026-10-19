-- Delai de grace du jeton de rafraichissement precedent (cf. schema).
ALTER TABLE "RefreshSession" ADD COLUMN IF NOT EXISTS "prevJtiLookup" VARCHAR(64);
ALTER TABLE "RefreshSession" ADD COLUMN IF NOT EXISTS "prevValidUntil" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshSession_prevJtiLookup_key" ON "RefreshSession"("prevJtiLookup");
