'use client';

import { DEMANDE_TYPE_LABELS, DemandeType } from '@/lib/demandes-api';

const TYPE_ICONS: Record<DemandeType, string> = {
  POSE: '🔧',
  LIVRAISON: '🚚',
  SAV: '🛠️',
  MESURE: '📐',
  DEVIS: '📄',
  CONFIRMATION_COMMANDE: '✅',
  COMPLEMENT: '➕',
  AUTRE: '📌',
};

export function TypeBadge({ type, size = 'md' }: { type: DemandeType; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm'
    ? { padding: '2px 8px', fontSize: 11 }
    : size === 'lg'
    ? { padding: '6px 14px', fontSize: 14 }
    : { padding: '4px 10px', fontSize: 12 };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: '#fef9f2',
      color: '#7b4f1c',
      border: '1px solid #f1e2c9',
      fontWeight: 600,
      borderRadius: 8,
      ...dims,
    }}>
      <span aria-hidden>{TYPE_ICONS[type]}</span>
      {DEMANDE_TYPE_LABELS[type]}
    </span>
  );
}
