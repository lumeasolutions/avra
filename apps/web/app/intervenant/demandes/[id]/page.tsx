'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, MapPin, User, Building2,
  CheckCircle2, XCircle, Play, CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { useDemandesStore } from '@/store/useDemandesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { DEMANDE_TYPE_LABELS, DemandeStatus } from '@/lib/demandes-api';
import { StatusBadge } from '../../components/StatusBadge';
import { TypeBadge } from '../../components/TypeBadge';
import { MessageThread } from '../../components/MessageThread';
import { AttachmentsList } from '../../components/AttachmentsList';

/**
 * Détail d'une demande côté intervenant.
 *
 * Workflow de boutons (machine à états restrictive — aligné avec le service backend) :
 *  - ENVOYEE  → ACCEPTEE / REFUSEE (et marqué VUE auto)
 *  - VUE      → ACCEPTEE / REFUSEE
 *  - ACCEPTEE → EN_COURS
 *  - EN_COURS → TERMINEE
 *  - TERMINEE / REFUSEE / ANNULEE → terminal
 */

const TRANSITIONS: Record<DemandeStatus, Array<{ to: DemandeStatus; label: string; icon: React.ReactNode; tone: 'primary' | 'success' | 'danger' | 'neutral' }>> = {
  ENVOYEE: [
    { to: 'ACCEPTEE', label: 'Accepter',       icon: <CheckCircle2 size={16} />, tone: 'success' },
    { to: 'REFUSEE',  label: 'Refuser',        icon: <XCircle size={16} />,      tone: 'danger' },
  ],
  VUE: [
    { to: 'ACCEPTEE', label: 'Accepter',       icon: <CheckCircle2 size={16} />, tone: 'success' },
    { to: 'REFUSEE',  label: 'Refuser',        icon: <XCircle size={16} />,      tone: 'danger' },
  ],
  ACCEPTEE: [
    { to: 'EN_COURS', label: "Démarrer l'intervention", icon: <Play size={16} />, tone: 'primary' },
  ],
  EN_COURS: [
    { to: 'TERMINEE', label: 'Marquer comme terminée',  icon: <CheckSquare size={16} />, tone: 'success' },
  ],
  REFUSEE:  [],
  TERMINEE: [],
  ANNULEE:  [],
};

