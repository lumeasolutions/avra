'use client';

/**
 * Page d'impression d'une demande (cote pro).
 *
 * Navigation : /demandes/<id>/print → ouvre une page imprimable.
 * Le pro peut faire Ctrl+P pour generer un PDF natif via le navigateur.
 *
 * Pas de PDF lib (jspdf etc.) : on utilise les regles CSS @media print +
 * window.print() pour rester leger.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Demande, getDemandePro, DEMANDE_TYPE_LABELS, DEMANDE_STATUS_LABELS } from '@/lib/demandes-api';

export default function DemandePrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [demande, setDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDemandePro(id)
      .then(setDemande)
      .catch((e) => setError(e?.message ?? 'Erreur chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-trigger print quand le contenu est rendu
  useEffect(() => {
    if (demande && !loading && typeof window !== 'undefined') {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [demande, loading]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement…</div>;
  if (error || !demande) return <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>{error ?? 'Demande introuvable'}</div>;

  const intervenantName = demande.intervenant?.companyName
    ?? [demande.intervenant?.firstName, demande.intervenant?.lastName].filter(Boolean).join(' ')
    ?? '—';
  const proName = [demande.createdBy.firstName, demande.createdBy.lastName].filter(Boolean).join(' ') || demande.createdBy.email;

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
        body { background: #f5eee8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: 32, background: 'white', minHeight: '100vh' }}>
        {/* Bouton imprimer (no-print) */}
        <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => window.print()} style={{
            padding: '10px 18px', background: '#1a2a1e', color: '#cbb98a',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            🖨 Imprimer / Sauvegarder en PDF
          </button>
          <button onClick={() => history.back()} style={{
            padding: '10px 18px', background: 'transparent', color: '#5b5045',
            border: '1px solid #ddd5c7', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Retour
          </button>
        </div>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1a2a1e', paddingBottom: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: '#3D5449', textTransform: 'uppercase' }}>
            AVRA — Bon de demande
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1a2a1e', marginTop: 6 }}>
            {DEMANDE_TYPE_LABELS[demande.type]}
          </div>
          <div style={{ fontSize: 13, color: '#5b5045', marginTop: 4 }}>
            Reference : {demande.id} · Statut : <strong>{DEMANDE_STATUS_LABELS[demande.status]}</strong>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2a1e', marginBottom: 18 }}>{demande.title}</h1>

        {/* Metadata grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, fontSize: 13 }}>
          <tbody>
            <Row label="Demandé par" value={`${proName} · ${demande.createdBy.email}`} />
            <Row label="Intervenant" value={`${intervenantName}${demande.intervenant?.email ? ' · ' + demande.intervenant.email : ''}${demande.intervenant?.phone ? ' · ' + demande.intervenant.phone : ''}`} />
            {demande.project && <Row label="Projet" value={`${demande.project.name}${demande.project.reference ? ' · Réf. ' + demande.project.reference : ''}`} />}
            {demande.scheduledFor && <Row label="Date planifiée" value={new Date(demande.scheduledFor).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} />}
            <Row label="Créée le" value={new Date(demande.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} />
          </tbody>
        </table>

        {/* Notes */}
        {demande.notes && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c6c58', textTransform: 'uppercase', marginBottom: 6 }}>
              Notes / instructions
            </div>
            <div style={{
              padding: '14px 18px',
              background: '#fafaf8',
              borderLeft: '3px solid #cbb98a',
              borderRadius: 6,
              fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              color: '#3D3328',
            }}>
              {demande.notes}
            </div>
          </div>
        )}

        {/* Attachments */}
        {demande.attachments && demande.attachments.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c6c58', textTransform: 'uppercase', marginBottom: 6 }}>
              Pièces jointes ({demande.attachments.length})
            </div>
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {demande.attachments.map((a, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid #ece7df' }}>
                  📎 {a.displayName} <span style={{ color: '#7c6c58', fontSize: 11 }}>· {a.mimeType ?? 'fichier'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status events */}
        {demande.statusEvents && demande.statusEvents.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c6c58', textTransform: 'uppercase', marginBottom: 6 }}>
              Historique des statuts
            </div>
            <ul style={{ padding: 0, listStyle: 'none', fontSize: 12 }}>
              {demande.statusEvents.map((e) => (
                <li key={e.id} style={{ padding: '4px 0', color: '#5b5045' }}>
                  {new Date(e.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  {' — '}
                  {e.fromStatus ? `${e.fromStatus} → ` : ''}
                  <strong>{e.toStatus}</strong>
                  {e.comment ? <span style={{ fontStyle: 'italic', color: '#7c6c58' }}> · « {e.comment} »</span> : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 18, borderTop: '1px solid #ece7df', fontSize: 11, color: '#7c6c58', textAlign: 'center' }}>
          Document genere par AVRA · {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '6px 12px 6px 0', fontWeight: 700, color: '#7c6c58', verticalAlign: 'top', width: 140, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </td>
      <td style={{ padding: '6px 0', color: '#1a2a1e' }}>
        {value}
      </td>
    </tr>
  );
}
