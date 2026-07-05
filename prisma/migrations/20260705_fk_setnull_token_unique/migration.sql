-- Audit 2026-07-05 — Protection des pieces comptables + tokens e-facturation uniques
--
-- 1) onDelete SET NULL / RESTRICT au lieu de CASCADE : supprimer un dossier
--    (Project) ne doit PLUS effacer devis, factures et demandes de signature
--    (conservation legale des pieces comptables, 10 ans). PaymentRequest.projectId
--    etant NOT NULL, on utilise RESTRICT (bloque la suppression du dossier tant
--    qu'il porte une demande de paiement) plutot que SET NULL.
-- 2) UNIQUE sur Quote.token / Invoice.token : lookup e-facturation direct cote
--    serveur, sans collision de token ni scan de tout le dataset.
--
-- Verifie le 2026-07-05 sur la base de prod (projet "avra") : 0 devis, 0 facture,
-- 0 token duplique -> application sans risque.

-- Quote.project : CASCADE -> SET NULL
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_projectId_fkey";
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice.project : CASCADE -> SET NULL
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_projectId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SignatureRequest.project : CASCADE -> SET NULL
ALTER TABLE "SignatureRequest" DROP CONSTRAINT "SignatureRequest_projectId_fkey";
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentRequest.project : CASCADE -> RESTRICT (projectId NOT NULL)
ALTER TABLE "PaymentRequest" DROP CONSTRAINT "PaymentRequest_projectId_fkey";
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tokens e-facturation uniques (les NULL multiples restent autorises par Postgres).
CREATE UNIQUE INDEX "Quote_token_key" ON "Quote"("token");
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");
