-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('ARCHITECTE_INTERIEUR', 'CUISINISTE', 'MENUISIER', 'AGENCEUR', 'DECORATEUR', 'PROMOTEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PARTICULIER', 'PROFESSIONNEL');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BILLING', 'SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('DRAFT', 'VENTE', 'SIGNE', 'EN_CHANTIER', 'RECEPTION', 'SAV', 'CLOTURE', 'PERDU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('LEAD', 'PROSPECT', 'DEVIS_ENVOYE', 'NEGOCIATION', 'GAGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "EventCalendarType" AS ENUM ('PERSONAL', 'GESTION');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('REUNION', 'VISITE_CHANTIER', 'LIVRAISON', 'INSTALLATION', 'RDV_CLIENT', 'RELANCE', 'FORMATION', 'DEPLACEMENT', 'APPEL', 'AUTRE');

-- CreateEnum
CREATE TYPE "IntervenantType" AS ENUM ('POSEUR', 'ELECTRICIEN', 'MACON', 'PEINTRE', 'PLOMBIER', 'CARRELEUR', 'MENUISIER', 'CHAUFFAGISTE', 'SERRURIER', 'GEOMETRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "IntervenantRequestStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REFUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('PLAN', 'DEVIS', 'FACTURE', 'CONTRAT', 'BON_COMMANDE', 'PHOTO', 'IA_RENDER', 'AUTRE');

-- CreateEnum
CREATE TYPE "FileMimeCategory" AS ENUM ('IMAGE', 'PDF', 'DOCUMENT', 'VIDEO', 'ARCHIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "StockItemStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OUT_OF_STOCK', 'DISCONTINUED', 'ORDERED');

-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('MEUBLE', 'ELECTROMENAGER', 'LUMINAIRE', 'ACCESSOIRE', 'MATERIAU', 'TEXTILE', 'SANITAIRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "IaJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "IaJobType" AS ENUM ('PHOTOREALISM_ENHANCE', 'COLOR_VARIATION', 'EDIT', 'PLAN_COMPARISON', 'TEXT_ASSISTANT');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ACOMPTE', 'SOLDE', 'FACTURE', 'AVOIR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'REFUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationScope" AS ENUM ('SYSTEM', 'PROJECT', 'CLIENT', 'PAYMENT', 'SIGNATURE', 'IA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'UPLOAD', 'SIGN', 'PAY');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "WorkspacePlan" NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "refreshToken" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWorkspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "marginThreshold" DECIMAL(5,2),
    "enableIa" BOOLEAN NOT NULL DEFAULT true,
    "enableSignature" BOOLEAN NOT NULL DEFAULT false,
    "enablePayment" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "address" TEXT,
    "siret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'PARTICULIER',
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "vatNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'SITE',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "tradeType" "TradeType" NOT NULL DEFAULT 'AUTRE',
    "lifecycleStatus" "ProjectLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'LEAD',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "saleAmount" DECIMAL(12,2),
    "purchaseAmount" DECIMAL(12,2),
    "saleSignedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFolder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStageData" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStageData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCustomFieldValue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectIntervenant" (
    "projectId" TEXT NOT NULL,
    "intervenantId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectIntervenant_pkey" PRIMARY KEY ("projectId","intervenantId")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mimeCategory" "FileMimeCategory" NOT NULL DEFAULT 'OTHER',
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "publicUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "storedFileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'AUTRE',
    "visibilityClient" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "calendarType" "EventCalendarType" NOT NULL DEFAULT 'GESTION',
    "type" "EventType" NOT NULL DEFAULT 'AUTRE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventIntervenant" (
    "eventId" TEXT NOT NULL,
    "intervenantId" TEXT NOT NULL,

    CONSTRAINT "EventIntervenant_pkey" PRIMARY KEY ("eventId","intervenantId")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "folderId" TEXT,
    "eventId" TEXT,
    "message" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervenant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "IntervenantType" NOT NULL DEFAULT 'AUTRE',
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntervenantRequest" (
    "id" TEXT NOT NULL,
    "intervenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "IntervenantRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntervenantRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntervenantResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntervenantResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "supplierId" TEXT,
    "status" "StockItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "category" "StockCategory" NOT NULL DEFAULT 'AUTRE',
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "color" TEXT,
    "material" TEXT,
    "purchasePrice" DECIMAL(12,2),
    "salePrice" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStockItem" (
    "projectId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reserved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProjectStockItem_pkey" PRIMARY KEY ("projectId","stockItemId")
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "supplierId" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SupplierOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL DEFAULT 'ACOMPTE',
    "amount" DECIMAL(12,2) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'yousign',
    "providerRef" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signingUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IaJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "IaJobType" NOT NULL,
    "status" "IaJobStatus" NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT,
    "sourceDocumentId" TEXT,
    "resultDocumentId" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IaJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "NotificationScope" NOT NULL DEFAULT 'SYSTEM',
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "triggerKey" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserWorkspace_workspaceId_idx" ON "UserWorkspace"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspace_userId_workspaceId_key" ON "UserWorkspace"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "Client_workspaceId_idx" ON "Client"("workspaceId");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Address_clientId_idx" ON "Address"("clientId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "ProjectFolder_projectId_idx" ON "ProjectFolder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStageData_projectId_stage_key" ON "ProjectStageData"("projectId", "stage");

-- CreateIndex
CREATE INDEX "ProjectCustomFieldValue_projectId_idx" ON "ProjectCustomFieldValue"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "StoredFile_workspaceId_idx" ON "StoredFile"("workspaceId");

-- CreateIndex
CREATE INDEX "Document_workspaceId_idx" ON "Document"("workspaceId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentShare_token_key" ON "DocumentShare"("token");

-- CreateIndex
CREATE INDEX "Event_workspaceId_idx" ON "Event"("workspaceId");

-- CreateIndex
CREATE INDEX "Reminder_projectId_idx" ON "Reminder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervenant_portalToken_key" ON "Intervenant"("portalToken");

-- CreateIndex
CREATE INDEX "Intervenant_workspaceId_idx" ON "Intervenant"("workspaceId");

-- CreateIndex
CREATE INDEX "IntervenantRequest_intervenantId_idx" ON "IntervenantRequest"("intervenantId");

-- CreateIndex
CREATE INDEX "IntervenantRequest_projectId_idx" ON "IntervenantRequest"("projectId");

-- CreateIndex
CREATE INDEX "Supplier_workspaceId_idx" ON "Supplier"("workspaceId");

-- CreateIndex
CREATE INDEX "StockItem_workspaceId_idx" ON "StockItem"("workspaceId");

-- CreateIndex
CREATE INDEX "SupplierOrder_workspaceId_idx" ON "SupplierOrder"("workspaceId");

-- CreateIndex
CREATE INDEX "Quote_workspaceId_idx" ON "Quote"("workspaceId");

-- CreateIndex
CREATE INDEX "PaymentRequest_workspaceId_idx" ON "PaymentRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "PaymentRequest_projectId_idx" ON "PaymentRequest"("projectId");

-- CreateIndex
CREATE INDEX "SignatureRequest_workspaceId_idx" ON "SignatureRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "SignatureRequest_projectId_idx" ON "SignatureRequest"("projectId");

-- CreateIndex
CREATE INDEX "IaJob_workspaceId_idx" ON "IaJob"("workspaceId");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_userId_isRead_idx" ON "Notification"("workspaceId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

-- CreateIndex
CREATE INDEX "AutomationRule_workspaceId_idx" ON "AutomationRule"("workspaceId");

-- AddForeignKey
ALTER TABLE "UserWorkspace" ADD CONSTRAINT "UserWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkspace" ADD CONSTRAINT "UserWorkspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolder" ADD CONSTRAINT "ProjectFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolder" ADD CONSTRAINT "ProjectFolder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "ProjectFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStageData" ADD CONSTRAINT "ProjectStageData_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCustomFieldValue" ADD CONSTRAINT "ProjectCustomFieldValue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntervenant" ADD CONSTRAINT "ProjectIntervenant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntervenant" ADD CONSTRAINT "ProjectIntervenant_intervenantId_fkey" FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ProjectFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventIntervenant" ADD CONSTRAINT "EventIntervenant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventIntervenant" ADD CONSTRAINT "EventIntervenant_intervenantId_fkey" FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervenant" ADD CONSTRAINT "Intervenant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervenantRequest" ADD CONSTRAINT "IntervenantRequest_intervenantId_fkey" FOREIGN KEY ("intervenantId") REFERENCES "Intervenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervenantResponse" ADD CONSTRAINT "IntervenantResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "IntervenantRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStockItem" ADD CONSTRAINT "ProjectStockItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStockItem" ADD CONSTRAINT "ProjectStockItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrderLine" ADD CONSTRAINT "SupplierOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaJob" ADD CONSTRAINT "IaJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaJob" ADD CONSTRAINT "IaJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaJob" ADD CONSTRAINT "IaJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaJob" ADD CONSTRAINT "IaJob_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IaJob" ADD CONSTRAINT "IaJob_resultDocumentId_fkey" FOREIGN KEY ("resultDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
