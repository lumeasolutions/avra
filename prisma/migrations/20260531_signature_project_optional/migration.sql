-- VAGUE e-sign (31/05/2026) — projectId optionnel sur SignatureRequest
-- Un devis non rattache a un dossier (projectId inexistant) faisait planter
-- la creation de la demande de signature en 500 (violation de cle etrangere).
-- On rend la colonne nullable : la signature peut exister sans Project lie.
ALTER TABLE "SignatureRequest" ALTER COLUMN "projectId" DROP NOT NULL;
