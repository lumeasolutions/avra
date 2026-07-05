'use client';

/**
 * Bande de suivi du dossier — vue COMPLÈTE de toutes les échéances en cours :
 *  • « Échéances »   : étapes à date (Modifications, Relevé, Fiche de pose…).
 *  • « Commandes / Confirmations / Livraisons » : lignes multi-fournisseurs
 *    (chaque fournisseur a sa propre date butoir).
 *  • « Fournisseurs » : confirmations (ancien système).
 *
 * TOUT passe par la source de statut unique `echeanceStatus` (même calcul que le
 * tableau de bord et le moteur d'alertes → aucune divergence possible). Le badge
 * RETARD / URGENT / À VENIR / VALIDÉ est piloté par le drapeau « validé » : rien
 * ne s'auto-valide avec le temps.
 *
 * Chaque ligne porte une ancre → cible du clic depuis l'assistant (scroll).
 */
import { useMemo } from 'react';
import { AlertTriangle, Check, Clock } from 'lucide-react';
import { useDossierStore } from '@/store/useDossierStore';
import { echeanceAnchor } from '@/lib/alertClassify';
import { echeanceStatus, ECHEANCE_PRIO, type EcheanceStatus } from '@/lib/echeanceStatus';

const LEGACY_LABELS: Record<string, string> = {
  suiviChantier: 'Suivi chantier',
  releveMesures: 'Relevé de mesures',
  planTechnique: 'Plan technique',
  fichePose: 'Fiche de pose',
  permisConstruire: 'Permis de construire',
  sav: 'SAV',
};

const badgeStyle = (color: string, bg: string) =>
  ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    lineHeight: 1,
    flexShrink: 0,
  }) as const;

/** Couleur de la pastille selon le statut. */
function dotColor(status: EcheanceStatus): string {
  return status === 'retard' ? '#dc2626'
    : status === 'urgent' ? '#f97316'
    : status === 'planned' ? '#3b82f6'
    : status === 'done' ? '#10b981'
    : 'rgba(48,64,53,0.18)';
}

/** Badge de statut (null si aucune date / statut 'none'). */
function StatusBadge({ status }: { status: EcheanceStatus }) {
  if (status === 'retard') return <span style={badgeStyle('#D32F2F', '#FFF0F0')}><AlertTriangle style={{ width: 12, height: 12 }} />RETARD</span>;
  if (status === 'urgent') return <span style={badgeStyle('#E68A00', '#FFF6E9')}><Clock style={{ width: 12, height: 12 }} />URGENT</span>;
  if (status === 'planned') return <span style={badgeStyle('#2563eb', '#EFF4FF')}><Clock style={{ width: 12, height: 12 }} />À VENIR</span>;
  if (status === 'done') return <span style={badgeStyle('#16a34a', 'rgba(16,185,129,0.1)')}><Check style={{ width: 12, height: 12 }} />VALIDÉ</span>;
  return null;
}

/** Une ligne générique de la bande (pastille + libellé + date + badge). */
function EcheanceRow({
  anchor, label, sub, dateStr, status,
}: { anchor?: string; label: string; sub?: string; dateStr?: string; status: EcheanceStatus }) {
  return (
    <div id={anchor} style={{ scrollMarginTop: 90 }} className="flex items-center gap-2 px-2 py-2 rounded-lg">
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(status), flexShrink: 0 }} />
      <span className="flex-1 text-sm text-[#304035] font-medium truncate">
        {label}
        {sub ? <span className="text-[#304035]/45 font-normal"> · {sub}</span> : null}
      </span>
      {dateStr ? <span className="text-xs text-[#304035]/45 whitespace-nowrap">{dateStr}</span> : null}
      <StatusBadge status={status} />
    </div>
  );
}

