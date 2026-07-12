-- Unicité de la référence par workspace (numérotation légale FR : séquence continue, pas de doublon).
-- NB : reference est nullable ; en Postgres les NULL sont considérés distincts, donc les
-- brouillons sans référence ne provoquent pas de conflit.
-- Si cette migration échoue à cause de doublons existants, dédoublonner d'abord les
-- références en base puis relancer le déploiement.
CREATE UNIQUE INDEX "Quote_workspaceId_reference_key" ON "Quote"("workspaceId", "reference");
CREATE UNIQUE INDEX "Invoice_workspaceId_reference_key" ON "Invoice"("workspaceId", "reference");
