'use client';

/**
 * RatingEditor — saisie rating (1-5 etoiles), commentaire et tags pour
 * un intervenant. Ouvert depuis la fiche detail. Sauvegarde via API.
 */
import { useEffect, useState } from 'react';
import { Star, X, Save, Tag, MessageSquare, Loader2 } from 'lucide-react';
import { updateIntervenantRating } from '@/lib/intervenant-dossiers-api';

interface Props {
  open: boolean;
  onClose: () => void;
  intervenantId: string;
  intervenantName: string;
  defaultRating?: number | null;
  defaultRatingComment?: string | null;
  defaultTagsCsv?: string | null;
  /** Callback apres save reussi pour rafraichir la liste. */
  onSaved?: (data: { rating: number | null; ratingComment: string | null; tagsCsv: string | null }) => void;
}

export function RatingEditor({
  open, onClose, intervenantId, intervenantName,
  defaultRating, defaultRatingComment, defaultTagsCsv, onSaved,
}: Props) {
  const [rating, setRating] = useState<number | null>(defaultRating ?? null);
  const [comment, setComment] = useState(defaultRatingComment ?? '');
  const [tags, setTags] = useState(defaultTagsCsv ?? '');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(defaultRating ?? null);
      setComment(defaultRatingComment ?? '');
      setTags(defaultTagsCsv ?? '');
      setError(null);
    }
  }, [open, defaultRating, defaultRatingComment, defaultTagsCsv]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateIntervenantRating(intervenantId, {
        rating,
        ratingComment: comment.trim() || null,
        tagsCsv: tags.trim() || null,
      });
      onSaved?.({ rating, ratingComment: comment.trim() || null, tagsCsv: tags.trim() || null });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Tags suggérés communs
  const commonTags = ['cuisine', 'salle de bain', 'verrière', 'parquet', 'IDF', 'province', 'urgence', 'gros oeuvre', 'finition'];
  const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
  const addTag = (t: string) => {
    if (tagsList.includes(t)) return;
    setTags(tagsList.concat(t).join(', '));
  };
  const removeTag = (t: string) => {
    setTags(tagsList.filter(x => x !== t).join(', '));
  };

  return (
    <div
      onClick={onClose}
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
          background: '#fff', borderRadius: 22,
          width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(203,185,138,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={18} style={{ color: '#fbbf24' }} fill="#fbbf24" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.16em', fontWeight: 700,
              color: 'rgba(203,185,138,0.7)', textTransform: 'uppercase',
            }}>
              Évaluation
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
              {intervenantName}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 8, borderRadius: 8, color: 'rgba(245,238,232,0.7)',
          }} aria-label="Fermer"><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Stars */}
          <div>
            <Label icon={<Star size={13} />}>Note (1 à 5)</Label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoveredStar ?? rating ?? 0) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    onMouseEnter={() => setHoveredStar(n)}
                    onMouseLeave={() => setHoveredStar(null)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: 4, transition: 'transform .15s',
                    }}
                  >
                    <Star
                      size={28}
                      fill={filled ? '#fbbf24' : 'transparent'}
                      style={{ color: filled ? '#fbbf24' : '#cbb98a', transition: 'all .15s' }}
                    />
                  </button>
                );
              })}
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  style={{
                    marginLeft: 8, background: 'transparent', border: 'none',
                    fontSize: 11, color: '#7c6c58', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <Label icon={<MessageSquare size={13} />}>Commentaire</Label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex: Bon travail mais arrive systématiquement en retard."
              style={inputStyle({ resize: 'vertical' })}
            />
            <div style={{ fontSize: 10, color: '#7c6c58', marginTop: 4, textAlign: 'right' }}>
              {comment.length}/1000
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label icon={<Tag size={13} />}>Tags / Spécialités</Label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cuisine, verrière, IDF…"
              style={inputStyle()}
              maxLength={500}
            />
            {/* Tags actifs */}
            {tagsList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {tagsList.map(t => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      background: '#fef3c7', color: '#7c4f1d',
                      fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#7c4f1d', padding: 0, display: 'flex',
                      }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Suggestions */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: '#7c6c58', marginBottom: 4, fontWeight: 600 }}>
                Suggestions :
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {commonTags.filter(t => !tagsList.includes(t)).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    style={{
                      padding: '3px 8px', borderRadius: 999,
                      background: '#fafaf8', border: '1px dashed #ddd5c7',
                      fontSize: 10, color: '#7c6c58',
                      cursor: 'pointer',
                    }}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
              color: '#991b1b', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} disabled={saving} style={btnSecondary()}>Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...btnPrimary(), flex: 1, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#7c6c58',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {icon}{children}
    </div>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%', padding: '10px 14px',
    border: '1px solid #ddd5c7', borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
    background: '#fff',
    ...extra,
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: '12px 20px',
    background: '#1a2a1e', color: '#cbb98a',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: '12px 20px',
    background: 'transparent', color: '#5b5045',
    border: '1px solid #ddd5c7', borderRadius: 10,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };
}
