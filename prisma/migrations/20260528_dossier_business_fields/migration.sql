-- VAGUE 2 (28/05/2026) — Persistance des données métier dossier
-- Auparavant uniquement dans le store Zustand (localStorage), donc perdues
-- au changement de device / vidage de cache. On les remonte en base sur le
-- modèle Project pour qu'elles soient multi-device et inperdables.
--
-- Champs :
--   terminated / terminatedAt / archivedAt : clôture + archivage du dossier
--   vendeurName                            : vendeur attribué (snapshot nom)
--   statsSkipped                           : dossier reporté du gate stats
--   prixLignes (JSONB)                     : lignes prix achat/vente HT
--   confirmations (JSONB)                  : confirmations fournisseurs
--   dateButoires (JSONB)                   : 5 dates butoires + SAV

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "terminated"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "terminatedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "vendeurName"   TEXT,
  ADD COLUMN IF NOT EXISTS "statsSkipped"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "prixLignes"    JSONB,
  ADD COLUMN IF NOT EXISTS "confirmations" JSONB,
  ADD COLUMN IF NOT EXISTS "dateButoires"  JSONB;

-- Index pour filtrer rapidement les dossiers archivés d'un workspace
CREATE INDEX IF NOT EXISTS "Project_workspaceId_archivedAt_idx"
  ON "Project"("workspaceId", "archivedAt");
