-- Intervenant Portal — full data model (2026-04-26)
-- Ajouts non-destructifs : aucun champ existant n'est modifie ou supprime.
-- Tous les nouveaux champs et tables sont nullables ou avec defaults raisonnables.

-- ──────────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────────
CREATE TYPE "DemandeType" AS ENUM (
  'POSE', 'LIVRAISON', 'SAV', 'MESURE', 'DEVIS',
  'CONFIRMATION_COMMANDE', 'COMPLEMENT', 'AUTRE'
);

CREATE TYPE "DemandeStatus" AS ENUM (
  'ENVOYEE', 'VUE', 'ACCEPTEE', 'REFUSEE',
  'EN_COURS', 'TERMINEE', 'ANNULEE'
);

CREATE TYPE "IntervenantInvitationStatus" AS ENUM (
  'PENDING', 'ACCEPTED', 'REFUSED', 'EXPIRED', 'REVOKED'
);

-- ──────────────────────────────────────────────────────────────────────
-- Intervenant : ajout du userId (compte connecte au portail)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE "Intervenant" ADD COLUMN "userId" TEXT;
CREATE INDEX "Intervenant_userId_idx" ON "Intervenant"("userId");
ALTER TABLE "Intervenant"
  ADD CONSTRAINT "Intervenant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- IntervenantInvitation
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "IntervenantInvitation" (
  "id"               TEXT NOT NULL,
  "intervenantId"    TEXT NOT NULL,
  "workspaceId"      TEXT NOT NULL,
  "token"            TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "status"           "IntervenantInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"        TIMESTAMP(3) NOT NULL,
  "acceptedAt"       TIMESTAMP(3),
  "refusedAt"        TIMESTAMP(3),
  "revokedAt"        TIMESTAMP(3),
  "acceptedByUserId" TEXT,
  "message"          TEXT,
  "createdById"      TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntervenantInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntervenantInvitation_token_key" ON "IntervenantInvitation"("token");
CREATE INDEX "IntervenantInvitation_workspaceId_status_idx" ON "IntervenantInvitation"("workspaceId", "status");
CREATE INDEX "IntervenantInvitation_intervenantId_idx" ON "IntervenantInvitation"("intervenantId");
CREATE INDEX "IntervenantInvitation_email_idx" ON "IntervenantInvitation"("email");
CREATE INDEX "IntervenantInvitation_expiresAt_idx" ON "IntervenantInvitation"("expiresAt");

ALTER TABLE "IntervenantInvitation"
  ADD CONSTRAINT "IntervenantInvitation_intervenantId_fkey"
  FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntervenantInvitation"
  ADD CONSTRAINT "IntervenantInvitation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntervenantInvitation"
  ADD CONSTRAINT "IntervenantInvitation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntervenantInvitation"
  ADD CONSTRAINT "IntervenantInvitation_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- Demande
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "Demande" (
  "id"              TEXT NOT NULL,
  "workspaceId"     TEXT NOT NULL,
  "intervenantId"   TEXT,
  "projectId"       TEXT,
  "eventId"         TEXT,
  "type"            "DemandeType" NOT NULL DEFAULT 'AUTRE',
  "status"          "DemandeStatus" NOT NULL DEFAULT 'ENVOYEE',
  "title"           TEXT NOT NULL,
  "notes"           TEXT,
  "scheduledFor"    TIMESTAMP(3),
  "responseMessage" TEXT,
  "viewedAt"        TIMESTAMP(3),
  "acceptedAt"      TIMESTAMP(3),
  "refusedAt"       TIMESTAMP(3),
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "cancelledAt"     TIMESTAMP(3),
  "createdById"     TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Demande_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Demande_workspaceId_status_idx" ON "Demande"("workspaceId", "status");
CREATE INDEX "Demande_intervenantId_status_idx" ON "Demande"("intervenantId", "status");
CREATE INDEX "Demande_projectId_idx" ON "Demande"("projectId");
CREATE INDEX "Demande_eventId_idx" ON "Demande"("eventId");

ALTER TABLE "Demande"
  ADD CONSTRAINT "Demande_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Demande"
  ADD CONSTRAINT "Demande_intervenantId_fkey"
  FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Demande"
  ADD CONSTRAINT "Demande_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Demande"
  ADD CONSTRAINT "Demande_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Demande"
  ADD CONSTRAINT "Demande_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- DemandeMessage
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "DemandeMessage" (
  "id"          TEXT NOT NULL,
  "demandeId"   TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "authorName"  TEXT NOT NULL,
  "authorRole"  TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemandeMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemandeMessage_demandeId_createdAt_idx" ON "DemandeMessage"("demandeId", "createdAt");

ALTER TABLE "DemandeMessage"
  ADD CONSTRAINT "DemandeMessage_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "Demande"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeMessage"
  ADD CONSTRAINT "DemandeMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- DemandeAttachment
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "DemandeAttachment" (
  "id"                TEXT NOT NULL,
  "demandeId"         TEXT NOT NULL,
  "dossierDocumentId" TEXT,
  "documentId"        TEXT,
  "displayName"       TEXT NOT NULL,
  "mimeType"          TEXT,
  "uploadedByRole"    TEXT NOT NULL,
  "uploadedById"      TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemandeAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemandeAttachment_demandeId_idx" ON "DemandeAttachment"("demandeId");
CREATE INDEX "DemandeAttachment_dossierDocumentId_idx" ON "DemandeAttachment"("dossierDocumentId");
CREATE INDEX "DemandeAttachment_documentId_idx" ON "DemandeAttachment"("documentId");

ALTER TABLE "DemandeAttachment"
  ADD CONSTRAINT "DemandeAttachment_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "Demande"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeAttachment"
  ADD CONSTRAINT "DemandeAttachment_dossierDocumentId_fkey"
  FOREIGN KEY ("dossierDocumentId") REFERENCES "DossierDocument"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DemandeAttachment"
  ADD CONSTRAINT "DemandeAttachment_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DemandeAttachment"
  ADD CONSTRAINT "DemandeAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────────────
-- DemandeStatusEvent
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE "DemandeStatusEvent" (
  "id"              TEXT NOT NULL,
  "demandeId"       TEXT NOT NULL,
  "fromStatus"      "DemandeStatus",
  "toStatus"        "DemandeStatus" NOT NULL,
  "triggeredById"   TEXT NOT NULL,
  "triggeredByRole" TEXT NOT NULL,
  "comment"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemandeStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemandeStatusEvent_demandeId_createdAt_idx" ON "DemandeStatusEvent"("demandeId", "createdAt");

ALTER TABLE "DemandeStatusEvent"
  ADD CONSTRAINT "DemandeStatusEvent_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "Demande"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeStatusEvent"
  ADD CONSTRAINT "DemandeStatusEvent_triggeredById_fkey"
  FOREIGN KEY ("triggeredById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
