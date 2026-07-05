'use client';

/**
 * Bande de suivi du dossier — regroupe :
 *  • « Échéances » : dates butoires (Suivi, Relevé, Plan technique…) avec badge
 *    ! RETARD (rouge) / URGENT (orange) sur les concernées.
 *  • « Fournisseurs » : confirmations en attente, badge EN ATTENTE (orange) sur
 *    celles dont le délai est dépassé.
 *
 * Chaque ligne porte une ancre → cible du clic depuis l'assistant (scroll +
 * surbrillance). Même source d'alertes que partout (aucun calcul dupliqué).
 */
import { useMemo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useDossierStore } from '@/store/useDossierStore';
import { useUIStore } from '@/store/useUIStore';
import { useDossierAlerts } from '@/hooks/useDossierAlerts';
import { echeanceAnchor } from '@/lib/alertClassify';

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

export function DossierEcheances({ dossierId }: { dossierId: string }) {
  const newDates = useDossierStore((s) => s.datesButoiresSignes[dossierId]);
  const valides = useDossierStore((s) => s.echeancesValidees[dossierId]);
  const signe = useDossierStore((s) => s.dossiersSignes.find((d) => d.id === dossierId));
  const alerts = useUIStore((s) => s.alerts);
  const { retard, urgent } = useDossierAlerts(dossierId);

  // ── Échéances (dates butoires) : nouveau système, sinon fallback legacy ──
  const dateRows = useMemo(() => {
    const base: [string, string][] = [];
    const nd = newDates ?? {};
    if (Object.keys(nd).length > 0) {
      for (const [label, v] of Object.entries(nd)) if (v) base.push([label, v]);
    } else if (signe?.dateButoires) {
      for (const [key, label] of Object.entries(LEGACY_LABELS)) {
        const v = (signe.dateButoires as Record<string, string | undefined>)[key];
        if (v) base.push([label, v]);
      }
    }
    return base
      .map(([label, dateStr]) => {
        const anchor = echeanceAnchor(label);
        const ret = retard.find((a) => a.anchor === anchor);
        const urg = urgent.find((a) => a.anchor === anchor);
        const done = valides?.[label] === true;
        return { label, dateStr, anchor, ret, urg, done, prio: ret ? 0 : urg ? 1 : done ? 3 : 2 };
      })
      .sort((a, b) => a.prio - b.prio);
  }, [newDates, valides, signe, retard, urgent]);

  // ── Fournisseurs : confirmations en attente (badge si délai dépassé) ──
  const confRows = useMemo(() => {
    const confs = (signe?.confirmations ?? []).filter((c) => !c.validee);
    return confs
      .map((c) => {
        const anchor = `conf-${c.id}`;
        const alerte = alerts.find((a) => !a.dismissed && a.anchor === anchor && a.dossierId === dossierId);
        return { conf: c, anchor, alerte, prio: alerte ? 0 : 1 };
      })
      .sort((a, b) => a.prio - b.prio);
  }, [signe, alerts, dossierId]);

  if (dateRows.length === 0 && confRows.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {dateRows.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-[#304035]/8">
            <h2 className="text-sm font-bold text-[#304035]">Échéances</h2>
          </div>
          <div className="px-3 py-2">
            {dateRows.map(({ label, dateStr, anchor, ret, urg, done }) => {
              const flagged = ret ?? urg;
              const color = ret ? '#D32F2F' : urg ? '#E68A00' : null;
              const bg = ret ? '#FFF0F0' : urg ? '#FFF6E9' : null;
              const dotColor = done ? '#10b981' : color ?? 'rgba(48,64,53,0.18)';
              return (
                <div key={label} id={anchor} style={{ scrollMarginTop: 90 }} className="flex items-center gap-2 px-2 py-2 rounded-lg">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span className="flex-1 text-sm text-[#304035] font-medium">{label}</span>
                  <span className="text-xs text-[#304035]/45">{dateStr}</span>
                  {flagged && color && bg ? (
                    <span title={flagged.text} style={badgeStyle(color, bg)}>
                      <AlertTriangle style={{ width: 12, height: 12 }} />
                      {ret ? 'RETARD' : 'URGENT'}
                    </span>
                  ) : done ? (
                    <span style={badgeStyle('#16a34a', 'rgba(16,185,129,0.1)')}>
                      <Check style={{ width: 12, height: 12 }} />
                      VALIDÉ
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      {confRows.length > 0 && (
        <>
          <div className={`px-5 py-3 border-b border-[#304035]/8 ${dateRows.length > 0 ? 'border-t' : ''}`}>
            <h2 className="text-sm font-bold text-[#304035]">Fournisseurs</h2>
          </div>
          <div className="px-3 py-2">
            {confRows.map(({ conf, anchor, alerte }) => (
              <div key={conf.id} id={anchor} style={{ scrollMarginTop: 90 }} className="flex items-center gap-2 px-2 py-2 rounded-lg">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: alerte ? '#E68A00' : 'rgba(48,64,53,0.18)', flexShrink: 0 }} />
                <span className="flex-1 text-sm text-[#304035] font-medium">{conf.fournisseur}</span>
                <span className="text-xs text-[#304035]/45">{conf.dateButoir}</span>
                {alerte && (
                  <span title={alerte.text} style={badgeStyle('#E68A00', '#FFF6E9')}>
                    <AlertTriangle style={{ width: 12, height: 12 }} />
                    EN ATTENTE
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
