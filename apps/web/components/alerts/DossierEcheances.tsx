'use client';

/**
 * Bande « Échéances » du dossier — liste les dates butoires (Suivi, Relevé, Plan
 * technique, Fiche de pose, Permis…) avec un badge « ! » sur celles en retard
 * (rouge) ou imminentes (orange).
 *
 * Chaque ligne porte l'ancre `echeanceAnchor(label)` → c'est la cible du clic
 * depuis l'assistant (scroll + surbrillance). Même source d'alertes que partout.
 */
import { AlertTriangle } from 'lucide-react';
import { useDossierStore } from '@/store/useDossierStore';
import { useDossierAlerts } from '@/hooks/useDossierAlerts';
import { echeanceAnchor } from '@/lib/alertClassify';

export function DossierEcheances({ dossierId }: { dossierId: string }) {
  const dates = useDossierStore((s) => s.datesButoiresSignes)[dossierId] ?? {};
  const { retard, urgent } = useDossierAlerts(dossierId);

  const entries = Object.entries(dates).filter(([, v]) => !!v);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#304035]/8">
        <h2 className="text-sm font-bold text-[#304035]">Échéances</h2>
      </div>
      <div className="px-3 py-2">
        {entries.map(([label, dateStr]) => {
          const anchor = echeanceAnchor(label);
          const ret = retard.find((a) => a.anchor === anchor);
          const urg = urgent.find((a) => a.anchor === anchor);
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
              {color ? (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(48,64,53,0.18)', flexShrink: 0 }} />
              )}
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
