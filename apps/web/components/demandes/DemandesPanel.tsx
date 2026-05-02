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
import { ChevronRight, Eye, Clock, CheckCircle2, XCircle, Send, Printer, Trash2, Edit3, Ban, MoreVertical } from 'lucide-react';
import { listDemandesPro, Demande, DemandeStatus, DEMANDE_STATUS_LABELS, deleteDemandePro, updateDemandeStatusPro } from '@/lib/demandes-api';
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
        {filtered.map((d) => (
          <DemandeRow
            key={d.id}
            demande={d}
            onDeleted={(id) => setDemandes(prev => prev.filter(x => x.id !== id))}
            onCancelled={(id) => setDemandes(prev => prev.map(x => x.id === id ? { ...x, status: 'ANNULEE' } : x))}
          />
        ))}
      </div>
    </div>
  );
}

function DemandeRow({ demande, onDeleted, onCancelled }: {
  demande: Demande;
  onDeleted: (id: string) => void;
  onCancelled: (id: string) => void;
}) {
  // Indicateur "vu non repondu" : VUE = lu mais pas encore repondu
  const showSeen = demande.status === 'VUE';
  const isUnseen = demande.status === 'ENVOYEE'; // intervenant n'a pas ouvert
  const intervenantName = demande.intervenant?.companyName
    ?? [demande.intervenant?.firstName, demande.intervenant?.lastName].filter(Boolean).join(' ')
    ?? '—';

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isTerminal = ['TERMINEE', 'REFUSEE', 'ANNULEE'].includes(demande.status);
  const canCancel = !isTerminal && demande.status !== 'EN_COURS';
  const canDelete = !['EN_COURS', 'TERMINEE'].includes(demande.status);

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm('Annuler cette demande ? L\'intervenant sera notifie.')) return;
    setBusy(true);
    try {
      await updateDemandeStatusPro(demande.id, 'ANNULEE', 'Annulee par le pro');
      onCancelled(demande.id);
    } catch (err: any) {
      alert(err?.message ?? 'Erreur annulation');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm('Supprimer definitivement cette demande ? Cette action est irreversible.')) return;
    setBusy(true);
    try {
      await deleteDemandePro(demande.id);
      onDeleted(demande.id);
    } catch (err: any) {
      alert(err?.message ?? 'Erreur suppression');
      setBusy(false);
    }
  };

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
        opacity: busy ? 0.5 : 1,
        position: 'relative',
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
      {/* Actions menu */}
      <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.preventDefault()}>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(o => !o); }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, color: '#7c6c58', borderRadius: 6,
          }}
          aria-label="Actions"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <>
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }}
              style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              background: '#fff', border: '1px solid #ece7df', borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: 180, zIndex: 51,
              padding: 4,
            }}>
              <a
                href={`/demandes/${demande.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                style={menuItemStyle()}
              >
                <Printer size={13} /> Imprimer / PDF
              </a>
              {canCancel && (
                <button onClick={handleCancel} style={menuItemStyle()}>
                  <Ban size={13} /> Annuler
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete} style={{ ...menuItemStyle(), color: '#b91c1c' }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <ChevronRight size={14} style={{ color: '#cbb98a', flexShrink: 0 }} />
    </Link>
  );
}

function menuItemStyle(): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', textAlign: 'left',
    padding: '8px 10px',
    background: 'transparent', border: 'none',
    fontSize: 12, fontWeight: 600, color: '#3D5449',
    cursor: 'pointer', borderRadius: 6,
    textDecoration: 'none',
  };
}
