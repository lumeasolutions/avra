-- Raison de la perte d un dossier (auparavant navigateur uniquement).
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
