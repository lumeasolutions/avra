/**
 * support-data.ts — Briques de données partagées par le portail support (V2).
 *
 * Trois opérations sur le périmètre d'UN workspace client :
 *   • collectWorkspaceSnapshot : export complet (RGPD / sauvegarde avant reset)
 *   • countWorkspaceData       : compteurs (réponse reset + audit)
 *   • deleteWorkspaceData      : remise à zéro (transaction, ordre FK sûr)
 *
 * deleteWorkspaceData CONSERVE le compte, le workspace, le lien de connexion
 * (UserWorkspace) et les réglages (WorkspaceSettings) : le client peut se
 * reconnecter sur un espace vierge. Les enfants partent en cascade (cf. FK).
 *
 * Toutes les requêtes sont paramétrées ($1) — pas d'injection possible. Les
 * noms de tables proviennent d'une liste codée en dur (jamais d'entrée user).
 */

import { prisma } from './prisma';

/** Tables métier exportées (toutes possèdent une colonne workspaceId). */
const SNAPSHOT_TABLES = [
  'Client', 'Project', 'Quote', 'Invoice', 'PaymentRequest', 'SignatureRequest',
  'Demande', 'Intervenant', 'Event', 'DossierDocument', 'Document',
  'StockItem', 'Supplier', 'SupplierOrder', 'IaJob', 'Notification',
] as const;

/**
 * Ordre de suppression : Project AVANT Client (FK RESTRICT). Le reste part en
 * cascade, mais on supprime explicitement par workspaceId pour garantir le 0.
 */
const DELETE_ORDER = [
  'Project', 'Demande', 'Intervenant', 'Event', 'SupplierOrder', 'StockItem',
  'Supplier', 'Client', 'Document', 'DossierDocument', 'DocumentAuditLog',
  'IaJob', 'StoredFile', 'Notification', 'AuditLog', 'AutomationRule',
  'Quote', 'Invoice', 'PaymentRequest', 'SignatureRequest',
  'IntervenantDossier', 'IntervenantInvitation',
] as const;

/**
 * Colonnes considérées sensibles : jamais exportées ni affichées au support.
 * Couvre les jetons d'accès (portalToken, token de devis/facture), clés de
 * stockage, hash, secrets. Filtrage par NOM de colonne → protège aussi des
 * colonnes sensibles ajoutées plus tard au schéma (à condition d'être nommées
 * de façon parlante), ce qui évite le piège du `SELECT *` non auditable.
 */
const SENSITIVE_COL_RE = /(token|secret|hash|password|apikey|api_key|storagekey|webhook|refresh)/i;

/** Liste des colonnes « sûres » d'une table (catalogue Postgres, secrets exclus). */
export async function safeColumnList(table: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position;`;
  return rows.map((r) => r.column_name).filter((c) => !SENSITIVE_COL_RE.test(c));
}

/** Construit un fragment `"col1", "col2", …` sûr (fallback `*` si table vide/inconnue). */
export async function safeSelectColumns(table: string): Promise<string> {
  const cols = await safeColumnList(table);
  return cols.length ? cols.map((c) => `"${c}"`).join(', ') : '*';
}

export interface WorkspaceSnapshot {
  exportedAt: string;
  workspace: Record<string, unknown> | null;
  members: Array<Record<string, unknown>>;
  data: Record<string, Array<Record<string, unknown>>>;
}

/** Export complet des données métier d'un workspace (lecture seule). */
export async function collectWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const data: Record<string, Array<Record<string, unknown>>> = {};
  for (const table of SNAPSHOT_TABLES) {
    const colSql = await safeSelectColumns(table); // exclut jetons/secrets
    data[table] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${colSql} FROM "${table}" WHERE "workspaceId" = $1`,
      workspaceId,
    );
  }

  const ws = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, name, slug, plan, "isActive", "createdAt" FROM "Workspace" WHERE id = ${workspaceId} LIMIT 1;
  `;
  const members = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT u.email, u."firstName", u."lastName", u."createdAt", uw.role
    FROM "UserWorkspace" uw JOIN "User" u ON u.id = uw."userId"
    WHERE uw."workspaceId" = ${workspaceId}
    ORDER BY u."createdAt" ASC;
  `;

  return {
    exportedAt: new Date().toISOString(),
    workspace: ws[0] ?? null,
    members,
    data,
  };
}

/** Compteurs des principales entités d'un workspace. */
export async function countWorkspaceData(workspaceId: string): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<Array<Record<string, number>>>`
    SELECT
      (SELECT count(*)::int FROM "Project"         WHERE "workspaceId" = ${workspaceId}) AS "dossiers",
      (SELECT count(*)::int FROM "Client"          WHERE "workspaceId" = ${workspaceId}) AS "clients",
      (SELECT count(*)::int FROM "Quote"           WHERE "workspaceId" = ${workspaceId}) AS "devis",
      (SELECT count(*)::int FROM "Invoice"         WHERE "workspaceId" = ${workspaceId}) AS "factures",
      (SELECT count(*)::int FROM "Demande"         WHERE "workspaceId" = ${workspaceId}) AS "demandes",
      (SELECT count(*)::int FROM "Intervenant"     WHERE "workspaceId" = ${workspaceId}) AS "intervenants",
      (SELECT count(*)::int FROM "Event"           WHERE "workspaceId" = ${workspaceId}) AS "agenda",
      (SELECT count(*)::int FROM "DossierDocument" WHERE "workspaceId" = ${workspaceId}) AS "documents",
      (SELECT count(*)::int FROM "IaJob"           WHERE "workspaceId" = ${workspaceId}) AS "rendus";
  `;
  return rows[0] ?? {};
}

/**
 * Vide toutes les données métier d'un workspace en UNE transaction.
 * Retourne les compteurs supprimés (mesurés avant suppression).
 * NE supprime PAS : Workspace, User, UserWorkspace, WorkspaceSettings.
 */
export async function deleteWorkspaceData(workspaceId: string): Promise<Record<string, number>> {
  const counts = await countWorkspaceData(workspaceId);
  // Forme interactive : exécute les DELETE séquentiellement dans l'ordre FK sûr,
  // dans UNE transaction. `timeout` n'est supporté QUE par cette forme (pas la
  // forme tableau) — marge pour les gros workspaces (défaut Prisma = 5 s).
  await prisma.$transaction(
    async (tx) => {
      for (const table of DELETE_ORDER) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "workspaceId" = $1`, workspaceId);
      }
    },
    { timeout: 30_000 },
  );
  return counts;
}
