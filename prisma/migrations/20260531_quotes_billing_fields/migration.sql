-- Devis (Quote) : persistance complete + standalone + remises/unite.
-- Additif uniquement : aucune donnee existante supprimee.

-- projectId optionnel (devis sans dossier lie). La FK ON DELETE CASCADE existante est conservee.
ALTER TABLE "Quote" ALTER COLUMN "projectId" DROP NOT NULL;

-- Champs snapshot devis.
ALTER TABLE "Quote"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "clientName" TEXT,
  ADD COLUMN "clientEmail" TEXT,
  ADD COLUMN "clientAddress" TEXT,
  ADD COLUMN "objet" TEXT,
  ADD COLUMN "conditionsPaiement" TEXT,
  ADD COLUMN "token" TEXT,
  ADD COLUMN "signatureStatus" TEXT,
  ADD COLUMN "signatureEmail" TEXT,
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "totalHT" DECIMAL(12,2),
  ADD COLUMN "totalTTC" DECIMAL(12,2);

-- Lignes : remise (%) + unite libre.
ALTER TABLE "QuoteLine"
  ADD COLUMN "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "unit" TEXT;

-- Index pour les requetes par dossier.
CREATE INDEX IF NOT EXISTS "Quote_workspaceId_projectId_idx" ON "Quote"("workspaceId", "projectId");
