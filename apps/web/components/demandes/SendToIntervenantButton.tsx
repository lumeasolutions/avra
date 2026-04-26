'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { SendToIntervenantDrawer, SendToIntervenantPrefill } from './SendToIntervenantDrawer';

interface Props {
  prefill?: SendToIntervenantPrefill;
  variant?: 'primary' | 'secondary' | 'compact' | 'icon';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  onSent?: (demandeId: string) => void;
}

/**
 * Bouton universel "Envoyer a un intervenant".
 *
 * Usage :
 *   <SendToIntervenantButton prefill={{ projectId, attachments }} variant="primary" />
 *
 * Variantes :
 *  - primary    : CTA principal (vert AVRA)
 *  - secondary  : bouton outline
 *  - compact    : petit chip en barre d'actions
 *  - icon       : juste l'icone (24x24, tooltip natif)
 */
export function SendToIntervenantButton({
  prefill, variant = 'primary', label, className, style, onSent,
}: Props) {
  const [open, setOpen] = useState(false);

  const baseStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          padding: '10px 18px',
          background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
          color: '#cbb98a',
          border: 'none', borderRadius: 12,
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 8px rgba(26,42,30,0.18)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }
      : variant === 'secondary'
      ? {
          padding: '10px 18px',
          background: '#fff',
          color: '#1a2a1e',
          border: '1px solid #1a2a1e', borderRadius: 12,
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }
      : variant === 'compact'
      ? {
          padding: '6px 12px',
          background: '#1a2a1e',
          color: '#cbb98a',
          border: 'none', borderRadius: 8,
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }
      : { // icon
          width: 32, height: 32,
          background: '#1a2a1e',
          color: '#cbb98a',
          border: 'none', borderRadius: 8,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        };

  const iconSize = variant === 'icon' ? 16 : variant === 'compact' ? 13 : 15;
  const text = label ?? (variant === 'compact' ? 'Intervenant' : variant === 'icon' ? '' : 'Envoyer à un intervenant');

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className}
        title={variant === 'icon' ? 'Envoyer à un intervenant' : undefined}
        style={{ ...baseStyle, ...style }}
      >
        <Send size={iconSize} strokeWidth={2.2} />
        {text}
      </button>

      <SendToIntervenantDrawer
        open={open}
        onClose={() => setOpen(false)}
        prefill={prefill}
        onSent={onSent}
      />
    </>
  );
}
