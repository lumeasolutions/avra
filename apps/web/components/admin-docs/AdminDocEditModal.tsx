'use client';

/**
 * AdminDocEditModal — édition des métadonnées d'un document admin :
 *  - Titre
 *  - Catégorie
 *  - Description (mémo libre)
 *  - Tags personnalisés
 *  - Date d'expiration (Kbis 3 mois, attestation 1 an, etc.)
 *
 * Toutes les modifications sont auditées côté serveur.
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Tag as TagIcon, Calendar, AlertCircle } from 'lucide-react';
import type { AdminDoc } from '@/store/useAdminDocsStore';
import { parseTags, stringifyTags } from '@/store/useAdminDocsStore';

const CATEGORIES = ['Juridique', 'Assurances', 'Fournisseurs', 'RH', 'Divers'] as const;

export interface AdminDocEditProps {
  open: boolean;
  doc: AdminDoc | null;
  onSave: (id: string, patch: {
    title?: string;
    description?: string | null;
    tagsCsv?: string | null;
    expiresAt?: string | null;
    category?: string;
  }) => Promise<void>;
  onClose: () => void;
}

function toInputDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function AdminDocEditModal({ open, doc, onSave, onClose }: AdminDocEditProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Divers');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
    setCategory(doc.folderId ?? 'Divers');
    setDescription(doc.description ?? '');
    setTags(parseTags(doc.tagsCsv));
    setExpiresAt(toInputDate(doc.expiresAt));
    setError(null);
    setTagInput('');
  }, [doc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, saving, onClose]);

  if (!open || !doc) return null;

  const addTag = () => {
    const v = tagInput.trim().slice(0, 32);
    if (!v) return;
    if (tags.length >= 10) { setError('Maximum 10 tags par document'); return; }
    if (tags.includes(v)) { setTagInput(''); return; }
    setTags([...tags, v]);
    setTagInput('');
    setError(null);
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await onSave(doc.id, {
        title: title.trim() || doc.title,
        description: description.trim() || null,
        tagsCsv: stringifyTags(tags) || null,
        expiresAt: expiresAt || null,
        category,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes ademFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ademRise { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .adem-bg {
          position: fixed; inset: 0; z-index: 95;
          background: rgba(8, 12, 10, 0.7);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: ademFade 0.2s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .adem-card {
          width: 100%; max-width: 540px;
          background: linear-gradient(180deg, #fffaf3 0%, #fff 60%);
          border-radius: 22px;
          border: 1px solid rgba(48,64,53,0.1);
          overflow: hidden;
          animation: ademRise 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 24px 64px rgba(0,0,0,0.4), 0 6px 18px rgba(48,64,53,0.18);
          max-height: calc(100vh - 48px);
          display: flex; flex-direction: column;
        }
        .adem-head {
          flex-shrink: 0;
          padding: 16px 20px;
          background: linear-gradient(135deg, #304035 0%, #3d5244 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .adem-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
        .adem-head p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.55); }
        .adem-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease; flex-shrink: 0;
        }
        .adem-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }
        .adem-body { padding: 20px; overflow-y: auto; flex: 1; }
        .adem-field { margin-bottom: 14px; }
        .adem-label {
          display: block; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(48,64,53,0.55); margin-bottom: 6px;
        }
        .adem-input, .adem-select, .adem-textarea {
          width: 100%; padding: 10px 12px;
          border: 1px solid rgba(48,64,53,0.14);
          border-radius: 10px;
          font-size: 13px; color: #1a1614;
          background: #fff;
          font-family: inherit;
          transition: border 0.16s, box-shadow 0.16s;
        }
        .adem-input:focus, .adem-select:focus, .adem-textarea:focus {
          outline: none;
          border-color: #a67749;
          box-shadow: 0 0 0 3px rgba(166,119,73,0.18);
        }
        .adem-textarea { resize: vertical; min-height: 70px; font-family: inherit; }
        .adem-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
        .adem-tag-row {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 6px 8px;
          border: 1px solid rgba(48,64,53,0.14);
          border-radius: 10px;
          min-height: 42px; background: #fff;
          transition: border 0.16s;
        }
        .adem-tag-row:focus-within { border-color: #a67749; box-shadow: 0 0 0 3px rgba(166,119,73,0.18); }
        .adem-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px;
          background: rgba(166,119,73,0.12);
          color: #7c4f1d;
          border-radius: 999px;
          font-size: 11px; font-weight: 700;
          border: 1px solid rgba(166,119,73,0.25);
        }
        .adem-tag button {
          all: unset; cursor: pointer; line-height: 0;
          opacity: 0.6; transition: opacity 0.15s;
        }
        .adem-tag button:hover { opacity: 1; }
        .adem-tag-input {
          flex: 1; min-width: 80px;
          border: none; outline: none; background: transparent;
          font-size: 12px;
        }
        .adem-help { font-size: 11px; color: rgba(48,64,53,0.45); margin-top: 4px; }
        .adem-error {
          display: flex; align-items: flex-start; gap: 8px;
          margin: 0 20px 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; font-size: 12px; font-weight: 500;
        }
        .adem-foot {
          flex-shrink: 0;
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 16px 20px;
          border-top: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
        }
        .adem-btn {
          padding: 10px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.18s; border: none;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .adem-cancel { background: transparent; color: rgba(48,64,53,0.6); }
        .adem-cancel:hover { background: rgba(48,64,53,0.06); color: #1a1614; }
        .adem-save {
          background: linear-gradient(135deg, #304035 0%, #3d5244 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(48,64,53,0.25);
        }
        .adem-save:hover:not(:disabled) {
          background: linear-gradient(135deg, #1f2a23 0%, #2a3a30 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(48,64,53,0.32);
        }
        .adem-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .adem-spin { animation: adem-spin 0.8s linear infinite; }
        @keyframes adem-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="adem-bg" role="dialog" aria-modal="true" onClick={() => { if (!saving) onClose(); }}>
        <div className="adem-card" onClick={(e) => e.stopPropagation()}>
          <div className="adem-head">
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3>Modifier le document</h3>
              <p>{doc.storedFile.originalName}</p>
            </div>
            <button type="button" className="adem-close" onClick={onClose} disabled={saving} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {error && (
            <div className="adem-error" role="alert">
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="adem-body">
            <div className="adem-row">
              <div className="adem-field">
                <label className="adem-label">Titre du document</label>
                <input
                  className="adem-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Ex : Kbis 2026"
                />
              </div>
              <div className="adem-field">
                <label className="adem-label">Catégorie</label>
                <select
                  className="adem-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="adem-field">
              <label className="adem-label">
                <Calendar style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                Date d'expiration (optionnelle)
              </label>
              <input
                className="adem-input"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              <p className="adem-help">
                Une alerte apparaîtra dans le tableau de bord à J-30 puis quand le document sera périmé.
              </p>
            </div>

            <div className="adem-field">
              <label className="adem-label">
                <TagIcon style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                Tags personnalisés ({tags.length}/10)
              </label>
              <div className="adem-tag-row" onClick={(e) => {
                if ((e.target as HTMLElement).classList.contains('adem-tag-row')) {
                  (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus();
                }
              }}>
                {tags.map((t) => (
                  <span key={t} className="adem-tag">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} aria-label={`Retirer ${t}`}>
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}
                <input
                  className="adem-tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                      setTags(tags.slice(0, -1));
                    }
                  }}
                  onBlur={addTag}
                  placeholder={tags.length === 0 ? "Ajouter un tag (Entrée)" : ""}
                  maxLength={32}
                />
              </div>
              <p className="adem-help">Ex : urgent, 2026, fournisseur-blum. Max 10 tags, 32 caractères chacun.</p>
            </div>

            <div className="adem-field">
              <label className="adem-label">Description / Notes</label>
              <textarea
                className="adem-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Notes internes (référence, contact, contexte…)"
              />
              <p className="adem-help">{description.length} / 2000 caractères</p>
            </div>
          </div>

          <div className="adem-foot">
            <button type="button" className="adem-btn adem-cancel" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className="adem-btn adem-save" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="adem-spin" style={{ width: 14, height: 14 }} />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save style={{ width: 14, height: 14 }} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
