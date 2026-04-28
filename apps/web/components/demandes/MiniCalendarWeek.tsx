'use client';

/**
 * Mini-calendrier semaine — utilise dans le drill-down chip LIVRAISON / PLANNING
 * cote /intervenants. Affiche les events de la semaine courante par jour
 * (LUN-DIM) sur creneaux 9h-13h.
 *
 * Source : Demandes scheduledFor de l'intervenant filtre par type (optionnel).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Demande, DemandeType } from '@/lib/demandes-api';

const DAYS = ['LUN', 'MAR', 'MERC', 'JEU', 'VEN', 'SAM', 'DIM'];
const HOURS = [9, 10, 11, 12, 13];

const TYPE_COLORS: Record<DemandeType, { bg: string; text: string }> = {
  POSE:                   { bg: '#7c4f1d', text: '#fff' },
  LIVRAISON:              { bg: '#7c4f1d', text: '#fff' },
  SAV:                    { bg: '#dc2626', text: '#fff' },
  MESURE:                 { bg: '#fbbf24', text: '#7c4f1d' },
  DEVIS:                  { bg: '#3b82f6', text: '#fff' },
  CONFIRMATION_COMMANDE:  { bg: '#3b82f6', text: '#fff' },
  COMPLEMENT:             { bg: '#a78bfa', text: '#fff' },
  AUTRE:                  { bg: '#9ca3af', text: '#fff' },
};

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lundi = jour 1
  result.setDate(result.getDate() + diff);
  return result;
}

function formatRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(start)}–${fmt(end)}`;
}

interface Props {
  demandes: Demande[];
  /** Filtre par type (optionnel) — si fourni, n'affiche que ces types. */
  filterType?: DemandeType;
  /** Callback quand on clique un creneau vide pour creer une demande. */
  onCellClick?: (date: Date, hour: number) => void;
  /** Optionnel : URL d'invitation pour partager la semaine. */
  invitationUrl?: string;
  /** Click sur le bouton "agrandir" */
  onMaximize?: () => void;
}

export function MiniCalendarWeek({ demandes, filterType, onCellClick, invitationUrl, onMaximize }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    return startOfWeek(today);
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Indexer les demandes par (dayIndex, hour)
  const eventsByCell = useMemo(() => {
    const map: Record<string, Demande[]> = {};
    for (const d of demandes) {
      if (!d.scheduledFor) continue;
      if (filterType && d.type !== filterType) continue;
      const dt = new Date(d.scheduledFor);
      const dayMs = dt.getTime() - weekStart.getTime();
      const dayIdx = Math.floor(dayMs / 86400_000);
      if (dayIdx < 0 || dayIdx > 6) continue;
      const hour = dt.getHours();
      if (hour < HOURS[0] || hour > HOURS[HOURS.length - 1]) continue;
      const key = `${dayIdx}:${hour}`;
      (map[key] ??= []).push(d);
    }
    return map;
  }, [demandes, filterType, weekStart]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #ece7df',
      padding: '12px 16px 16px',
    }}>
      {/* Header avec navigation + lien invitation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a2a1e' }}>
            PLANNING
          </span>
          <span style={{ fontSize: 11, color: '#7c6c58' }}>· {formatRange(weekStart)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            style={navBtn()}
            aria-label="Semaine précédente"
          >
            <ChevronLeft size={14} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{ ...navBtn(), padding: '4px 10px', width: 'auto', fontSize: 11, fontWeight: 700 }}
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            style={navBtn()}
            aria-label="Semaine suivante"
          >
            <ChevronRight size={14} />
          </button>
          {onMaximize && (
            <button
              onClick={onMaximize}
              style={{ ...navBtn(), marginLeft: 4 }}
              aria-label="Agrandir"
              title="Voir le planning complet"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {invitationUrl && (
        <div style={{ marginBottom: 10, fontSize: 12 }}>
          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}
          >
            → Invitation Le {formatRange(weekStart)}
          </a>
        </div>
      )}

      {/* Grille */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ width: 50, padding: '6px 4px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7c6c58' }}>
              </th>
              {DAYS.map((d, i) => {
                const date = days[i];
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <th key={d} style={{
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isToday ? '#15803d' : '#7c6c58',
                    background: isToday ? '#f0fdf4' : 'transparent',
                    borderRadius: 6,
                  }}>
                    {d}
                    <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#15803d' : '#9ca3af', marginTop: 2 }}>
                      {date.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td style={{
                  width: 50, padding: '4px 6px',
                  fontSize: 11, fontWeight: 700, color: '#7c6c58',
                  borderTop: '1px dashed #ece7df',
                  verticalAlign: 'top',
                }}>
                  {hour}:00
                </td>
                {days.map((day, dayIdx) => {
                  const events = eventsByCell[`${dayIdx}:${hour}`] ?? [];
                  return (
                    <td
                      key={dayIdx}
                      onClick={() => onCellClick && events.length === 0 && onCellClick(day, hour)}
                      style={{
                        padding: 3,
                        borderTop: '1px dashed #ece7df',
                        verticalAlign: 'top',
                        cursor: onCellClick && events.length === 0 ? 'pointer' : 'default',
                        height: 38,
                      }}
                    >
                      {events.map((ev, i) => {
                        const c = TYPE_COLORS[ev.type] ?? TYPE_COLORS.AUTRE;
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.title} — ${ev.intervenant?.companyName ?? ''}`}
                            style={{
                              background: c.bg,
                              color: c.text,
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              marginBottom: i < events.length - 1 ? 2 : 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function navBtn(): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 6,
    background: '#f5eee8', border: 'none',
    color: '#3D5449', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
}
