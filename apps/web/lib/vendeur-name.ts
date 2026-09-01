/**
 * resolveVendeurName — SOURCE UNIQUE de résolution du nom de vendeur pour
 * l'utilisateur connecté. Utilisée à la création d'un dossier, pour
 * l'appartenance (useDossierPermissions), pour le sélecteur d'attribution et
 * partout où l'on doit désigner « le vendeur = moi ».
 *
 * Priorité :
 *   1. Membre configuré dont l'email correspond à celui de l'utilisateur —
 *      MAIS uniquement si ce match est NON AMBIGU (exactement un membre avec
 *      cet email). Dès que plusieurs membres partagent l'adresse (données de
 *      test, ou plusieurs vendeurs sur une même boîte mail), on ne peut pas
 *      choisir de façon fiable → on retombe sur le nom réel de l'utilisateur.
 *   2. firstName + lastName.
 *   3. Partie locale de l'email (avant @).
 *   4. undefined si pas connecté / rien d'exploitable.
 *
 * Historique (bug corrigé) : la résolution d'origine prenait le PREMIER membre
 * matchant l'email. Quand plusieurs membres partageaient l'adresse, elle
 * renvoyait un nom de membre arbitraire au lieu du nom réel — ce qui bloquait
 * notamment l'attribution d'un dossier au propriétaire depuis le sélecteur
 * (l'option « Vous » n'était jamais injectée car le nom résolu coïncidait déjà
 * avec un membre de la liste).
 */

export interface VendeurNameUser {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface VendeurNameMember {
  email?: string | null;
  name?: string | null;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

export function resolveVendeurName(
  user: VendeurNameUser | null | undefined,
  members: VendeurNameMember[] | null | undefined,
): string | undefined {
  if (!user) return undefined;
  const email = norm(user.email);
  if (email && members && members.length) {
    const matches = members.filter((m) => norm(m.email) === email && !!m.name?.trim());
    // Non ambigu uniquement : un seul membre avec cet email.
    if (matches.length === 1) return matches[0].name!.trim();
  }
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (full) return full;
  const local = user.email ? user.email.split('@')[0]?.trim() : '';
  return local || undefined;
}