export function DossierEcheances({ dossierId }: { dossierId: string }) {
  const newDates = useDossierStore((s) => s.datesButoiresSignes[dossierId]);
  const valides = useDossierStore((s) => s.echeancesValidees[dossierId]);
  const commandes = useDossierStore((s) => s.commandesAccess[dossierId]);
  const signe = useDossierStore((s) => s.dossiersSignes.find((d) => d.id === dossierId));

  // 1) Étapes à date — nouveau système, sinon fallback legacy dateButoires.
  const dateRows = useMemo(() => {
    const nd = newDates ?? {};
    // Legacy = anciens dossiers sans le nouveau système de dates. Ces dates ne
    // sont PAS validables depuis le tableau de bord ⇒ on ne les affiche jamais
    // en RETARD (aligné sur le moteur d'alertes, qui n'émet qu'un rappel proche
    // pour le legacy). Sinon la bande contredirait l'assistant.
    const isLegacy = Object.keys(nd).length === 0;
    const base: [string, string][] = [];
    if (!isLegacy) {
      for (const [label, v] of Object.entries(nd)) if (v) base.push([label, v]);
    } else if (signe?.dateButoires) {
      for (const [key, label] of Object.entries(LEGACY_LABELS)) {
        const v = (signe.dateButoires as Record<string, string | undefined>)[key];
        if (v) base.push([label, v]);
      }
    }
    return base
      .map(([label, dateStr]) => {
        let status = echeanceStatus(dateStr, valides?.[label] === true);
        if (isLegacy && (status === 'retard' || status === 'planned')) status = 'none';
        return { label, dateStr, anchor: echeanceAnchor(label), status, prio: ECHEANCE_PRIO[status] };
      })
      .sort((a, b) => a.prio - b.prio);
  }, [newDates, valides, signe]);

  // 2) Lignes commande / confirmation / livraison (multi-fournisseurs).
  const cmdRows = useMemo(() => {
    const map = commandes ?? {};
    const rows = [] as { stage: string; id: string; fournisseur: string; dateStr: string; status: EcheanceStatus; prio: number }[];
    for (const [stage, lignes] of Object.entries(map)) {
      if (!Array.isArray(lignes)) continue;
      for (const l of lignes) {
        const status = echeanceStatus(l.dateButoir, l.validee === true);
        rows.push({ stage, id: l.id, fournisseur: l.fournisseur || 'Fournisseur ?', dateStr: l.dateButoir, status, prio: ECHEANCE_PRIO[status] });
      }
    }
    return rows.sort((a, b) => a.prio - b.prio);
  }, [commandes]);

  // 3) Confirmations (ancien système dossier.confirmations).
  const confRows = useMemo(() => {
    return (signe?.confirmations ?? [])
      .map((c) => {
        const status = echeanceStatus(c.dateButoir, c.validee === true);
        return { conf: c, anchor: `conf-${c.id}`, status, prio: ECHEANCE_PRIO[status] };
      })
      .sort((a, b) => a.prio - b.prio);
  }, [signe]);

  if (dateRows.length === 0 && cmdRows.length === 0 && confRows.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {dateRows.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-[#304035]/8">
            <h2 className="text-sm font-bold text-[#304035]">Échéances</h2>
          </div>
          <div className="px-3 py-2">
            {dateRows.map((r) => (
              <EcheanceRow key={r.label} anchor={r.anchor} label={r.label} dateStr={r.dateStr} status={r.status} />
            ))}
          </div>
        </>
      )}

      {cmdRows.length > 0 && (
        <>
          <div className={`px-5 py-3 border-b border-[#304035]/8 ${dateRows.length > 0 ? 'border-t' : ''}`}>
            <h2 className="text-sm font-bold text-[#304035]">Commandes / Confirmations / Livraisons</h2>
          </div>
          <div className="px-3 py-2">
            {cmdRows.map((r) => (
              <EcheanceRow key={`${r.stage}-${r.id}`} anchor={`cmdligne-${r.id}`} label={r.stage} sub={r.fournisseur} dateStr={r.dateStr} status={r.status} />
            ))}
          </div>
        </>
      )}

      {confRows.length > 0 && (
        <>
          <div className={`px-5 py-3 border-b border-[#304035]/8 ${dateRows.length > 0 || cmdRows.length > 0 ? 'border-t' : ''}`}>
            <h2 className="text-sm font-bold text-[#304035]">Fournisseurs</h2>
          </div>
          <div className="px-3 py-2">
            {confRows.map((r) => (
              <EcheanceRow key={r.conf.id} anchor={r.anchor} label={r.conf.fournisseur} dateStr={r.conf.dateButoir} status={r.status} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
