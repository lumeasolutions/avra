'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useDossierStore } from '@/store/useDossierStore';
import { useFacturationStore } from '@/store/useFacturationStore';
import { usePlanningStore } from '@/store/usePlanningStore';
import { useStockStore } from '@/store/useStockStore';
import { useIntervenantStore } from '@/store/useIntervenantStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useDemandesStore } from '@/store/useDemandesStore';
import type { AlertItem, AlertSeverity, AlertCategory, AlertAction } from '@/store/useUIStore';
import {
  msgButoirRetard, msgButoirProche,
  msgAcompteNonRecu, msgConfirmationEnAttente,
  msgDossierInactif, msgNouveauDossier, msgDossierUrgent,
  msgFactureEcheanceDepassee, msgFactureEnRetard, msgAcompteEnAttente,
  msgPaiementRecu,
  msgDevisExpire, msgDevisEnAttenteSignature, msgDevisRefuse,
  msgRdvDemain, msgRdvDemainTypé, msgVisiteChantierNonEffectuee, msgConflitPlanning,
  msgStockCritique, msgRuptureStock,
  msgCommandeEnAttente, msgLivraisonEnRetard, msgCommandeAnnulee,
  msgInterventsDossiersAClasser, msgIntervenantCoordonneesIncompletes,
  msgRappelJ14, msgRappelJ7, msgRappelJ3,
  msgRelance,
} from '@/lib/alertMessages';
import { echeanceAnchor } from '@/lib/alertClassify';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "dd/mm/yyyy" → Date (ou null si invalide) */
function parseFR(str?: string): Date | null {
  if (!str) return null;
  // Supporte dd/mm/yyyy et yyyy-mm-dd
  const parts = str.includes('/') ? str.split('/') : null;
  if (parts && parts.length === 3) {
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD → parse en LOCAL (pas UTC) pour éviter un décalage de jour selon
  // le fuseau. `new Date("2026-07-05")` serait minuit UTC ; on veut minuit local.
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Nombre de jours entre deux dates (positif = passé) */
function daysSince(date: Date, from: Date = new Date()): number {
  return Math.floor((from.getTime() - date.getTime()) / 86_400_000);
}

/** Date d'aujourd'hui à minuit */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Demain à minuit */
function tomorrow(): Date {
  const d = today();
  d.setDate(d.getDate() + 1);
  return d;
}

/** Après-demain */
function dayAfterTomorrow(): Date {
  const d = today();
  d.setDate(d.getDate() + 2);
  return d;
}

type RawAlert = Omit<AlertItem, 'id' | 'createdAt' | 'dismissed'>;

// ── Le moteur ────────────────────────────────────────────────────────────────

function computeAlerts(): RawAlert[] {
  const alerts: RawAlert[] = [];
  const now = today();

  // ── Récupérer tous les états ──
  const { dossiers, dossiersSignes, datesButoiresSignes, echeancesValidees, commandesAccess } = useDossierStore.getState();
  const { invoices, invoiceDetails, devis, payments } = useFacturationStore.getState();
  const { planningEvents, gestEvents } = usePlanningStore.getState();
  const { stockItems, commandes } = useStockStore.getState();
  const { intervenants } = useIntervenantStore.getState();
  const { relances } = useHistoryStore.getState();
  const { relanceConfig, notifConfig, alertesConfig } = useConfigStore.getState();
  const ac: any = alertesConfig ?? {};

  // P4 — exclure les dossiers signés terminés / archivés (réduit le bruit).
  const activeSignes = dossiersSignes.filter((ds) => !ds.terminated && !ds.archivedAt);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DOSSIERS
  // ═══════════════════════════════════════════════════════════════════════════

  // #1 — Date butoir dépassée ou proche (dossiers signés) — utilise datesButoiresSignes
  for (const ds of activeSignes) {
    const savedDates = datesButoiresSignes[ds.id] ?? {};
    // Aussi vérifier l'ancien système dateButoires pour la rétrocompatibilité
    const legacyDates: Record<string, string> = {};
    // P5 — ne lire le legacy QUE si le nouveau système est vide (évite les doublons).
    if (ds.dateButoires && Object.keys(savedDates).length === 0) {
      const labels: Record<string, string> = {
        suiviChantier: 'Suivi chantier',
        releveMesures: 'Relevé de mesures',
        planTechnique: 'Plan technique',
        fichePose: 'Fiche de pose',
        permisConstruire: 'Permis de construire',
        sav: 'SAV',
      };
      for (const [key, label] of Object.entries(labels)) {
        const v = (ds.dateButoires as Record<string, string | undefined>)[key];
        if (v) legacyDates[label] = v;
      }
    }

    // Nouveau système
    for (const [label, dateStr] of Object.entries(savedDates)) {
      const date = parseFR(dateStr);
      if (!date) continue;
      // Drapeau "validé (fait)". true = fait → aucune alerte. false = échéance
      // réelle non faite → peut être en retard. undefined = legacy → traité comme
      // fait (pas de faux retard sur l'historique), mais on garde le rappel futur.
      // SEULE VÉRITÉ = le bouton « Validé » (echeancesValidees). Tant qu'il n'est
      // pas coché (false OU absent), l'échéance reste active : passée = retard,
      // proche = rappel. Rien ne s'auto-valide avec le temps.
      const validated = echeancesValidees[ds.id]?.[label];
      if (validated === true) continue;
      const daysUntil = -daysSince(date, now); // positif = dans le futur
      const daysLate = daysSince(date, now);
      if (daysLate > 0 && ac.onButoirDepassee !== false) {
        alerts.push({
          severity: 'error',
          category: 'dossier',
          text: msgButoirRetard(ds.name, label, daysLate),
          dossierId: ds.id,
          sourceKey: `butoir-${ds.id}-${label}`,
          anchor: echeanceAnchor(label),
          autoGenerated: true,
          actions: [
            { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
            { label: 'Relancer client', action: 'relance_client' },
          ],
        });
      } else if (daysUntil >= 0 && daysUntil <= (ac.echeanceProche ?? 7)) {
        alerts.push({
          severity: 'warning',
          category: 'dossier',
          text: msgButoirProche(ds.name, label, daysUntil),
          dossierId: ds.id,
          sourceKey: `butoir-soon-${ds.id}-${label}`,
          anchor: echeanceAnchor(label),
          autoGenerated: true,
          actions: [{ label: 'Voir dossier', href: `/dossiers/${ds.id}` }],
        });
      }
    }

    // Système legacy (ds.dateButoires) — même règle que le "legacy" du nouveau
    // système : date passée = considérée FAITE (aucun faux retard sur l'historique),
    // échéance future proche = simple rappel urgent.
    for (const [label, dateStr] of Object.entries(legacyDates)) {
      const date = parseFR(dateStr);
      if (!date) continue;
      const daysUntil = -daysSince(date, now); // positif = dans le futur
      if (daysUntil >= 0 && daysUntil <= (ac.echeanceProche ?? 7)) {
        alerts.push({
          severity: 'warning',
          category: 'dossier',
          text: msgButoirProche(ds.name, label, daysUntil),
          dossierId: ds.id,
          sourceKey: `butoir-soon-legacy-${ds.id}-${label}`,
          anchor: echeanceAnchor(label),
          autoGenerated: true,
          actions: [{ label: 'Voir dossier', href: `/dossiers/${ds.id}` }],
        });
      }
    }
  }

  // #2 — Acompte non reçu
  for (const ds of activeSignes) {
    const signedDate = parseFR(ds.signedDate);
    if (!signedDate) continue;
    const delai = ac.acompteNonRecu ?? relanceConfig.delaiAcompte ?? 7;
    if (ac.onAcompteNonRecu === false) continue;
    if (daysSince(signedDate, now) < delai) continue;
    // Vérifier s'il existe un paiement acompte pour ce dossier
    const hasAcompte = payments.some(
      p => p.dossierId === ds.id && p.type?.toLowerCase().includes('acompte') && p.statut === 'ENCAISSÉ'
    );
    if (!hasAcompte) {
      alerts.push({
        severity: 'warning',
        category: 'facturation',
        text: msgAcompteNonRecu(ds.name, daysSince(signedDate, now)),
        dossierId: ds.id,
        sourceKey: `acompte-${ds.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Envoyer relance', action: 'relance_acompte' },
          { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
        ],
      });
    }
  }

  // #3 — Confirmation fournisseur en attente
  for (const ds of activeSignes) {
    if (!ds.confirmations) continue;
    for (const conf of ds.confirmations) {
      if (conf.validee) continue;
      const dateButoir = parseFR(conf.dateButoir);
      if (ac.onConfirmationFournisseur !== false && dateButoir && daysSince(dateButoir, now) > (ac.confirmationFournisseur ?? 7)) {
        alerts.push({
          severity: 'warning',
          category: 'commande',
          text: msgConfirmationEnAttente(ds.name, conf.fournisseur, daysSince(dateButoir, now)),
          dossierId: ds.id,
          sourceKey: `conf-${ds.id}-${conf.id}`,
          anchor: `conf-${conf.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Appeler fournisseur', action: 'appeler_fournisseur' },
            { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
          ],
        });
      }
    }
  }

  // #3bis — Lignes de commande / confirmation / livraison (multi-fournisseurs).
  // Source : commandesAccess (saisi via le panneau ACCÉDER + extraction IA).
  // Chaque ligne a SA propre date butoir → une alerte par ligne. S'éteint dès
  // que la ligne est cochée "validée" dans le tableau de bord du dossier.
  for (const ds of activeSignes) {
    const labelMap = commandesAccess[ds.id];
    if (!labelMap) continue;
    for (const [stage, lignes] of Object.entries(labelMap)) {
      for (const ligne of lignes) {
        if (ligne.validee) continue;
        const date = parseFR(ligne.dateButoir);
        if (!date) continue;
        const who = ligne.fournisseur?.trim() || 'fournisseur';
        const daysLate = daysSince(date, now);
        const daysUntil = -daysLate; // positif = dans le futur
        if (daysLate > 0 && ac.onButoirDepassee !== false) {
          alerts.push({
            severity: 'error',
            category: 'commande',
            text: `${stage} en retard — ${ds.name} · ${who} · ${daysLate} j`,
            dossierId: ds.id,
            sourceKey: `cmdligne-${ds.id}-${ligne.id}`,
            autoGenerated: true,
            actions: [
              { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
              { label: 'Appeler fournisseur', action: 'appeler_fournisseur' },
            ],
          });
        } else if (daysUntil >= 0 && daysUntil <= (ac.echeanceProche ?? 7)) {
          alerts.push({
            severity: 'warning',
            category: 'commande',
            text: `${stage} — ${ds.name} · ${who} · dans ${daysUntil} j`,
            dossierId: ds.id,
            sourceKey: `cmdligne-soon-${ds.id}-${ligne.id}`,
            autoGenerated: true,
            actions: [{ label: 'Voir dossier', href: `/dossiers/${ds.id}` }],
          });
        }
      }
    }
  }

  // #4 — Dossier inactif > 30 jours
  for (const d of dossiers) {
    const created = parseFR(d.createdAt);
    if (ac.onDossierInactif !== false && created && daysSince(created, now) > (ac.dossierInactif ?? 30)) {
      alerts.push({
        severity: 'info',
        category: 'dossier',
        text: msgDossierInactif(d.name, daysSince(created, now)),
        dossierId: d.id,
        sourceKey: `inactif-${d.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Relancer', action: 'relance_client' },
          { label: 'Archiver', action: 'archiver_dossier' },
        ],
      });
    }
  }

  // #5 — Nouveau dossier créé (dans les 24 dernières heures)
  if (ac.onNouveauDossier ?? notifConfig.nouveauDossier) {
    for (const d of dossiers) {
      const created = parseFR(d.createdAt);
      if (created && daysSince(created, now) === 0) {
        alerts.push({
          severity: 'info',
          category: 'dossier',
          text: msgNouveauDossier(d.name),
          dossierId: d.id,
          sourceKey: `nouveau-${d.id}`,
          autoGenerated: true,
          actions: [{ label: 'Voir dossier', href: `/dossiers/${d.id}` }],
        });
      }
    }
  }

  // #6 — Dossier marqué URGENT
  for (const d of dossiers) {
    if (ac.onDossierUrgent !== false && d.status === 'URGENT') {
      alerts.push({
        severity: 'error',
        category: 'dossier',
        text: msgDossierUrgent(d.name),
        dossierId: d.id,
        sourceKey: `urgent-${d.id}`,
        autoGenerated: true,
        actions: [{ label: 'Voir dossier', href: `/dossiers/${d.id}` }],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FACTURATION
  // ═══════════════════════════════════════════════════════════════════════════

  // #7 — Facture en retard (dateEcheance dépassée)
  if (ac.onFactureEcheance ?? notifConfig.factureRetard) {
    for (const inv of invoices) {
      if (inv.statut === 'PAYÉE' || inv.statut === 'AVOIR' || inv.statut === 'RETARD') continue;
      const detail = invoiceDetails[inv.id];
      const echeance = parseFR(detail?.dateEcheance);
      if (echeance && echeance < now) {
        alerts.push({
          severity: 'error',
          category: 'facturation',
          text: msgFactureEcheanceDepassee(inv.ref, inv.client, daysSince(echeance, now)),
          dossierId: inv.dossierId,
          sourceKey: `facture-echeance-${inv.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Envoyer relance', action: 'relance_facture' },
            { label: 'Voir facture', href: '/facturation' },
          ],
        });
      }
    }
  }

  // #8 — Facture avec statut RETARD
  if (ac.onFactureRetard ?? notifConfig.factureRetard) {
    for (const inv of invoices) {
      if (inv.statut !== 'RETARD') continue;
      const dateInv = parseFR(inv.date);
      const retardJours = dateInv ? daysSince(dateInv, now) : 0;
      alerts.push({
        severity: 'error',
        category: 'facturation',
        text: msgFactureEnRetard(inv.ref, inv.client, retardJours),
        dossierId: inv.dossierId,
        sourceKey: `facture-retard-${inv.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Relance retard', action: 'relance_retard' },
          { label: 'Appeler client', action: 'appeler_client' },
          { label: 'Voir facture', href: '/facturation' },
        ],
      });
    }
  }

  // #9 — Facture d'acompte en attente trop longtemps
  for (const inv of invoices) {
    if (inv.type !== "Facture d'acompte" || inv.statut !== 'EN ATTENTE') continue;
    const dateInv = parseFR(inv.date);
    const delai = ac.acompteFacture ?? relanceConfig.delaiAcompte ?? 7;
    if (ac.onAcompteNonRecu !== false && dateInv && daysSince(dateInv, now) > delai) {
      alerts.push({
        severity: 'warning',
        category: 'facturation',
        text: msgAcompteEnAttente(inv.ref, inv.client, daysSince(dateInv, now)),
        dossierId: inv.dossierId,
        sourceKey: `acompte-facture-${inv.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Relancer', action: 'relance_acompte' },
          { label: 'Voir facture', href: '/facturation' },
        ],
      });
    }
  }

  // #10 — Paiement reçu (dans les 24h)
  if (ac.onPaiementRecu ?? notifConfig.paiementRecu) {
    for (const p of payments) {
      if (p.statut !== 'ENCAISSÉ') continue;
      const datePay = parseFR(p.date);
      if (datePay && daysSince(datePay, now) === 0) {
        alerts.push({
          severity: 'info',
          category: 'facturation',
          text: msgPaiementRecu(p.client, p.amount, p.method),
          dossierId: p.dossierId,
          sourceKey: `paiement-${p.id}`,
          autoGenerated: true,
          actions: [{ label: 'Voir facture', href: '/facturation' }],
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DEVIS
  // ═══════════════════════════════════════════════════════════════════════════

  // #11 — Devis expiré
  if (ac.onDevisExpire ?? notifConfig.devisExpire) {
    for (const d of devis) {
      if (d.statut === 'ACCEPTÉ' || d.statut === 'REFUSÉ' || d.statut === 'EXPIRÉ') continue;
      const validite = parseFR(d.dateValidite);
      if (validite && validite < now) {
        alerts.push({
          severity: 'warning',
          category: 'devis',
          text: msgDevisExpire(d.ref, d.client, daysSince(validite, now)),
          dossierId: d.dossierId,
          sourceKey: `devis-expire-${d.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Relancer client', action: 'relance_devis' },
            { label: 'Prolonger', action: 'prolonger_devis' },
            { label: 'Archiver', action: 'archiver_devis' },
          ],
        });
      }
    }
  }

  // #12 — Devis en attente de signature > 5 jours
  for (const d of devis) {
    if (d.signatureStatus !== 'EN_ATTENTE_SIGNATURE') continue;
    const dateCreation = parseFR(d.dateCreation);
    if (dateCreation && daysSince(dateCreation, now) > (ac.devisSignature ?? 5)) {
      alerts.push({
        severity: 'warning',
        category: 'devis',
        text: msgDevisEnAttenteSignature(d.ref, d.client, daysSince(dateCreation, now)),
        dossierId: d.dossierId,
        sourceKey: `devis-signature-${d.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Rappeler client', action: 'relance_signature' },
          { label: 'Renvoyer lien', action: 'renvoyer_lien' },
        ],
      });
    }
  }

  // #13 — Devis refusé
  for (const d of devis) {
    if (d.statut !== 'REFUSÉ' || ac.onDevisRefuse === false) continue;
    alerts.push({
      severity: 'info',
      category: 'devis',
      text: msgDevisRefuse(d.ref, d.client),
      dossierId: d.dossierId,
      sourceKey: `devis-refuse-${d.id}`,
      autoGenerated: true,
      actions: [
        { label: 'Analyser', href: '/facturation' },
        { label: 'Archiver en perdu', action: 'archiver_perdu' },
      ],
    });
  }

  // #13b — Devis envoyé sans réponse > 14 jours (repris de l'ancien useRelanceEngine)
  for (const d of devis) {
    if (d.statut !== 'ENVOYÉ') continue;
    const dateCreation = parseFR(d.dateCreation);
    if (dateCreation && daysSince(dateCreation, now) >= (ac.devisSansReponse ?? 14)) {
      const days = daysSince(dateCreation, now);
      alerts.push({
        severity: 'warning',
        category: 'devis',
        text: `Devis ${d.ref} sans réponse depuis ${days} j — ${d.client}`,
        dossierId: d.dossierId,
        sourceKey: `devis-sansreponse-${d.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Relancer client', action: 'relance_devis' },
          { label: 'Voir devis', href: '/facturation' },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PLANNING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const todayDay = now.getDay(); // 0=dim, 1=lun, ...
    const tomorrowDay = (todayDay + 1) % 7;

    // #14 — Intervention demain (planningEvents)
    for (const ev of planningEvents) {
      const evOffset = ev.weekOffset ?? 0;
      if ((ac.onRappelRdv ?? notifConfig.planningRappel) && evOffset === 0 && ev.day === tomorrowDay) {
        alerts.push({
          severity: 'clock',
          category: 'planning',
          text: msgRdvDemain(ev.startHour, ev.title),
          sourceKey: `planning-demain-${ev.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Voir planning', href: '/planning' },
          ],
        });
      }
    }

    // #15 — Intervention demain (gestEvents — livraisons, visites)
    for (const ev of gestEvents) {
      if ((ac.onRappelRdv ?? notifConfig.planningRappel) && ev.weekOffset === 0 && ev.day === tomorrowDay) {
        const typeLabel = ev.type === 'LIVRAISON' ? 'Livraison' :
                          ev.type === 'VISITE_CHANTIER' ? 'Visite chantier' :
                          ev.type === 'INSTALLATION' ? 'Installation' : ev.type;
        alerts.push({
          severity: 'clock',
          category: 'planning',
          text: msgRdvDemainTypé(ev.startHour, typeLabel, ev.client),
          sourceKey: `gestion-demain-${ev.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Voir planning', href: '/planning-gestion' },
            { label: 'Appeler poseur', action: 'appeler_poseur' },
          ],
        });
      }
    }

    // #16 — Visite chantier passée non faite (semaine précédente)
    for (const ev of gestEvents) {
      if (ev.type !== 'VISITE_CHANTIER') continue;
      if ((ac.onVisiteNonFaite !== false) && (ev.weekOffset === -1 || (ev.weekOffset === 0 && ev.day < todayDay))) {
        alerts.push({
          severity: 'warning',
          category: 'planning',
          text: msgVisiteChantierNonEffectuee(ev.client),
          sourceKey: `visite-manquee-${ev.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Replanifier', href: '/planning-gestion' },
          ],
        });
      }
    }

    // #17 — Conflit planning (2 events au même créneau)
    const slots = new Map<string, string[]>();
    for (const ev of planningEvents) {
      if ((ev.weekOffset ?? 0) !== 0) continue;
      for (let h = ev.startHour; h < ev.startHour + ev.duration; h++) {
        const key = `${ev.day}-${h}`;
        const existing = slots.get(key) || [];
        existing.push(ev.title);
        slots.set(key, existing);
      }
    }
    for (const [slot, titles] of slots.entries()) {
      if ((ac.onConflitPlanning !== false) && titles.length >= 2) {
        const [day, hour] = slot.split('-');
        alerts.push({
          severity: 'warning',
          category: 'planning',
          text: msgConflitPlanning(titles, ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][+day], +hour),
          sourceKey: `conflit-${slot}`,
          autoGenerated: true,
          actions: [{ label: 'Voir planning', href: '/planning' }],
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. STOCK & COMMANDES
  // ═══════════════════════════════════════════════════════════════════════════

  // #18 — Stock critique (orange)
  for (const item of stockItems) {
    if (ac.onStockCritique !== false && item.quantity != null && item.minQuantity != null && item.quantity > 0 && item.quantity <= item.minQuantity) {
      alerts.push({
        severity: 'warning',
        category: 'stock',
        text: msgStockCritique(item.supplier, item.model, item.quantity, item.minQuantity),
        sourceKey: `stock-critique-${item.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Commander', action: 'commander_stock' },
          { label: 'Voir stock', href: '/stock' },
        ],
      });
    }
  }

  // #19 — Rupture de stock (rouge)
  for (const item of stockItems) {
    if ((ac.onRupture !== false) && (item.dot === 'red' || (item.quantity != null && item.quantity === 0))) {
      alerts.push({
        severity: 'error',
        category: 'stock',
        text: msgRuptureStock(item.supplier, item.model),
        sourceKey: `stock-rupture-${item.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Commander en urgence', action: 'commander_urgence' },
          { label: 'Voir stock', href: '/stock' },
        ],
      });
    }
  }

  // #20 — Commande en attente > 3 jours
  if (ac.onCommandeAttente ?? notifConfig.commandeAttente) {
    for (const cmd of commandes) {
      if (cmd.statut !== 'EN ATTENTE') continue;
      const dateCmd = parseFR(cmd.dateCommande);
      if (dateCmd && daysSince(dateCmd, now) > (ac.commandeAttente ?? 3)) {
        alerts.push({
          severity: 'warning',
          category: 'commande',
          text: msgCommandeEnAttente(cmd.reference, cmd.fournisseur, daysSince(dateCmd, now)),
          dossierId: cmd.dossierId,
          sourceKey: `cmd-attente-${cmd.id}`,
          autoGenerated: true,
          actions: [
            { label: 'Confirmer', action: 'confirmer_commande' },
            { label: 'Relancer fournisseur', action: 'relance_fournisseur' },
          ],
        });
      }
    }
  }

  // #21 — Livraison en retard
  for (const cmd of commandes) {
    if (cmd.statut === 'LIVRÉE' || cmd.statut === 'ANNULÉE' || ac.onLivraisonRetard === false) continue;
    const dateLiv = parseFR(cmd.dateLivraison);
    if (dateLiv && dateLiv < now) {
      alerts.push({
        severity: 'error',
        category: 'commande',
        text: msgLivraisonEnRetard(cmd.fournisseur, cmd.reference, daysSince(dateLiv, now)),
        dossierId: cmd.dossierId,
        sourceKey: `cmd-livraison-${cmd.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Appeler fournisseur', action: 'appeler_fournisseur' },
        ],
      });
    }
  }

  // #22 — Commande annulée
  for (const cmd of commandes) {
    if (cmd.statut !== 'ANNULÉE') continue;
    const dateCmd = parseFR(cmd.dateCommande);
    if (ac.onCommandeAnnulee !== false && dateCmd && daysSince(dateCmd, now) < 7) {
      alerts.push({
        severity: 'info',
        category: 'commande',
        text: msgCommandeAnnulee(cmd.fournisseur, cmd.reference),
        dossierId: cmd.dossierId,
        sourceKey: `cmd-annulee-${cmd.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Nouvelle commande', action: 'nouvelle_commande' },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. INTERVENANTS
  // ═══════════════════════════════════════════════════════════════════════════

  // #23 — Intervenant avec dossier(s) "A CLASSER" depuis longtemps
  for (const interv of intervenants) {
    const aClasser = interv.dossiers.filter(d => d.statut === 'A CLASSER');
    if (ac.onDossiersAClasser !== false && aClasser.length > 0) {
      alerts.push({
        severity: 'warning',
        category: 'intervenant',
        text: msgInterventsDossiersAClasser(interv.name, aClasser.length),
        sourceKey: `interv-aclasser-${interv.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Voir intervenants', href: '/intervenants' },
        ],
      });
    }
  }

  // #24 — Intervenant sans email/phone (données incomplètes)
  for (const interv of intervenants) {
    if ((ac.onCoordonneesIncompletes !== false) && !interv.email && !interv.phone) {
      alerts.push({
        severity: 'info',
        category: 'intervenant',
        text: msgIntervenantCoordonneesIncompletes(interv.name),
        sourceKey: `interv-incomplet-${interv.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Compléter', href: '/intervenants' },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. RELANCES AUTOMATIQUES
  // ═══════════════════════════════════════════════════════════════════════════

  // #24b — Relances automatiques hebdomadaires pour dates butoires
  // Si une date butoire est définie et dans moins de 21j, rappel hebdo automatique
  for (const ds of activeSignes) {
    const savedDates = datesButoiresSignes[ds.id] ?? {};
    for (const [label, dateStr] of Object.entries(savedDates)) {
      const date = parseFR(dateStr);
      if (!date) continue;
      const daysUntil = -daysSince(date, now);
      // Rappel si dans 14j, 7j ou 3j (niveaux de relance)
      if (daysUntil === (ac.rappelJ1 ?? 14)) {
        alerts.push({
          severity: 'info',
          category: 'relance',
          text: msgRappelJ14(ds.name, label),
          dossierId: ds.id,
          sourceKey: `relance-auto-j14-${ds.id}-${label}`,
          autoGenerated: true,
          actions: [{ label: 'Voir dossier', href: `/dossiers/${ds.id}` }],
        });
      } else if (daysUntil === (ac.rappelJ2 ?? 7)) {
        alerts.push({
          severity: 'warning',
          category: 'relance',
          text: msgRappelJ7(ds.name, label),
          dossierId: ds.id,
          sourceKey: `relance-auto-j7-${ds.id}-${label}`,
          autoGenerated: true,
          actions: [
            { label: 'Relancer client', action: 'relance_client' },
            { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
          ],
        });
      } else if (daysUntil === (ac.rappelJ3 ?? 3)) {
        alerts.push({
          severity: 'error',
          category: 'relance',
          text: msgRappelJ3(ds.name, label),
          dossierId: ds.id,
          sourceKey: `relance-auto-j3-${ds.id}-${label}`,
          autoGenerated: true,
          actions: [
            { label: 'Relancer client', action: 'relance_client' },
            { label: 'Appeler client', action: 'appeler_client' },
            { label: 'Voir dossier', href: `/dossiers/${ds.id}` },
          ],
        });
      }
    }
  }

  // #25, #26, #27 — Relances actives à envoyer
  for (const rel of relances) {
    if (rel.status !== 'active') continue;
    const nextDate = parseFR(rel.dateNextRelance);
    if (nextDate && nextDate <= now) {
      const sevMap: Record<string, AlertSeverity> = {
        acompte: 'warning',
        confirmation: 'warning',
        dossier_vente: 'warning',
        date_butoire: 'error',
      };
      const labelMap: Record<string, string> = {
        acompte: 'Relance acompte',
        confirmation: 'Relance confirmation',
        dossier_vente: 'Relance solde',
        date_butoire: 'Relance date butoir',
      };
      alerts.push({
        severity: sevMap[rel.type] ?? 'warning',
        category: 'relance',
        text: msgRelance(labelMap[rel.type] ?? 'Relance', rel.message),
        dossierId: rel.dossierId,
        sourceKey: `relance-${rel.id}`,
        autoGenerated: true,
        actions: [
          { label: 'Envoyer relance', action: 'envoyer_relance' },
          { label: 'Reporter', action: 'reporter_relance' },
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ADMINISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  // #28 — Pas de données société configurées
  const { societe } = useConfigStore.getState();
  if (!societe.nom && !societe.siret) {
    alerts.push({
      severity: 'info',
      category: 'admin',
      text: 'Coordonnées société non renseignées — Paramètres incomplets',
      sourceKey: 'admin-societe-vide',
      autoGenerated: true,
      actions: [{ label: 'Configurer', href: '/parametres' }],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. DEVIS EN ATTENTE (demande de devis — date de réception dépassée)
  // ═══════════════════════════════════════════════════════════════════════════

  // #29 — Demande de devis en retard : l'artisan n'a pas déposé le devis sur AVRA
  // à la date de réception souhaitée (scheduledFor). S'éteint automatiquement dès
  // que le devis est reçu : demande TERMINÉE, ou pièce jointe déposée par l'intervenant.
  const { devisAlertDemandes } = useDemandesStore.getState();
  for (const dm of devisAlertDemandes) {
    if (dm.type !== 'DEVIS') continue;
    if (dm.status === 'TERMINEE' || dm.status === 'ANNULEE' || dm.status === 'REFUSEE') continue;
    // Devis reçu = l'intervenant a déposé au moins une pièce jointe (compteur
    // fiable renvoyé par l'endpoint liste), ou — à défaut — attachment chargé.
    const devisRecu =
      (dm._count?.attachments ?? 0) > 0 ||
      (dm.attachments ?? []).some((a) => (a.uploadedByRole ?? '').toUpperCase() === 'INTERVENANT');
    if (devisRecu) continue;
    const date = parseFR(dm.scheduledFor ?? undefined);
    if (!date) continue;
    const daysLate = daysSince(date, now);
    if (daysLate > 0) {
      const who = dm.project?.name ?? dm.title ?? 'artisan';
      alerts.push({
        severity: 'error',
        category: 'devis',
        text: `Devis non reçu — ${who} · ${daysLate} j de retard`,
        dossierId: dm.projectId ?? undefined,
        sourceKey: `devis-attente-${dm.id}`,
        autoGenerated: true,
        actions: dm.projectId
          ? [{ label: 'Voir dossier', href: `/dossiers/${dm.projectId}` }]
          : [{ label: 'Voir les demandes', href: '/sav' }],
      });
    }
  }

  // ── Trier par sévérité ──
  const order: Record<AlertSeverity, number> = { error: 0, warning: 1, clock: 2, info: 3 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  return alerts;
}

// ── Hook React ───────────────────────────────────────────────────────────────

/**
 * Hook qui fait tourner le moteur d'alertes.
 * Perf : recalcul toutes les 2 min + mise en pause quand l'onglet est en arrière-plan
 * (le calcul est 100% local / client-side, pas besoin d'être agressif).
 * À monter dans le layout principal.
 */
const POLL_MS = 120_000; // 2 minutes (était 30s — 4× moins de travail)

export function useAlertEngine() {
  const setGeneratedAlerts = useUIStore(s => s.setGeneratedAlerts);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let lastRun = 0;
    const compute = () => {
      try {
        lastRun = Date.now();
        setGeneratedAlerts(computeAlerts());
      } catch (e) {
        console.error('[AlertEngine] Erreur:', e);
      }
    };
    const run = () => {
      compute();
      // Rafraîchit les demandes DEVIS (source des alertes "devis non reçu") puis
      // recompose — pas de latence d'affichage. Échec silencieux (bonus).
      void useDemandesStore.getState().fetchDevisAlertDemandes().then(compute).catch(() => {});
    };

    // Léger délai pour laisser les stores s'hydrater
    const timeout = setTimeout(run, 1000);

    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(run, POLL_MS);
    };
    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        stopInterval();
      } else {
        // À la reprise : rattrapage si le dernier calcul date de + de POLL_MS
        if (Date.now() - lastRun > POLL_MS) run();
        startInterval();
      }
    };

    startInterval();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearTimeout(timeout);
      stopInterval();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [setGeneratedAlerts]);
}
