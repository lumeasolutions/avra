/**
 * journal-api.ts — journal d'activité de l'équipe, réservé à l'administrateur.
 *
 * Le serveur enregistre chaque écriture : qui, quand, sur quelle route, et sur
 * quel dossier le cas échéant. Aucune donnée métier n'y figure — ni contenu de
 * formulaire, ni réponse — seulement de quoi répondre à « qu'a fait ce vendeur
 * aujourd'hui ? ».
 *
 * La route brute (`POST /dossiers/:id/documents`) ne veut rien dire pour un
 * cuisiniste : `libelleActivite` la traduit en français.
 */
import { api } from './api';

export interface LigneJournal {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  changes?: { chemin?: string; methode?: string; entityId?: string } | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  project?: { id: string; name: string } | null;
}

export interface PageJournal {
  data: LigneJournal[];
  total: number;
  page: number;
  pageSize: number;
}

export function listerJournal(params: { userId?: string; page?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.userId) q.set('userId', params.userId);
  if (params.page) q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 40));
  return api<PageJournal>(`/audit?${q.toString()}`);
}

/**
 * Route + méthode → phrase lisible.
 *
 * On traduit ce qu'on reconnaît, et on affiche la route telle quelle pour le
 * reste : mieux vaut une ligne un peu technique qu'une ligne absente, et ça
 * signale ce qui mérite d'être traduit ensuite.
 */
export function libelleActivite(l: LigneJournal): string {
  const chemin = l.changes?.chemin ?? '';
  const verbe = l.action === 'CREATE' ? 'créé' : l.action === 'DELETE' ? 'supprimé' : 'modifié';

  const REGLES: Array<[RegExp, string]> = [
    [/\/projects\/:id\/dossier-data$/, 'a mis à jour un dossier'],
    [/\/projects\/:id\/sign$/, 'a signé un dossier'],
    [/\/projects\/:id\/terminate$/, 'a terminé un dossier'],
    [/\/projects\/:id\/restore$/, 'a restauré un dossier'],
    [/\/projects\/:id$/, `a ${verbe} un dossier`],
    [/\/projects(\/with-client)?$/, 'a créé un dossier'],
    [/\/dossiers\/:id\/documents/, `a ${verbe} un document de dossier`],
    [/\/documents\/admin/, `a ${verbe} un document administratif`],
    [/\/events/, `a ${verbe} un rendez-vous`],
    [/\/quotes/, `a ${verbe} un devis`],
    [/\/invoices/, `a ${verbe} une facture`],
    [/\/payments/, `a ${verbe} un paiement`],
    [/\/clients/, `a ${verbe} une fiche client`],
    [/\/stock/, `a ${verbe} une référence de stock`],
    [/\/intervenants/, `a ${verbe} un intervenant`],
    [/\/demandes/, `a ${verbe} une demande intervenant`],
    [/\/team\/invitations/, `a ${verbe} une invitation`],
    [/\/team\/members/, `a ${verbe} un membre de l’équipe`],
    [/\/settings/, 'a modifié les réglages'],
    [/\/ia\//, 'a lancé une génération IA'],
    [/\/signature/, `a ${verbe} une signature électronique`],
  ];

  for (const [motif, phrase] of REGLES) if (motif.test(chemin)) return phrase;
  return chemin ? `${verbe} — ${chemin}` : `a ${verbe} un élément`;
}

/** Nom affichable de l'auteur. */
export function auteurJournal(l: LigneJournal): string {
  const u = l.user;
  if (!u) return 'Compte supprimé';
  const nom = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return nom || u.email;
}
