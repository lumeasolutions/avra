'use client';

/**
 * Modal compte-rendu fin d'intervention.
 *
 * S'affiche quand l'intervenant clique "Marquer comme terminée".
 * Saisie obligatoire :
 *  - durée réelle (heures/min)
 *  - notes finales
 *  - éventuelles photos après
 *
 * À la validation :
 *  - upload photos comme messages chat (inline + thumbnails)
 *  - envoi message systeme avec recap
 *  - update statut TERMINEE avec responseMessage = recap
 */
import { useState, useEffect } from 'react';
import { X, CheckCircle2, Camera, Trash2, Clock, Send, AlertCircle } from 'lucide-react';

export interface EndOfInterventionPayload {
  durationMinutes: number;
  notes: string;
  photos: File[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Confirme et envoie tout. Doit gerer upload + status update. */
  onSubmit: (payload: EndOfInterventionPayload) => Promise<void>;
  /** Pre-remplir les notes (optional). */
  defaultNotes?: string;
}

export function EndOfInterventionModal({ open, onClose, onSubmit, defaultNotes }: Props) {
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState(defaultNotes ?? '');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setHours(2);
        setMinutes(0);
        setNotes(defaultNotes ?? '');
        setPhotos([]);
        setError(null);
      }, 250);
    }
  }, [open, defaultNotes]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPhotos(p => [...p, ...arr]);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!notes.trim() || notes.trim().length < 5) {
      setError('Décrivez brièvement ce qui a été fait (5 caractères minimum).');
      return;
    }
    const durationMinutes = hours * 60 + minutes;
    if (durationMinutes <= 0) {
      setError('Durée invalide.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ durationMinutes, notes: notes.trim(), photos });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de l\'envoi');
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,18,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 22,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
              Fin d'intervention
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
              Compte-rendu
            </div>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 8, borderRadius: 8, color: 'rgba(255,255,255,0.7)',
              opacity: submitting ? 0.4 : 1,
            }}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#5b5045', margin: 0, lineHeight: 1.5 }}>
            Avant de marquer cette intervention comme terminée, partagez les détails au client professionnel pour finaliser le suivi.
          </p>

          {/* Durée réelle */}
          <div>
            <Label>
              <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Durée réelle de l'intervention
            </Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number" min={0} max={24}
                value={hours}
                onChange={(e) => setHours(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                style={inputStyle({ width: 80, textAlign: 'center' })}
              />
              <span style={{ fontSize: 13, color: '#5b5045' }}>heures</span>
              <input
                type="number" min={0} max={59} step={5}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                style={inputStyle({ width: 80, textAlign: 'center' })}
              />
              <span style={{ fontSize: 13, color: '#5b5045' }}>min</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Compte-rendu (visible par le client pro)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Travaux réalisés, points particuliers, recommandations…"
              style={inputStyle({ resize: 'vertical' })}
            />
            <div style={{ fontSize: 10, color: '#7c6c58', marginTop: 4, textAlign: 'right' }}>
              {notes.length}/2000
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label>
              <Camera size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Photos après intervention (optionnel)
            </Label>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              background: '#fafaf8', border: '1px dashed #ddd5c7', borderRadius: 10,
              cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#3D5449',
            }}>
              <Camera size={14} />
              Ajouter des photos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handlePhotos(e.target.files)}
                style={{ display: 'none' }}
              />
            </label>
            {photos.length > 0 && (
              <div style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 6,
              }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(p)}
                      alt={p.name}
                      style={{
                        width: '100%', height: 80, objectFit: 'cover',
                        borderRadius: 8, border: '1px solid #ece7df',
                      }}
                    />
                    <button
                      onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'rgba(220,38,38,0.9)', color: '#fff',
                        border: 'none', borderRadius: 6, padding: 3,
                        cursor: 'pointer', display: 'flex',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
              color: '#991b1b', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              style={btnStyle('secondary')}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ ...btnStyle('primary'), flex: 1, opacity: submitting ? 0.6 : 1 }}
            >
              <Send size={14} />
              {submitting ? 'Envoi en cours…' : 'Valider & terminer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#7c6c58',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd5c7',
    borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
    ...extra,
  };
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '12px 20px',
      background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
      color: '#fff',
      border: 'none', borderRadius: 10,
      fontSize: 14, fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    };
  }
  return {
    padding: '12px 20px',
    background: 'transparent', color: '#5b5045',
    border: '1px solid #ddd5c7', borderRadius: 10,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  };
}
