-- Unicité de la référence de commande fournisseur par workspace.
-- NB : reference est nullable ; en Postgres les NULL sont considérés distincts,
-- donc plusieurs commandes sans référence restent autorisées.
--
-- Étape 1 — Dédoublonnage préalable (idempotent) : s'il existe déjà des
-- références dupliquées (données de test/héritage), on conserve la PLUS ANCIENNE
-- inchangée et on suffixe les suivantes (`-DUP2`, `-DUP3`…) pour rendre l'index
-- unique créable, SANS perte de données.
WITH d AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workspaceId", "reference" ORDER BY "createdAt", id) AS rn
  FROM "SupplierOrder" WHERE "reference" IS NOT NULL
)
UPDATE "SupplierOrder" s SET "reference" = s."reference" || '-DUP' || d.rn
FROM d WHERE s.id = d.id AND d.rn > 1;

-- Étape 2 — Index unique.
CREATE UNIQUE INDEX "SupplierOrder_workspaceId_reference_key" ON "SupplierOrder"("workspaceId", "reference");
