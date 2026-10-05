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
import { useConfigStore } from '@/store/useConfigStore';
import { couleurMembre, couleursParNom, PALETTE_EQUIPE } from '@/lib/couleurs-equipe';

interface Props {
  vendeurName?: string | null;
  /** Identifiant du vendeur quand il est connu — clé fiable de la couleur. */
  vendeurUserId?: string | null;
  size?: 'xs' | 'sm' | 'md';
  /** Affiche "Vous" si le vendeur correspond au currentUserName fourni. */
  currentUserName?: string | null;
  className?: string;
}

// La palette et le calcul de repli vivent désormais dans
// `lib/couleurs-equipe.ts`, partagés avec les cartes de dossier et le planning
// — une seule définition pour un code couleur qui doit être le même partout.
void PALETTE_EQUIPE;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VendeurBadge({ vendeurName, vendeurUserId, size = 'sm', currentUserName, className = '' }: Props) {
  const couleursEquipe = useConfigStore(s => s.couleursEquipe);
  const membres = useConfigStore(s => s.members);
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

  const parNom = couleursParNom(
    membres.map(m => ({ userId: (m as { userId?: string }).userId ?? m.id, nom: m.name })),
    couleursEquipe,
  );
  const bg = couleurMembre(vendeurUserId, trimmed, couleursEquipe, parNom);
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
