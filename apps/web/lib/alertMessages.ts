/**
 * alertMessages.ts — phrases naturelles pour le moteur d'alertes IA AVRA.
 *
 * Demande user 26/05/2026 : "Chat assistant IA à droite à améliorer (exemple
 * pour les alertes 'plan technique dans 6j'), il faut que ce soit des phrases."
 *
 * Avant : `duval — "Plan technique" en retard de 6j` (télégraphique, technique)
 * Après : `Le plan technique du dossier duval était attendu il y a 6 jours.
 *          Une relance est nécessaire.` (phrase naturelle, action-orientée)
 *
 * Principes :
 *   - Vouvoiement professionnel
 *   - Durées en mots complets : "6 jours" (pas "6j"), "3 semaines", "1 mois"
 *   - Pluriels intelligents : "1 dossier" vs "3 dossiers"
 *   - Préfixes contextuels : ⚠ (urgent), ✓ (bonne nouvelle), 📞 (appel)
 *   - Verbe d'action intégré quand pertinent
 *
 * Pour ajouter une nouvelle alerte : créer une fonction `msgXxx(...)` ici,
 * puis remplacer le `text: ` dans useAlertEngine.ts par un appel.
 */

// ── Helpers d'unités ──────────────────────────────────────────────────────

/**
 * Formate une durée en jours en expression naturelle française.
 *  - 1 → "hier" / "demain" selon `tense` ('past' | 'future')
 *  - 2 → "avant-hier" / "après-demain"
 *  - 3-6 → "X jours"
 *  - 7-13 → "1 semaine" / "X jours" selon préférence
 *  - 14-29 → "X semaines"
 *  - 30-59 → "1 mois" / "1 mois et demi"
 *  - 60+ → "X mois"
 *  - 365+ → "1 an" / "X ans"
 */
export function formatDuration(days: number, tense: 'past' | 'future' = 'past'): string {
  const n = Math.abs(Math.round(days));
  if (n === 0) return "aujourd'hui";
  if (n === 1) return tense === 'past' ? 'hier' : 'demain';
  if (n === 2) return tense === 'past' ? 'avant-hier' : 'après-demain';
  if (n < 7) return `${n} jours`;
  if (n < 14) {
    const remainder = n - 7;
    if (remainder === 0) return '1 semaine';
    return `${n} jours`; // 8-13 jours : plus précis qu'une approximation
  }
  if (n < 30) {
    const weeks = Math.round(n / 7);
    return weeks === 1 ? '1 semaine' : `${weeks} semaines`;
  }
  if (n < 60) {
    if (n < 45) return '1 mois';
    return '1 mois et demi';
  }
  if (n < 365) {
    const months = Math.round(n / 30);
    return months === 1 ? '1 mois' : `${months} mois`;
  }
  const years = Math.round(n / 365);
  return years === 1 ? '1 an' : `${years} ans`;
}

/** Forme courte "5j" / "3 sem." / "2 mois" — utile dans les badges compacts. */
export function formatDurationCompact(days: number): string {
  const n = Math.abs(Math.round(days));
  if (n < 7) return `${n}j`;
  if (n < 30) return `${Math.round(n / 7)} sem.`;
  if (n < 365) return `${Math.round(n / 30)} mois`;
  return `${Math.round(n / 365)} an${Math.round(n / 365) > 1 ? 's' : ''}`;
}

/** "1 dossier" / "3 dossiers" — gère le pluriel français standard. */
export function formatPlural(n: number, singular: string, plural?: string): string {
  const word = n > 1 ? (plural ?? singular + 's') : singular;
  return `${n} ${word}`;
}

/** Formate un montant en euros avec séparateur de milliers. */
export function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Nom propre normalisé : première lettre majuscule, reste lower si tout en upper. */
function cleanName(n: string): string {
  if (!n) return '';
  const trimmed = n.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    // Tout en majuscules → on capitalise proprement
    return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
  }
  return trimmed;
}

/** "Plan technique" → "plan technique" pour usage en milieu de phrase. */
function lowerLabel(label: string): string {
  return label.trim().toLowerCase();
}

// ── 1. Alertes dossiers : dates butoires ──────────────────────────────────

