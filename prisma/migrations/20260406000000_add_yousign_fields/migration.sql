-- AlterTable: Add YouSign integration fields to SignatureRequest
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "documentTitle" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "signerEmail" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "signerName" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "signerPhone" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "yousignDocId" TEXT;
ALTER TABLE "SignatureRequest" ADD COLUMN IF NOT EXISTS "yousignSignerId" TEXT;
