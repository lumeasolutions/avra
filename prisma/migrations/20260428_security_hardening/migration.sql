-- ✅ AVRA Security Hardening — 2026-04-28
-- Adds:
--   • User.passwordResetTokenHash + passwordResetExpiresAt   (HIGH-005)
--   • User.icalToken (unique)                                (HIGH-003)
--   • CronRun table for cron idempotency lock                (CRIT-003)
--
-- Apply with:  pnpm prisma migrate deploy
-- Or manually: psql $DIRECT_URL < migration.sql

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "icalToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_icalToken_key" ON "User"("icalToken");

CREATE TABLE IF NOT EXISTS "CronRun" (
  "name" TEXT NOT NULL PRIMARY KEY,
  "lastRunAt" TIMESTAMP(3) NOT NULL,
  "lastStatus" TEXT
);
