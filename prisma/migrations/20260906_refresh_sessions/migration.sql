-- Une session de connexion par appareil, au lieu d une seule par compte.
CREATE TABLE IF NOT EXISTS "RefreshSession" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "jtiLookup"  VARCHAR(64) NOT NULL,
  "jtiHash"    VARCHAR(120) NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent"  VARCHAR(300),
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshSession_jtiLookup_key" ON "RefreshSession"("jtiLookup");
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_idx"    ON "RefreshSession"("userId");
CREATE INDEX IF NOT EXISTS "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshSession_userId_fkey'
  ) THEN
    ALTER TABLE "RefreshSession"
      ADD CONSTRAINT "RefreshSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
