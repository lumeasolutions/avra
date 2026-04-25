'use client';

/**
 * DevPortalSwitcher.tsx — TEMPORARY DEV ONLY
 * ---------------------------------------------------------------------------
 * FAB (floating action button) en bas à droite de l'app, visible uniquement
 * pour les admins. Permet de switcher instantanément entre les 3 portails
 * (architecte / menuisier / cuisiniste) sans avoir à se déconnecter ni à
 * recréer un compte.
 *
 * À RETIRER avant la mise en GA :
 *  1. Supprimer ce fichier
 *  2. Retirer l'import + le mount depuis app/(app)/layout.tsx
 *  3. Retirer `_devForceProfession` de useAuthStore.ts
 *
 * La garde admin se base sur l'email — la liste est synchrone avec
 * BETA_ADMIN_EMAILS (côté serveur, dans CLAUDE.md). Si tu modifies l'une,
 * pense à modifier l'autre.
 * ---------------------------------------------------------------------------
 */

import { useState, useEffect } from 'react';
import { useAuthStore, type Profession } from '@/store/useAuthStore';

const ADMIN_EMAILS = ['lumeasolutionsss@outlook.fr', 'cgdesignplan@gmail.com'];

const PORTAILS: Array<{
  id: Exclude<Profession, null>;
  emoji: string;
  label: string;
  color: string;
  glow: string;
}> = [
  { id: 'architecte', emoji: '🏛️', label: 'Architecte', color: '#6b8e73', glow: 'rgba(107,142,115,0.5)' },
  { id: 'menuisier', emoji: '🪵', label: 'Menuisier', color: '#c08a5a', glow: 'rgba(192,138,90,0.5)' },
  { id: 'cuisiniste', emoji: '🍳', label: 'Cuisiniste', color: '#4a7ec0', glow: 'rgba(74,126,192,0.5)' },
];

export function DevPortalSwitcher() {
  const user = useAuthStore((s) => s.user);
  const profession = useAuthStore((s) => s.profession);
  const force = useAuthStore((s) => s._devForceProfession);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;

  const current = PORTAILS.find((p) => p.id === profession);

  function switchTo(p: Exclude<Profession, null>) {
    force(p);
    // Hard navigation pour que le layout/sidebar se réinitialise correctement
    window.location.href = `/portail-${p}`;
  }

  return (
    <>
      <style>{`
        @keyframes dpsPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,179,138,0.4), 0 6px 22px rgba(0,0,0,0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(217,179,138,0), 0 6px 22px rgba(0,0,0,0.35); }
        }
        @keyframes dpsFadeUp {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dps-fab {
          position: fixed;
          bottom: 18px;
          left: 18px;
          z-index: 9999;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
        .dps-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #1e1c1a 0%, #2a2622 100%);
          border: 1px solid rgba(217,179,138,0.4);
          color: #f5e9d4;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          animation: dpsPulse 2.6s ease-in-out infinite;
          backdrop-filter: blur(8px);
          transition: transform 0.2s ease;
        }
        .dps-trigger:hover { transform: translateY(-1px); }
        .dps-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          color: #d9b38a;
          background: rgba(217,179,138,0.12);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .dps-current {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .dps-panel {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          min-width: 220px;
          padding: 8px;
          border-radius: 14px;
          background: linear-gradient(135deg, #1e1c1a 0%, #2a2622 100%);
          border: 1px solid rgba(217,179,138,0.3);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
          animation: dpsFadeUp 0.18s ease-out;
        }
        .dps-panel-header {
          padding: 6px 10px 8px;
          border-bottom: 1px solid rgba(217,179,138,0.15);
          margin-bottom: 6px;
          font-size: 10px;
          color: rgba(217,179,138,0.7);
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }
        .dps-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 10px;
          border-radius: 9px;
          border: 1px solid transparent;
          background: transparent;
          color: #f5e9d4;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.16s ease;
        }
        .dps-row:hover {
          background: rgba(217,179,138,0.1);
          border-color: rgba(217,179,138,0.25);
          transform: translateX(2px);
        }
        .dps-row.active {
          background: rgba(217,179,138,0.18);
          border-color: rgba(217,179,138,0.5);
        }
        .dps-row .dps-emoji {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border-radius: 7px;
          background: rgba(255,255,255,0.06);
        }
        .dps-row .dps-arrow {
          margin-left: auto;
          font-size: 14px;
          opacity: 0.4;
        }
        .dps-row:hover .dps-arrow { opacity: 1; }
        .dps-footer {
          padding: 8px 10px 4px;
          border-top: 1px solid rgba(217,179,138,0.15);
          margin-top: 6px;
          font-size: 9px;
          color: rgba(245,233,212,0.4);
          line-height: 1.4;
        }
      `}</style>

      <div className="dps-fab">
        {open && (
          <div className="dps-panel" role="menu" aria-label="Sélection portail dev">
            <div className="dps-panel-header">Switch portail (admin)</div>
            {PORTAILS.map((p) => {
              const active = p.id === profession;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`dps-row${active ? ' active' : ''}`}
                  onClick={() => switchTo(p.id)}
                  style={{ borderLeftColor: active ? p.color : undefined }}
                >
                  <span className="dps-emoji" style={{ background: active ? p.glow : undefined }}>
                    {p.emoji}
                  </span>
                  <span>{p.label}</span>
                  {active && <span style={{ marginLeft: 4, color: p.color, fontSize: 11 }}>● actif</span>}
                  {!active && <span className="dps-arrow">→</span>}
                </button>
              );
            })}
            <div className="dps-footer">
              Outil de dev temporaire. Visible pour les admins uniquement.
            </div>
          </div>
        )}

        <button
          type="button"
          className="dps-trigger"
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Fermer' : 'Switcher de portail'}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="dps-tag">DEV</span>
          {current ? (
            <span className="dps-current">
              <span>{current.emoji}</span>
              <span>{current.label}</span>
            </span>
          ) : (
            <span className="dps-current">Aucun portail</span>
          )}
          <span style={{ fontSize: 11, opacity: 0.6 }}>{open ? '▼' : '▲'}</span>
        </button>
      </div>
    </>
  );
}
