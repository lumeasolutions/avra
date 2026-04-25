-- Admin Docs Enhancements (2026-04-25)
-- Ajouts non-destructifs sur Document + nouveau model DocumentAuditLog.
-- Toutes les colonnes ajoutées sont NULLABLES → aucune rupture sur les
-- données existantes ; les anciens documents restent valides.

-- ──────────────────────────────────────────────────────────────────────
-- Document : nouvelles colonnes
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE "Document" ADD COLUMN "expiresAt"        TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "description"      TEXT;
ALTER TABLE "Document" ADD COLUMN "tagsCsv"          TEXT;
ALTER TABLE "Document" ADD COLUMN "parentDocumentId" TEXT;

-- Index pour les requêtes "documents qui expirent bientôt"
CREATE INDEX "Document_workspaceId_projectId_expiresAt_idx"
  ON "Document" ("workspaceId", "projectId", "expiresAt");

-- Index pour remonter rapidement la chaîne de versions
CREATE INDEX "Document_parentDocumentId_idx"
  ON "Document" ("parentDocumentId");

-- Self-FK pour le versioning : SET NULL si le parent est supprimé
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_parentDocumentId_fkey"
  FOREIGN KEY ("parentDocumentId") REFERENCES "Document"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- DocumentAuditLog : nouveau model
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "DocumentAuditLog" (
  "id"            TEXT         NOT NULL,
  "workspaceId"   TEXT         NOT NULL,
  "documentId"    TEXT,
  "documentTitle" TEXT         NOT NULL,
  "userId"        TEXT         NOT NULL,
  "userEmail"     TEXT         NOT NULL,
  "action"        TEXT         NOT NULL,
  "meta"          TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentAuditLog_workspaceId_createdAt_idx"
  ON "DocumentAuditLog" ("workspaceId", "createdAt");
CREATE INDEX "DocumentAuditLog_documentId_idx"
  ON "DocumentAuditLog" ("documentId");
CREATE INDEX "DocumentAuditLog_userId_idx"
  ON "DocumentAuditLog" ("userId");

ALTER TABLE "DocumentAuditLog"
  ADD CONSTRAINT "DocumentAuditLog_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentAuditLog"
  ADD CONSTRAINT "DocumentAuditLog_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentAuditLog"
  ADD CONSTRAINT "DocumentAuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
