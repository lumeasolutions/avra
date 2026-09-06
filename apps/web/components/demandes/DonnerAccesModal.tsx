'use client';

/**
 * DonnerAccesModal — selection multi-intervenants pour leur envoyer le lien
 * d'invitation au portail intervenant.
 *
 * Workflow :
 *   1. Liste tous les intervenants avec checkbox + indicateur statut
 *      (deja invite / sans email / actif).
 *   2. Selection multiple.
 *   3. Click "Envoyer les invitations" -> POST /demandes/invitations en
 *      parallele pour chaque selectionne (batch).
 *   4. Affichage du resultat (X envoyees, Y echouees).
 */
import { useEffect, useState } from 'react';
import { useOverlayDismiss } from '@/lib/useOverlayDismiss';
import { X, Send, CheckCircle2, AlertCircle, Mail, Search } from 'lucide-react';
import { createInvitation, IntervenantInvitation } from '@/lib/demandes-api';

interface IntervenantOption {
  id: string;
  type: string;
  name: string;
  email?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  intervenants: IntervenantOption[];
  /** Map : intervenantId -> derniere invitation (pour identifier deja invites). */
  existingInvitations?: Record<string, IntervenantInvitation | undefined>;
  onSent?: (results: { successCount: number; failures: string[] }) => void;
}

export function DonnerAccesModal({ open, onClose, intervenants, existingInvitations = {}, onSent }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ successCount: number; failures: string[] } | null>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelected(new Set());
        setSearch('');
        setResults(null);
      }, 250);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // AVANT le return anticipe : un hook appele conditionnellement casse
  // l'ordre des hooks (React error #310).
  const overlayDismiss = useOverlayDismiss(onClose);

  if (!open) return null;

  const filtered = intervenants.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.email ?? '').toLowerCase().includes(q) || i.type.toLowerCase().includes(q);
  });

  // Eligible = a un email ET pas une invitation PENDING active
  const eligible = filtered.filter((i) => {
    if (!i.email) return false;
    const inv = existingInvitations[i.id];
    return !inv || inv.status !== 'PENDING';
  });

  const toggleAll = () => {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map((i) => i.id)));
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const ids = Array.from(selected);
    const promises = ids.map((id) => {
      const inter = intervenants.find((x) => x.id === id);
      if (!inter?.email) return Promise.reject(new Error('email manquant'));
      return createInvitation({
        intervenantId: id,
        email: inter.email.toLowerCase(),
        expiresInDays: 14,
      });
    });
    const settled = await Promise.allSettled(promises);
    const successCount = settled.filter((r) => r.status === 'fulfilled').length;
    const failures = settled
      .map((r, i) => r.status === 'rejected' ? ids[i] : null)
      .filter((x): x is string => !!x);
    const summary = { successCount, failures };
    setResults(summary);
    onSent?.(summary);
    setSubmitting(false);
  };

  return (
    <div
      {...overlayDismiss}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,18,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22,
          width: '100%', maxWidth: 560,
          maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
          color: '#cbb98a',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(203,185,138,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: 'rgba(203,185,138,0.7)', textTransform: 'uppercase' }}>
              Donner accès
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginTop: 2 }}>
              Inviter plusieurs intervenants
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 8, borderRadius: 8, color: 'rgba(245,238,232,0.7)',
          }} aria-label="Fermer"><X size={18} /></button>
        </div>

        {/* Body */}
        {!results ? (
          <>
            <div style={{ padding: '14px 24px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7c6c58' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px',
                    border: '1px solid #ddd5c7', borderRadius: 10,
                    fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              {eligible.length > 0 && (
                <button onClick={toggleAll} style={{
                  background: 'transparent', border: '1px solid #ddd5c7',
                  borderRadius: 8, padding: '7px 11px',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#3D5449',
                }}>
                  {selected.size === eligible.length ? 'Aucun' : 'Tous éligibles'}
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: '#7c6c58', fontSize: 13 }}>
                  Aucun intervenant trouvé.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map((i) => {
                    const inv = existingInvitations[i.id];
                    const hasPending = inv?.status === 'PENDING';
                    const noEmail = !i.email;
                    const disabled = hasPending || noEmail;
                    const isSelected = selected.has(i.id);
                    return (
                      <label
                        key={i.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: isSelected ? '#f0fdf4' : '#fff',
                          border: `1px solid ${isSelected ? '#15803d' : '#ece7df'}`,
                          borderRadius: 10,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => {
                            setSelected(prev => {
                              const next = new Set(prev);
                              if (next.has(i.id)) next.delete(i.id);
                              else next.add(i.id);
                              return next;
                            });
                          }}
                          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2a1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {i.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#7c6c58' }}>
                            {i.type}{i.email ? ` · ${i.email}` : ''}
                          </div>
                        </div>
                        {hasPending && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                            DÉJÀ INVITÉ
                          </span>
                        )}
                        {noEmail && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>
                            SANS EMAIL
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #ece7df', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#7c6c58' }}>
                {selected.size}/{eligible.length} éligibles selectionnés
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={onClose} style={{
                padding: '10px 18px', background: 'transparent', color: '#5b5045',
                border: '1px solid #ddd5c7', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={submitting || selected.size === 0}
                style={{
                  padding: '10px 20px', background: '#1a2a1e', color: '#cbb98a',
                  border: 'none', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  opacity: (submitting || selected.size === 0) ? 0.6 : 1,
                }}
              >
                <Send size={13} />
                {submitting ? 'Envoi…' : `Envoyer ${selected.size} invitation${selected.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : (
          // Résultats
          <div style={{ padding: 28, textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#15803d', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a2a1e', marginBottom: 8 }}>
              {results.successCount} invitation{results.successCount > 1 ? 's' : ''} envoyée{results.successCount > 1 ? 's' : ''}
            </h3>
            {results.failures.length > 0 && (
              <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
                <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {results.failures.length} échec{results.failures.length > 1 ? 's' : ''}
              </p>
            )}
            <button onClick={onClose} style={{
              padding: '10px 24px', background: '#1a2a1e', color: '#cbb98a',
              border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
