-- Factures (Invoice/InvoiceLine) — persistance complete. Additif uniquement.

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT,
  "quoteId" TEXT,
  "reference" TEXT,
  "type" TEXT NOT NULL DEFAULT 'STANDARD',
  "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "clientName" TEXT,
  "clientEmail" TEXT,
  "clientAddress" TEXT,
  "objet" TEXT,
  "conditionsPaiement" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateEcheance" TIMESTAMP(3),
  "notes" TEXT,
  "token" TEXT,
  "montantDeja" DECIMAL(12,2),
  "totalHT" DECIMAL(12,2),
  "totalTVA" DECIMAL(12,2),
  "totalTTC" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
  "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "unit" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");
CREATE INDEX "Invoice_workspaceId_projectId_idx" ON "Invoice"("workspaceId", "projectId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