export function msgButoirRetard(dossierName: string, label: string, daysLate: number): string {
  const dur = formatDuration(daysLate, 'past');
  if (daysLate === 1) {
    return `⚠ Le ${lowerLabel(label)} du dossier ${cleanName(dossierName)} était attendu hier. Une relance s'impose.`;
  }
  if (daysLate <= 3) {
    return `⚠ Le ${lowerLabel(label)} du dossier ${cleanName(dossierName)} est en retard depuis ${dur}. Action recommandée rapidement.`;
  }
  return `⚠ Le ${lowerLabel(label)} du dossier ${cleanName(dossierName)} était attendu il y a ${dur}. Une relance est nécessaire.`;
}

export function msgButoirProche(dossierName: string, label: string, daysUntil: number): string {
  if (daysUntil === 0) {
    return `Aujourd'hui : le ${lowerLabel(label)} doit être finalisé chez ${cleanName(dossierName)}.`;
  }
  if (daysUntil === 1) {
    return `Demain : ${lowerLabel(label)} à effectuer pour le dossier ${cleanName(dossierName)}.`;
  }
  if (daysUntil === 2) {
    return `Après-demain : ${lowerLabel(label)} à effectuer chez ${cleanName(dossierName)}.`;
  }
  return `Plus que ${formatPlural(daysUntil, 'jour')} avant l'échéance du ${lowerLabel(label)} chez ${cleanName(dossierName)}.`;
}

// ── 2. Acompte ────────────────────────────────────────────────────────────

export function msgAcompteNonRecu(dossierName: string, daysSinceSign: number): string {
  const dur = formatDuration(daysSinceSign, 'past');
  return `Le dossier ${cleanName(dossierName)} est signé depuis ${dur}, mais l'acompte n'est pas encore reçu. Pensez à relancer le client.`;
}

// ── 3. Confirmation fournisseur ───────────────────────────────────────────

export function msgConfirmationEnAttente(
  dossierName: string,
  fournisseur: string,
  daysSinceButoir: number,
): string {
  const dur = formatDuration(daysSinceButoir, 'past');
  return `📞 Vous attendez la confirmation de ${cleanName(fournisseur)} depuis ${dur} sur le dossier ${cleanName(dossierName)}. Un appel s'impose.`;
}

// ── 4. Dossier inactif ────────────────────────────────────────────────────

export function msgDossierInactif(dossierName: string, daysSinceCreation: number): string {
  const dur = formatDuration(daysSinceCreation, 'past');
  return `Le dossier ${cleanName(dossierName)} n'a pas évolué depuis ${dur}. Une prise de contact pourrait le relancer.`;
}

// ── 5. Nouveau dossier ────────────────────────────────────────────────────

export function msgNouveauDossier(dossierName: string): string {
  return `Nouveau dossier ajouté : ${cleanName(dossierName)}. Pensez à programmer le premier rendez-vous.`;
}

// ── 6. Dossier urgent ─────────────────────────────────────────────────────

export function msgDossierUrgent(dossierName: string): string {
  return `⚠ Le dossier ${cleanName(dossierName)} est marqué URGENT — donnez-lui la priorité.`;
}

// ── 7. Factures ───────────────────────────────────────────────────────────

export function msgFactureEcheanceDepassee(
  ref: string,
  client: string,
  daysLate: number,
): string {
  const dur = formatDuration(daysLate, 'past');
  return `⚠ La facture ${ref} de ${cleanName(client)} a ${dur} de retard de paiement. Une relance ferme est conseillée.`;
}

export function msgFactureEnRetard(ref: string, client: string, daysLate: number): string {
  if (daysLate <= 0) {
    return `La facture ${ref} de ${cleanName(client)} est marquée en retard de paiement.`;
  }
  const dur = formatDuration(daysLate, 'past');
  return `La facture ${ref} de ${cleanName(client)} est en retard de paiement depuis ${dur}.`;
}

export function msgAcompteEnAttente(ref: string, client: string, daysSinceInv: number): string {
  const dur = formatDuration(daysSinceInv, 'past');
  return `L'acompte ${ref} de ${cleanName(client)} est en attente depuis ${dur}. Pensez à le réclamer.`;
}

// ── 8. Paiement reçu (bonne nouvelle) ─────────────────────────────────────

export function msgPaiementRecu(client: string, amount: number, method: string): string {
  return `✓ Bonne nouvelle ! Vous avez reçu ${formatAmount(amount)} de ${cleanName(client)} par ${method.toLowerCase()}.`;
}

// ── 9. Devis ──────────────────────────────────────────────────────────────

export function msgDevisExpire(ref: string, client: string, daysSinceExpiry: number): string {
  const dur = formatDuration(daysSinceExpiry, 'past');
  return `Le devis ${ref} pour ${cleanName(client)} a expiré il y a ${dur}. Voulez-vous le relancer ou le réémettre ?`;
}

