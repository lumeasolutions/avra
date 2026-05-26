'use client';

/**
 * VendeurBadge — pastille compacte qui affiche le vendeur attribué à un objet
 * (dossier, devis, RDV…). Si non attribué, affiche un placeholder "Non attribué"
 * en gris/discret.
 *
 * Utilisé sur les cards de listes (Dossiers, Dossiers signés, Devis…) pour que
 * l'utilisateur identifie rapidement qui est responsable de quoi.
 *
 * Architecture multi-vendeur 26/05/2026.
 */

import { User } from 'lucide-react';

interface Props {
  vendeurName?: string | null;
  size?: 'xs' | 'sm' | 'md';
  /** Affiche "Vous" si le vendeur correspond au currentUserName fourni. */
  currentUserName?: string | null;
  className?: string;
}

const PALETTE = [
  '#a67749', '#16a34a', '#2563eb', '#7c3aed',
  '#dc2626', '#0891b2', '#ea580c', '#0f766e',
  '#be185d', '#4338ca',
];

/** Hash stable d'un nom → index palette → couleur d'avatar reproductible. */
function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VendeurBadge({ vendeurName, size = 'sm', currentUserName, className = '' }: Props) {
  const trimmed = (vendeurName ?? '').trim();
  const isMe =
    !!trimmed && !!currentUserName &&
    trimmed.toLowerCase() === currentUserName.trim().toLowerCase();
  const dims = size === 'xs' ? { px: 16, font: 8, gap: 4, text: 10 }
    : size === 'md' ? { px: 28, font: 11, gap: 8, text: 13 }
    : { px: 22, font: 10, gap: 6, text: 11 };

  if (!trimmed) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: dims.gap,
          fontSize: dims.text, color: 'rgba(48,64,53,0.4)', fontStyle: 'italic',
        }}
        title="Aucun vendeur attribué — utilisez le menu pour assigner"
      >
        <div style={{
          width: dims.px, height: dims.px, borderRadius: '50%',
          background: 'rgba(48,64,53,0.08)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={dims.px * 0.55} color="rgba(48,64,53,0.45)" />
        </div>
        <span>Non attribué</span>
      </span>
    );
  }

  const bg = colorForName(trimmed);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: dims.gap,
        fontSize: dims.text, color: '#304035', fontWeight: 600,
      }}
      title={isMe ? `Vous (${trimmed})` : trimmed}
    >
      <div style={{
        width: dims.px, height: dims.px, borderRadius: '50%',
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: dims.font, fontWeight: 800, letterSpacing: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}>
        {initials(trimmed)}
      </div>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
        {isMe ? `Vous` : trimmed}
      </span>
    </span>
  );
}
