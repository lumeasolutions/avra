'use client';
/**
 * Téléchargement d'un devis en PDF / Word / Excel (menu compact).
 * Coordonnées société = Paramètres ; coordonnées client = devis, complétées
 * par le dossier lié (téléphone, code postal) — voir lib/devis-export.ts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, FileType2, Sheet, Loader2 } from 'lucide-react';
import { useConfigStore, useDossierStore, type Devis } from '@/store';
import { telechargerDevis, type ClientDevis, type FormatDevis } from '@/lib/devis-export';

/** Adresse complète d'un dossier (le code postal est un champ séparé). */
export function adresseDossier(d: { address?: string; postalCode?: string } | undefined): string {
  const adr = (d?.address ?? '').trim();
  const cp = (d?.postalCode ?? '').trim();
  if (!cp || adr.includes(cp)) return adr;
  return adr ? `${adr}, ${cp}` : cp;
}

/** Client du devis, complété par le dossier lié (téléphone, CP, email). */
export function clientPourDevis(devis: Devis): ClientDevis {
  const { dossiers, dossiersSignes } = useDossierStore.getState();
  const dos = devis.dossierId
    ? [...dossiers, ...dossiersSignes].find((x) => x.id === devis.dossierId)
    : undefined;
  return {
    nom: devis.client,
    adresse: devis.clientAddress?.trim() || adresseDossier(dos) || undefined,
    email: devis.clientEmail?.trim() || dos?.email || undefined,
    telephone: dos?.phone || undefined,
  };
}

const FORMATS: { key: FormatDevis; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: 'pdf', label: 'PDF', hint: 'À envoyer au client', icon: <FileText className="h-3.5 w-3.5 text-red-500" /> },
  { key: 'docx', label: 'Word', hint: 'Modifiable (.docx)', icon: <FileType2 className="h-3.5 w-3.5 text-blue-600" /> },
  { key: 'xlsx', label: 'Excel', hint: 'Calculs modifiables (.xlsx)', icon: <Sheet className="h-3.5 w-3.5 text-emerald-600" /> },
];

export function DevisDownload({ devis, compact = false }: { devis: Devis; compact?: boolean }) {
  const societe = useConfigStore((s) => s.societe);
  // Menu en position fixe, rendu dans <body> (portail) : les listes parentes
  // sont en overflow-hidden, et un parent avec `transform` (page dossier)
  // décalerait un menu fixe resté dans l'arbre DOM.
  const [open, setOpen] = useState<null | { top?: number; bottom?: number; right: number }>(null);
  const [busy, setBusy] = useState<FormatDevis | null>(null);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(null);
    };
    const fermer = () => setOpen(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', fermer);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', fermer, true);
      window.removeEventListener('resize', fermer);
    };
  }, [open]);

  const go = async (format: FormatDevis) => {
    setBusy(format); setErr('');
    try {
      await telechargerDevis(devis, societe, clientPourDevis(devis), format);
      setOpen(null);
    } catch (e) {
      console.error('[devis] export', e);
      setErr('Export impossible — réessayez.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          if (open) { setOpen(null); return; }
          const r = e.currentTarget.getBoundingClientRect();
          const right = Math.max(8, window.innerWidth - r.right);
          setErr('');
          setOpen(r.bottom + 190 > window.innerHeight
            ? { bottom: window.innerHeight - r.top + 4, right }
            : { top: r.bottom + 4, right });
        }}
        title="Télécharger (PDF, Word, Excel)"
        className={compact
          ? 'rounded-lg p-1.5 bg-[#304035]/5 hover:bg-[#304035]/10 text-[#304035]/60 hover:text-[#304035] transition-colors'
          : 'flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-[#304035]/15 bg-white hover:bg-[#304035]/5 text-[#304035] text-xs font-semibold transition-colors whitespace-nowrap'}
      >
        <Download className="h-3.5 w-3.5" />{!compact && 'Télécharger'}
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', ...open }} className="z-[60] w-56 rounded-xl border border-[#304035]/12 bg-white shadow-xl py-1">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={busy !== null}
              onClick={() => go(f.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f5eee8]/60 disabled:opacity-60"
            >
              {busy === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#304035]/50" /> : f.icon}
              <span className="flex-1">
                <span className="block text-xs font-semibold text-[#304035]">{f.label}</span>
                <span className="block text-[10px] text-[#304035]/45">{f.hint}</span>
              </span>
            </button>
          ))}
          {err && <p className="px-3 py-1.5 text-[10px] text-red-600">{err}</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}
