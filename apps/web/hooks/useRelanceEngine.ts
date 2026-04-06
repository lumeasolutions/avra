'use client';

/**
 * useRelanceEngine — Moteur de relance automatique AVRA
 *
 * Vérifie toutes les conditions de relance et génère des alertes :
 * - Acompte non versé dans le délai configuré
 * - Solde non réglé après signature
 * - Factures en retard
 * - Commandes sans confirmation après 7 jours
 * - Devis envoyés sans réponse depuis > 14 jours
 */

import { useEffect, useRef } from 'react';
import { useConfigStore, useDossierStore, useFacturationStore, useHistoryStore, useStockStore, useUIStore } from '@/store';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(dateStr: string, now: Date = new Date()): number {
  try {
    // Supports DD/MM/YYYY or ISO
    let d: Date;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return 0;
    return Math.floor((now.getTime() - d.getTime()) / DAY_MS);
  } catch {
    return 0;
  }
}

export function useRelanceEngine() {
  const addAlert = useUIStore(s => s.addAlert);
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const devis    = useFacturationStore(s => s.devis);
  const relanceConfig = useConfigStore(s => s.relanceConfig);
  const commandes = useStockStore(s => s.commandes);

  // Track which relances have already been fired this session to avoid duplicates
  const firedKeys = useRef<Set<string>>(new Set());

  // Use a ref for alerts to avoid re-triggering the effect when alerts change
  const alertsRef = useRef(useUIStore.getState().alerts);
  useEffect(() => {
    return useUIStore.subscribe(state => {
      alertsRef.current = state.alerts;
    });
  }, []);

  useEffect(() => {
    const now = new Date();

    const fire = (key: string, alert: Parameters<typeof addAlert>[0]) => {
      if (firedKeys.current.has(key)) return;
      // Check no active (non-dismissed) alert with same key exists
      const exists = alertsRef.current.some(a => !a.dismissed && a.text.includes(key));
      if (exists) return;
      firedKeys.current.add(key);
      addAlert(alert);
    };

    // ── 1. Acompte non versé ───────────────────────────────────────────────
    // Dossiers en cours sans acompte après délaiAcompte jours
    dossiers.forEach(d => {
      if (!d.dateCreation) return;
      const age = daysBetween(d.dateCreation, now);
      if (age >= relanceConfig.delaiAcompte) {
        // Check if an invoice/payment exists for this dossier
        const hasAcompte = invoices.some(
          i => i.dossierId === d.id && (i.type === 'ACOMPTE' || i.statut === 'PAYÉ')
        );
        if (!hasAcompte) {
          const key = `RELANCE-ACOMPTE-${d.id}`;
          fire(key, {
            severity: 'warning',
            text: `[RELANCE] Acompte non versé — ${d.name} (${age} j)`,
            dossierId: d.id,
          });
        }
      }
    });

    // ── 2. Factures en retard ─────────────────────────────────────────────
    invoices.forEach(inv => {
      if (inv.statut !== 'RETARD' && inv.statut !== 'EN ATTENTE') return;
      const age = inv.dateEcheance ? daysBetween(inv.dateEcheance, now) : 0;
      if (age >= relanceConfig.delaiRetard) {
        const key = `RELANCE-RETARD-${inv.id}`;
        fire(key, {
          severity: 'error',
          text: `[RELANCE] Facture en retard — ${inv.client} (${inv.ref}, ${age} j de retard)`,
          dossierId: inv.dossierId,
        });
      }
    });

    // ── 3. Devis envoyés sans réponse depuis > 14 jours ──────────────────
    devis.forEach(d => {
      if (d.statut !== 'ENVOYÉ') return;
      const age = d.dateCreation ? daysBetween(d.dateCreation, now) : 0;
      if (age >= 14) {
        const key = `RELANCE-DEVIS-${d.id}`;
        fire(key, {
          severity: 'clock',
          text: `[RELANCE] Devis sans réponse — ${d.client} (${d.ref}, ${age} j)`,
          dossierId: d.dossierId,
        });
      }
    });

    // ── 4. Confirmations commandes en attente > 7 jours ──────────────────
    dossiersSignes.forEach(ds => {
      (ds.confirmations ?? []).forEach(c => {
        if (c.validee) return;
        if (!c.dateCommande) return;
        const age = daysBetween(c.dateCommande, now);
        if (age >= 7) {
          const key = `RELANCE-CONFIRM-${ds.id}-${c.fournisseur}`;
          fire(key, {
            severity: 'warning',
            text: `[RELANCE] Confirmation commande attendue — ${c.fournisseur} / ${ds.name} (${age} j)`,
            dossierId: ds.id,
          });
        }
      });
    });

    // ── 5. Commandes sans livraison après 30 jours ────────────────────────
    (commandes ?? []).forEach((cmd: any) => {
      if (cmd.statut === 'LIVRÉ' || cmd.statut === 'ANNULÉ') return;
      const age = cmd.dateCommande ? daysBetween(cmd.dateCommande, now) : 0;
      if (age >= 30) {
        const key = `RELANCE-LIVRAISON-${cmd.id}`;
        fire(key, {
          severity: 'clock',
          text: `[RELANCE] Livraison attendue — ${cmd.fournisseur ?? 'Fournisseur'} (${age} j après commande)`,
          dossierId: cmd.dossierId,
        });
      }
    });

  }, [dossiers, invoices, devis, dossiersSignes, commandes, relanceConfig, addAlert]);
}
