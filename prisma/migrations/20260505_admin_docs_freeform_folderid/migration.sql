-- Admin Docs : free-form category in Document.folderId (2026-05-05)
--
-- Le module /admin-docs stocke ses catégories administratives (Juridique,
-- Comptabilité, Banque/Comptes, etc.) directement dans `Document.folderId`
-- en tant que chaîne libre — pas comme un FK vers ProjectFolder.
--
-- L'ancienne contrainte FK `Document_folderId_fkey` empêchait l'insertion
-- de catégories qui ne correspondent à aucun ProjectFolder existant
-- (provoquait Internal Server Error à l'upload).
--
-- On drop la FK pour permettre les catégories en string libre.
-- Les documents projet "classiques" continuent de fonctionner : si folderId
-- correspond à un ProjectFolder.id, la jointure Prisma retourne le record ;
-- sinon (admin docs avec catégorie texte), Prisma retourne null sans erreur.

ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_folderId_fkey";
