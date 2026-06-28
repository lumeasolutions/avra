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
    data[table] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM "${table}" WHERE "workspaceId" = $1`,
      workspaceId,
    );
  }

  const ws = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, name, slug, plan, "isActive", "createdAt" FROM "Workspace" WHERE id = ${workspaceId} LIMIT 1;
  `;
  const members = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT u.email, u."firstName", u."lastName", u."createdAt", uw.role
    FROM "UserWorkspace" uw JOIN "User" u ON u.id = uw."userId"
    WHERE uw."workspaceId" = ${workspaceId};
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
  await prisma.$transaction(
    DELETE_ORDER.map((table) =>
      prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "workspaceId" = $1`, workspaceId),
    ),
  );
  return counts;
}
