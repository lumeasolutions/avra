-- Table DossierDocument : métadonnées des fichiers des sous-dossiers de dossier.
-- Contenu binaire stocké dans Supabase Storage (bucket privé).
CREATE TABLE "DossierDocument" (
    "id"              TEXT NOT NULL,
    "workspaceId"     TEXT NOT NULL,
    "projectId"       TEXT NOT NULL,
    "subfolderLabel"  TEXT NOT NULL,
    "storageBucket"   TEXT NOT NULL,
    "storagePath"     TEXT NOT NULL,
    "originalName"    TEXT NOT NULL,
    "mimeType"        TEXT,
    "sizeBytes"       INTEGER,
    "createdById"     TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DossierDocument_storagePath_key" ON "DossierDocument"("storagePath");
CREATE INDEX "DossierDocument_projectId_idx" ON "DossierDocument"("projectId");
CREATE INDEX "DossierDocument_workspaceId_projectId_subfolderLabel_idx"
    ON "DossierDocument"("workspaceId", "projectId", "subfolderLabel");

ALTER TABLE "DossierDocument"
    ADD CONSTRAINT "DossierDocument_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DossierDocument"
    ADD CONSTRAINT "DossierDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DossierDocument"
    ADD CONSTRAINT "DossierDocument_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
