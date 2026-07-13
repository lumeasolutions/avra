-- Unicité de la référence par workspace (numérotation légale FR : séquence continue, pas de doublon).
-- NB : reference est nullable ; en Postgres les NULL sont considérés distincts.
--
-- Étape 1 — Dédoublonnage préalable : s'il existe déjà des références dupliquées
-- (données de test/héritage), on conserve la PLUS ANCIENNE inchangée et on suffixe
-- les suivantes (`-DUP2`, `-DUP3`…) pour rendre l'index unique créable, SANS perte
-- de données. Idempotent : si aucun doublon, ces UPDATE n'affectent aucune ligne.
WITH d AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workspaceId", "reference" ORDER BY "createdAt", id) AS rn
  FROM "Quote" WHERE "reference" IS NOT NULL
)
UPDATE "Quote" q SET "reference" = q."reference" || '-DUP' || d.rn
FROM d WHERE q.id = d.id AND d.rn > 1;

WITH d AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workspaceId", "reference" ORDER BY "createdAt", id) AS rn
  FROM "Invoice" WHERE "reference" IS NOT NULL
)
UPDATE "Invoice" i SET "reference" = i."reference" || '-DUP' || d.rn
FROM d WHERE i.id = d.id AND d.rn > 1;

-- Étape 2 — Index uniques.
CREATE UNIQUE INDEX "Quote_workspaceId_reference_key" ON "Quote"("workspaceId", "reference");
CREATE UNIQUE INDEX "Invoice_workspaceId_reference_key" ON "Invoice"("workspaceId", "reference");
