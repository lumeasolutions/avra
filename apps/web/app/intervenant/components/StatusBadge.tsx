'use client';

import { DEMANDE_STATUS_COLORS, DEMANDE_STATUS_LABELS, DemandeStatus } from '@/lib/demandes-api';

export function StatusBadge({ status, size = 'md' }: { status: DemandeStatus; size?: 'sm' | 'md' | 'lg' }) {
  const c = DEMANDE_STATUS_COLORS[status];
  const dims = size === 'sm'
    ? { padding: '2px 8px', fontSize: 11, borderRadius: 999 }
    : size === 'lg'
    ? { padding: '6px 14px', fontSize: 14, borderRadius: 999 }
    : { padding: '4px 10px', fontSize: 12, borderRadius: 999 };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.ring}`,
      fontWeight: 600,
      letterSpacing: '0.01em',
      ...dims,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c.fg }} />
      {DEMANDE_STATUS_LABELS[status]}
    </span>
  );
}
