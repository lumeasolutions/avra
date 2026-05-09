'use client';

/**
 * ConfirmModal — modale de confirmation réutilisable pour actions destructives.
 *
 * Remplace les `confirm()` natifs et les suppressions sans garde-fou. Cohérent
 * avec le branding AVRA (vert forêt #304035, doré #a67749, rouge danger).
 *
 * Usage :
 *   const [open, setOpen] = useState(false);
 *   <ConfirmModal
 *     open={open}
 *     title="Supprimer l'article ?"
 *     message="Cette action est irréversible."
 *     confirmLabel="Supprimer"
 *     danger
 *     onConfirm={() => { deleteItem(id); setOpen(false); }}
 *     onCancel={() => setOpen(false)}
 *   />
 *
 * Accessibilité :
 *   - Escape ferme via onCancel
 *   - Click backdrop ferme via onCancel
 *   - Focus auto sur le bouton "Annuler" (pas le bouton dangereux)
 *   - aria-modal + aria-labelledby
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message?: string;
  /** Texte du bouton de confirmation. Défaut : "Confirmer". */
  confirmLabel?: string;
  /** Texte du bouton d'annulation. Défaut : "Annuler". */
  cancelLabel?: string;
  /** Si vrai → bouton confirm en rouge, icône triangle d'alerte. */
  danger?: boolean;
  /** Désactive les boutons (ex. pendant un await). */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Escape ferme via onCancel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  // Focus initial sur "Annuler" (sécurité : éviter qu'un Enter accidentel valide une suppression)
  useEffect(() => {
    if (open) cancelBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const titleId = 'confirm-modal-title';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#304035]/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'cardIn 0.16s ease both' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(166,119,73,0.12)',
              color: danger ? '#ef4444' : '#a67749',
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-lg font-bold text-[#304035] leading-tight">
              {title}
            </h3>
            {message && (
              <p className="mt-1 text-sm text-[#304035]/65 leading-relaxed">
                {message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { if (!loading) onCancel(); }}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#f5eee8] transition-colors text-[#304035]/40 hover:text-[#304035] disabled:opacity-40"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-[#304035]/8 bg-[#f5eee8]/20 mt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-[#304035]/20 py-2.5 text-sm font-semibold text-[#304035] hover:bg-white transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{
              background: danger ? '#ef4444' : '#304035',
              boxShadow: danger
                ? '0 4px 12px rgba(239,68,68,0.25)'
                : '0 4px 12px rgba(48,64,53,0.20)',
            }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
