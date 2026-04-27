'use client';

/**
 * Panel reutilisable pour afficher les demandes d'un projet ou d'un intervenant.
 *
 * Utilise sur :
 *  - /dossiers/[id] : demandes envoyees pour ce dossier
 *  - /intervenants fiche : historique demandes de cet intervenant
 *
 * Affiche : status badge + titre + intervenant/projet + date + indicateur
 * "vu" cote pro (icone oeil quand intervenant a vu mais pas encore repondu).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Eye, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { listDemandesPro, Demande, DemandeStatus, DEMANDE_STATUS_LABELS } from '@/lib/demandes-api';
import { StatusBadge } from '@/app/intervenant/components/StatusBadge';
import { TypeBadge } from '@/app/intervenant/components/TypeBadge';

interface Props {
  /** Filtre par projet OU par intervenant (un seul). */
  projectId?: string;
  intervenantId?: string;
  /** Limite (defaut 20). */
  limit?: number;
  /** Compact = pas de status filter, juste la liste. */
  compact?: boolean;
}

export function DemandesPanel({ projectId, intervenantId, limit = 20, compact = false }: Props) {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DemandeStatus | 'ALL' | 'OPEN'>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDemandesPro({ projectId, intervenantId, pageSize: limit })
      .then((res) => { if (!cancelled) setDemandes(res.data); })
      .catch(() => { if (!cancelled) setDemandes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, intervenantId, limit]);

  const filtered = demandes.filter((d) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return ['ENVOYEE', 'VUE', 'ACCEPTEE', 'EN_COURS'].includes(d.status);
    return d.status === statusFilter;
  });

  if (loading && demandes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 60, background: '#f5eee8', borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (demandes.length === 0) {
    return (
      <div style={{
        padding: '20px 16px', textAlign: 'center',
        background: '#fafaf8', borderRadius: 10,
        color: '#7c6c58', fontSize: 13,
        border: '1px dashed #ddd5c7',
      }}>
        Aucune demande envoyée pour {projectId ? 'ce projet' : 'cet intervenant'}.
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {(['ALL', 'OPEN', 'TERMINEE', 'REFUSEE'] as const).map((s) => {
            const active = statusFilter === s;
            const labels: Record<string, string> = { ALL: 'Toutes', OPEN: 'Ouvertes', TERMINEE: 'Terminées', REFUSEE: 'Refusées' };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '5px 11px',
                  fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: active ? '#1a2a1e' : 'transparent',
                  color: active ? '#cbb98a' : '#7c6c58',
                  borderRadius: 999,
                }}
              >
                {labels[s]} ({s === 'ALL' ? demandes.length : s === 'OPEN' ? demandes.filter(d => ['ENVOYEE', 'VUE', 'ACCEPTEE', 'EN_COURS'].includes(d.status)).length : demandes.filter(d => d.status === s).length})
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((d) => <DemandeRow key={d.id} demande={d} />)}
      </div>
    </div>
  );
}

function DemandeRow({ demande }: { demande: Demande }) {
  // Indicateur "vu non repondu" : VUE = lu mais pas encore repondu
  const showSeen = demande.status === 'VUE';
  const isUnseen = demande.status === 'ENVOYEE'; // intervenant n'a pas ouvert
  const intervenantName = demande.intervenant?.companyName
    ?? [demande.intervenant?.firstName, demande.intervenant?.lastName].filter(Boolean).join(' ')
    ?? '—';

  return (
    <Link
      href={`/intervenants?demande=${demande.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: isUnseen ? '#fff7ed' : '#fff',
        border: `1px solid ${isUnseen ? '#fed7aa' : '#ece7df'}`,
        borderRadius: 10,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <TypeBadge type={demande.type} size="sm" />
          <StatusBadge status={demande.status} size="sm" />
          {showSeen && (
            <span title="Intervenant a vu mais pas encore repondu" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600, color: '#1d4ed8',
            }}>
              <Eye size={11} /> Vu
            </span>
          )}
          {isUnseen && (
            <span title="Intervenant pas encore vu la demande" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600, color: '#c2410c',
            }}>
              <Clock size={11} /> Non vue
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2a1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {demande.title}
        </div>
        <div style={{ fontSize: 11, color: '#7c6c58' }}>
          → {intervenantName}
          {' · '}
          {new Date(demande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          {demande.scheduledFor && (
            <span style={{ color: '#7c4f1d', fontWeight: 600, marginLeft: 8 }}>
              · 🗓 {new Date(demande.scheduledFor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: '#cbb98a', flexShrink: 0 }} />
    </Link>
  );
}
