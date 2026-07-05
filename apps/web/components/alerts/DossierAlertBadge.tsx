'use client';

/**
 * Badge « ! » URGENT / RETARD posé sur un dossier.
 *
 * Même source que l'onglet Alertes de l'assistant (via useDossierAlerts).
 *  - variant "compact"  → pastille + nombre, détail au survol (title). Sûr à
 *    l'intérieur d'un <Link> (aucun élément interactif imbriqué).
 *  - variant "full"     → pastille cliquable ouvrant la liste des problèmes avec
 *    leurs actions. À utiliser hors d'un <Link> (en-tête de dossier).
 *
 * Ne rend rien si le dossier n'a aucune alerte urgent/retard.
 */
import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { useDossierAlerts } from '@/hooks/useDossierAlerts';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import type { AlertItem } from '@/store/useUIStore';

const STYLE = {
  retard: { bg: '#FFF0F0', fg: '#D32F2F', label: 'RETARD' },
  urgent: { bg: '#FFF6E9', fg: '#E68A00', label: 'URGENT' },
} as const;

export function DossierAlertBadge({
  dossierId,
  variant = 'compact',
}: {
  dossierId: string;
  variant?: 'compact' | 'full';
}) {
  const { level, count, retard, urgent } = useDossierAlerts(dossierId);
  const [open, setOpen] = useState(false);
  if (!level) return null;

  const s = STYLE[level];
  const items: AlertItem[] = [...retard, ...urgent];

  if (variant === 'compact') {
    return (
      <span
        title={items.map((a) => `• ${a.text}`).join('\n')}
        aria-label={`${count} alerte${count > 1 ? 's' : ''} : ${s.label.toLowerCase()}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: s.bg,
          color: s.fg,
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 999,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <AlertTriangle style={{ width: 12, height: 12 }} />
        {count}
      </span>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${count} alerte${count > 1 ? 's' : ''} — voir le détail`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: s.bg,
          color: s.fg,
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        <AlertTriangle style={{ width: 14, height: 14 }} />
        {s.label} · {count}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 41,
              width: 320,
              maxWidth: '85vw',
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              border: '0.5px solid rgba(48,64,53,0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: s.bg,
                color: s.fg,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>
                {count} point{count > 1 ? 's' : ''} d&apos;attention
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: s.fg, display: 'flex', padding: 0 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {items.map((a) => {
                const isRet = retard.includes(a);
                const dot = isRet ? '#D32F2F' : '#E68A00';
                return (
                  <div key={a.id} style={{ padding: '10px 12px', borderTop: '0.5px solid rgba(48,64,53,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 5 }} />
                      {a.anchor ? (
                        <a
                          href={`#${a.anchor}`}
                          onClick={() => { setOpen(false); scrollToAnchor(a.anchor); }}
                          style={{ flex: 1, fontSize: 13, color: '#304035', lineHeight: 1.4, textDecoration: 'none', cursor: 'pointer' }}
                        >
                          {a.text}
                        </a>
                      ) : (
                        <span style={{ flex: 1, fontSize: 13, color: '#304035', lineHeight: 1.4 }}>{a.text}</span>
                      )}
                    </div>
                    {a.actions && a.actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginLeft: 16 }}>
                        {a.actions
                          .filter((act) => act.href)
                          .map((act, j) => (
                            <Link
                              key={j}
                              href={act.href!}
                              onClick={() => setOpen(false)}
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#4A6358',
                                textDecoration: 'none',
                                background: 'rgba(74,99,88,0.08)',
                                padding: '3px 9px',
                                borderRadius: 8,
                              }}
                            >
                              {act.label}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
