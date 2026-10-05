-- Corbeille des dossiers (05/10/2026).
--
-- La suppression d'un dossier etait definitive : la ligne partait de la base,
-- et rien ne permettait de revenir sur une erreur — ni pour l'admin qui s'est
-- trompe, ni pour recuperer ce qu'un vendeur a supprime sur son compte.
--
-- On garde desormais la ligne, marquee supprimee. Les deux colonnes sont
-- nullables : l'ancien code continue de tourner tel quel pendant le deploiement.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

-- Toutes les listes filtrent desormais sur deletedAt IS NULL.
CREATE INDEX IF NOT EXISTS "Project_workspaceId_deletedAt_idx"
  ON "Project"("workspaceId", "deletedAt");
