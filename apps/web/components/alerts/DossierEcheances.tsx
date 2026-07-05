'use client';

/**
 * Bande « Échéances » du dossier — liste les dates butoires (Suivi, Relevé, Plan
 * technique, Fiche de pose, Permis…) avec un badge « ! » sur celles en retard
 * (rouge) ou imminentes (orange).
 *
 * Chaque ligne porte l'ancre `echeanceAnchor(label)` → c'est la cible du clic
 * depuis l'assistant (scroll + surbrillance). Même source d'alertes que partout.
 */
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDossierStore } from '@/store/useDossierStore';
import { useDossierAlerts } from '@/hooks/useDossierAlerts';
import { echeanceAnchor } from '@/lib/alertClassify';

// Correspondance clé legacy -> libellé (identique au moteur d'alertes, pour que
// l'ancre concorde entre l'alerte et la ligne affichée).
const LEGACY_LABELS: Record<string, string> = {
  suiviChantier: 'Suivi chantier',
  releveMesures: 'Relevé de mesures',
  planTechnique: 'Plan technique',
  fichePose: 'Fiche de pose',
  permisConstruire: 'Permis de construire',
  sav: 'SAV',
};

export function DossierEcheances({ dossierId }: { dossierId: string }) {
  const newDates = useDossierStore((s) => s.datesButoiresSignes[dossierId]);
  const legacy = useDossierStore((s) => s.dossiersSignes.find((d) => d.id === dossierId)?.dateButoires);
  const { retard, urgent } = useDossierAlerts(dossierId);

  // Source des dates : nouveau système en priorité, sinon fallback legacy.
  const rows = useMemo(() => {
    const base: [string, string][] = [];
    const nd = newDates ?? {};
    if (Object.keys(nd).length > 0) {
      for (const [label, v] of Object.entries(nd)) if (v) base.push([label, v]);
    } else if (legacy) {
      for (const [key, label] of Object.entries(LEGACY_LABELS)) {
        const v = (legacy as Record<string, string | undefined>)[key];
        if (v) base.push([label, v]);
      }
    }
    const decorated = base.map(([label, dateStr]) => {
      const anchor = echeanceAnchor(label);
      const ret = retard.find((a) => a.anchor === anchor);
      const urg = urgent.find((a) => a.anchor === anchor);
      return { label, dateStr, anchor, ret, urg, prio: ret ? 0 : urg ? 1 : 2 };
    });
    // Retards d'abord, puis imminents, puis le reste (tri stable).
    return decorated.sort((a, b) => a.prio - b.prio);
  }, [newDates, legacy, retard, urgent]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#304035]/8">
        <h2 className="text-sm font-bold text-[#304035]">Échéances</h2>
      </div>
      <div className="px-3 py-2">
        {rows.map(({ label, dateStr, anchor, ret, urg }) => {
          const flagged = ret ?? urg;
          const color = ret ? '#D32F2F' : urg ? '#E68A00' : null;
          const bg = ret ? '#FFF0F0' : urg ? '#FFF6E9' : null;

          return (
            <div
              key={label}
              id={anchor}
              style={{ scrollMarginTop: 90 }}
              className="flex items-center gap-2 px-2 py-2 rounded-lg"
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color ?? 'rgba(48,64,53,0.18)',
                  flexShrink: 0,
                }}
              />
              <span className="flex-1 text-sm text-[#304035] font-medium">{label}</span>
              <span className="text-xs text-[#304035]/45">{dateStr}</span>
              {flagged && color && bg && (
                <span
                  title={flagged.text}
                  style={{
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
                  }}
                >
                  <AlertTriangle style={{ width: 12, height: 12 }} />
                  {ret ? 'RETARD' : 'URGENT'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