export default function DemandeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const user = useAuthStore((s) => s.user);
  const currentDemande = useDemandesStore((s) => s.currentDemande);
  const loadingDetail = useDemandesStore((s) => s.loadingDetail);
  const errorDetail = useDemandesStore((s) => s.errorDetail);
  const fetchMyDemande = useDemandesStore((s) => s.fetchMyDemande);
  const markViewed = useDemandesStore((s) => s.markViewed);
  const updateMyStatus = useDemandesStore((s) => s.updateMyStatus);
  const postMyMessage = useDemandesStore((s) => s.postMyMessage);
  const clearDetail = useDemandesStore((s) => s.clearDetail);

  const [submitting, setSubmitting] = useState<DemandeStatus | null>(null);
  const [confirmComment, setConfirmComment] = useState<{ to: DemandeStatus } | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchMyDemande(id).then((d) => {
      // Mark as VUE seulement la première fois (idempotent côté serveur de toute façon)
      if (d && d.status === 'ENVOYEE') {
        markViewed(id);
      }
    });
    return () => clearDetail();
  }, [id, fetchMyDemande, markViewed, clearDetail]);

  const handleStatusChange = async (to: DemandeStatus) => {
    if (to === 'REFUSEE' && !confirmComment) {
      setConfirmComment({ to });
      return;
    }
    setSubmitting(to);
    try {
      await updateMyStatus(id, to, comment.trim() || undefined);
      setConfirmComment(null);
      setComment('');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSendMessage = async (body: string) => {
    await postMyMessage(id, body);
  };

  if (loadingDetail && !currentDemande) {
    return <DetailSkeleton />;
  }

  if (errorDetail || !currentDemande) {
    return (
      <div style={{
        maxWidth: 720,
        padding: 32,
        background: '#fff',
        borderRadius: 18,
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
      }}>
        <AlertCircle size={36} style={{ color: '#dc2626', marginBottom: 14 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Demande introuvable
        </h2>
        <p style={{ fontSize: 13, color: '#7c6c58', marginBottom: 18 }}>
          {errorDetail ?? "Cette demande n'existe pas ou vous n'avez pas accès."}
        </p>
        <button
          onClick={() => router.push('/intervenant/demandes')}
          style={{
            padding: '10px 20px',
            background: '#1a2a1e',
            color: '#cbb98a',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Retour aux demandes
        </button>
      </div>
    );
  }

  const d = currentDemande;
  const transitions = TRANSITIONS[d.status] ?? [];
  const isTerminal = d.status === 'TERMINEE' || d.status === 'REFUSEE' || d.status === 'ANNULEE';

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Bouton retour */}
      <Link href="/intervenant/demandes" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600, color: '#3D5449',
        textDecoration: 'none',
      }}>
        <ArrowLeft size={15} /> Toutes les demandes
      </Link>

      {/* En-tête */}
      <header style={{
        background: '#fff',
        borderRadius: 18,
        padding: '24px 28px',
        boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <TypeBadge type={d.type} size="md" />
          <StatusBadge status={d.status} size="md" />
          <span style={{ fontSize: 12, color: '#7c6c58', marginLeft: 'auto' }}>
            Reçue le {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1a2a1e', letterSpacing: '-0.02em' }}>
          {d.title}
        </h1>
        {d.notes && (
          <div style={{
            fontSize: 14,
            color: '#3D3328',
            marginTop: 14,
            padding: '12px 16px',
            background: '#fafaf8',
            borderRadius: 10,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}>
            {d.notes}
          </div>
        )}

        {/* Métadonnées en grille */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1px solid #ece7df',
        }}>
          <Meta icon={<User size={14} />} label="Demandé par">
            {d.createdBy.firstName ?? ''} {d.createdBy.lastName ?? ''} <br />
            <span style={{ color: '#7c6c58', fontSize: 11 }}>{d.createdBy.email}</span>
          </Meta>
          {d.project && (
            <Meta icon={<Building2 size={14} />} label="Projet">
              {d.project.name}
              {d.project.reference && (
                <><br /><span style={{ color: '#7c6c58', fontSize: 11 }}>Réf. {d.project.reference}</span></>
              )}
            </Meta>
          )}
          {d.scheduledFor && (
            <Meta icon={<Calendar size={14} />} label="Planifié le">
              {new Date(d.scheduledFor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              <span style={{ color: '#7c6c58', fontSize: 11 }}>
                à {new Date(d.scheduledFor).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </Meta>
          )}
        </div>

        {/* Actions de transition */}
        {transitions.length > 0 && (
          <div style={{
            marginTop: 22, paddingTop: 18, borderTop: '1px solid #ece7df',
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            {transitions.map((t) => (
              <button
                key={t.to}
                onClick={() => handleStatusChange(t.to)}
                disabled={submitting !== null}
                style={{
                  padding: '12px 20px',
                  background:
                    t.tone === 'success' ? '#15803d' :
                    t.tone === 'danger'  ? '#b91c1c' :
                    t.tone === 'primary' ? '#1a2a1e' : '#5b5045',
                  color:
                    t.tone === 'primary' ? '#cbb98a' : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting !== null ? 'wait' : 'pointer',
                  opacity: submitting && submitting !== t.to ? 0.5 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {submitting === t.to ? '…' : t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}

        {isTerminal && (
          <div style={{
            marginTop: 18,
            padding: '14px 16px',
            background: '#fafaf8',
            borderRadius: 10,
            fontSize: 13, color: '#5b5045',
          }}>
            {d.status === 'TERMINEE' && d.completedAt && (
              <>✅ Intervention terminée le {new Date(d.completedAt).toLocaleDateString('fr-FR')}.</>
            )}
            {d.status === 'REFUSEE' && (
              <>❌ Demande refusée{d.responseMessage ? ` : « ${d.responseMessage} »` : '.'}</>
            )}
            {d.status === 'ANNULEE' && (
              <>⊘ Demande annulée par le client{d.responseMessage ? ` : « ${d.responseMessage} »` : '.'}</>
            )}
          </div>
        )}
      </header>

      {/* Confirmation refus avec commentaire optionnel */}
      {confirmComment && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #fecaca',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 10 }}>
            Vous allez refuser cette demande
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Motif (optionnel) — visible par le client"
            rows={3}
            style={{
              width: '100%', padding: 12,
              border: '1px solid #fecaca',
              borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
              background: '#fff',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => handleStatusChange(confirmComment.to)}
              disabled={submitting !== null}
              style={{
                padding: '10px 18px',
                background: '#b91c1c', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Confirmer le refus
            </button>
            <button
              onClick={() => { setConfirmComment(null); setComment(''); }}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: '#5b5045',
                border: '1px solid #ddd5c7', borderRadius: 10,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Pièces jointes */}
      {d.attachments && d.attachments.length > 0 && (
        <section style={{
          background: '#fff',
          borderRadius: 18,
          padding: '20px 24px',
          boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, margin: '0 0 12px',
            color: '#1a2a1e',
          }}>
            Pièces jointes ({d.attachments.length})
          </h2>
          <AttachmentsList attachments={d.attachments} />
        </section>
      )}

      {/* Fil de discussion */}
      <section style={{
        background: '#fff',
        borderRadius: 18,
        padding: '20px 24px',
        boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
      }}>
        <h2 style={{
          fontSize: 15, fontWeight: 700, margin: '0 0 14px',
          color: '#1a2a1e',
        }}>
          Discussion
        </h2>
        <MessageThread
          messages={d.messages ?? []}
          currentUserId={user?.id ?? null}
          onSend={handleSendMessage}
          disabled={isTerminal}
          placeholder={isTerminal ? 'Cette demande est clôturée.' : undefined}
        />
      </section>
    </div>
  );
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: '#7c6c58', fontWeight: 600,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, color: '#1a2a1e' }}>
        {children}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ height: 200, background: '#ece7df', borderRadius: 18, marginBottom: 16, opacity: 0.6 }} />
      <div style={{ height: 320, background: '#ece7df', borderRadius: 18, opacity: 0.6 }} />
    </div>
  );
}
