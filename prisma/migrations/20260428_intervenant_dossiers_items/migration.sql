-- ════════════════════════════════════════════════════════════════════════
-- Migration : IntervenantDossier + IntervenantDossierItem
-- Date : 2026-04-28
--
-- Sort le store local de classement par intervenant en backend persistant.
-- Permet le multi-utilisateurs (plusieurs comptes pro du même workspace
-- voient les mêmes dossiers de classement) et la sync cross-device.
--
-- Ajoute aussi : Intervenant.rating, Intervenant.ratingComment, tagsCsv.
-- ════════════════════════════════════════════════════════════════════════

-- Enums
CREATE TYPE "IntervenantDossierStatut" AS ENUM ('A_CLASSER', 'CLASSE');
CREATE TYPE "IntervenantDossierItemStatut" AS ENUM ('URGENT', 'EN_COURS', 'CLASSE');

-- Intervenant : ajout note/tags manuels
ALTER TABLE "Intervenant"
  ADD COLUMN IF NOT EXISTS "rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "ratingComment" TEXT,
  ADD COLUMN IF NOT EXISTS "tagsCsv" TEXT;

-- Table des dossiers de classement par intervenant
CREATE TABLE "IntervenantDossier" (
  "id"            TEXT PRIMARY KEY,
  "workspaceId"   TEXT NOT NULL,
  "intervenantId" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "date"          TEXT,
  "statut"        "IntervenantDossierStatut" NOT NULL DEFAULT 'A_CLASSER',
  "rajoute"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntervenantDossier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IntervenantDossier_intervenantId_fkey" FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "IntervenantDossier_workspaceId_idx" ON "IntervenantDossier"("workspaceId");
CREATE INDEX "IntervenantDossier_intervenantId_idx" ON "IntervenantDossier"("intervenantId");

-- Table des items dans un dossier
CREATE TABLE "IntervenantDossierItem" (
  "id"        TEXT PRIMARY KEY,
  "dossierId" TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "statut"    "IntervenantDossierItemStatut" NOT NULL DEFAULT 'EN_COURS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntervenantDossierItem_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "IntervenantDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "IntervenantDossierItem_dossierId_idx" ON "IntervenantDossierItem"("dossierId");