export function msgDevisEnAttenteSignature(
  ref: string,
  client: string,
  daysSinceCreation: number,
): string {
  const dur = formatDuration(daysSinceCreation, 'past');
  return `Le devis ${ref} pour ${cleanName(client)} attend une signature depuis ${dur}. Une relance pourrait débloquer.`;
}

export function msgDevisRefuse(ref: string, client: string): string {
  return `Le devis ${ref} de ${cleanName(client)} a été refusé. Un suivi peut être utile pour comprendre les raisons.`;
}

// ── 10. Planning ──────────────────────────────────────────────────────────

export function msgRdvDemain(startHour: number, title: string): string {
  return `Demain à ${startHour}h : ${title}. Vérifiez que tout est prêt.`;
}

export function msgRdvDemainTypé(
  startHour: number,
  typeLabel: string,
  client: string,
): string {
  return `Demain à ${startHour}h, vous avez ${typeLabel.toLowerCase()} prévue chez ${cleanName(client)}.`;
}

export function msgVisiteChantierNonEffectuee(client: string): string {
  return `La visite de chantier chez ${cleanName(client)} n'a pas encore été effectuée. Pensez à reprogrammer.`;
}

export function msgConflitPlanning(titles: string[], dayLabel: string, hour: number): string {
  const list = titles.length > 2
    ? `${titles.slice(0, -1).join(', ')} et ${titles[titles.length - 1]}`
    : titles.join(' et ');
  return `⚠ Conflit de planning : ${list} sont programmés en même temps (${dayLabel} ${hour}h). À arbitrer.`;
}

// ── 11. Stock ─────────────────────────────────────────────────────────────

export function msgStockCritique(
  supplier: string,
  model: string,
  quantity: number,
  minQuantity: number,
): string {
  return `Stock critique : il ne reste que ${formatPlural(quantity, 'unité')} de ${cleanName(supplier)} ${model} (seuil minimum : ${minQuantity}). Une commande s'impose.`;
}

export function msgRuptureStock(supplier: string, model: string): string {
  return `⚠ Rupture de stock : ${cleanName(supplier)} ${model} doit être recommandé sans tarder.`;
}

// ── 12. Commandes ─────────────────────────────────────────────────────────

export function msgCommandeEnAttente(
  ref: string,
  fournisseur: string,
  daysSinceCmd: number,
): string {
  const dur = formatDuration(daysSinceCmd, 'past');
  return `La commande ${ref} chez ${cleanName(fournisseur)} est en attente depuis ${dur}. Une relance peut être utile.`;
}

export function msgLivraisonEnRetard(
  fournisseur: string,
  ref: string,
  daysLate: number,
): string {
  const dur = formatDuration(daysLate, 'past');
  return `⚠ Livraison en retard : ${cleanName(fournisseur)} (commande ${ref}) était prévue il y a ${dur}. Contactez le fournisseur.`;
}

export function msgCommandeAnnulee(fournisseur: string, ref: string): string {
  return `La commande ${ref} chez ${cleanName(fournisseur)} a été annulée. Un nouveau fournisseur est peut-être à trouver.`;
}

// ── 13. Intervenants ──────────────────────────────────────────────────────

export function msgInterventsDossiersAClasser(name: string, count: number): string {
  return `${cleanName(name)} a ${formatPlural(count, 'dossier')} en attente de classement.`;
}

export function msgIntervenantCoordonneesIncompletes(name: string): string {
  return `Coordonnées incomplètes pour ${cleanName(name)} — il manque l'email ou le téléphone.`;
}

// ── 14. Rappels J-14 / J-7 / J-3 ──────────────────────────────────────────

export function msgRappelJ14(dossierName: string, label: string): string {
  return `Dans 2 semaines : ${lowerLabel(label)} pour le dossier ${cleanName(dossierName)}. Pensez à anticiper.`;
}

export function msgRappelJ7(dossierName: string, label: string): string {
  return `Dans 1 semaine : ${lowerLabel(label)} à effectuer pour le dossier ${cleanName(dossierName)}.`;
}

export function msgRappelJ3(dossierName: string, label: string): string {
  return `⚠ Plus que 3 jours : ${lowerLabel(label)} à finaliser chez ${cleanName(dossierName)} !`;
}

// ── 15. Relances historique ───────────────────────────────────────────────

export function msgRelance(typeLabel: string, message: string): string {
  return `${typeLabel} envoyée : ${message}`;
}
