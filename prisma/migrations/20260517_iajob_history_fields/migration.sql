-- Sprint historique IA (mai 2026)
-- Persistance des générations Kontext (coloriste) + Ultra (rendu) en DB,
-- ainsi qu'une copie permanente des images dans Supabase Storage.

-- 1) Champs supplémentaires sur IaJob
ALTER TABLE "IaJob"
  ADD COLUMN "inputImageUrls"  JSONB,
  ADD COLUMN "resultImageUrls" JSONB,
  ADD COLUMN "costEUR"         DOUBLE PRECISION,
  ADD COLUMN "durationMs"      INTEGER,
  ADD COLUMN "params"          JSONB,
  ADD COLUMN "modelsUsed"      TEXT[] NOT NULL DEFAULT '{}';

-- 2) Index pour les requêtes du panneau historique
--    (workspaceId, projectId)  -> liste des rendus d'un dossier
--    (workspaceId, status)     -> jobs encore QUEUED/PROCESSING (debug)
--    (workspaceId, type, createdAt DESC) -> historique trié par module + date
CREATE INDEX IF NOT EXISTS "IaJob_workspaceId_projectId_idx"
  ON "IaJob"("workspaceId", "projectId");

CREATE INDEX IF NOT EXISTS "IaJob_workspaceId_status_idx"
  ON "IaJob"("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "IaJob_workspaceId_type_createdAt_idx"
  ON "IaJob"("workspaceId", "type", "createdAt" DESC);
