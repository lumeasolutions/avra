'use client';

/**
 * DateButoireValidationModal — modale "wahou" qui force la saisie des dates
 * butoires AVANT validation, avec en bonus à l'écran :
 *  - Le PLANNING GESTION (semaine courante) pour voir quels créneaux sont pris
 *  - Les DEVIS du dossier (DOSSIER AVANT VENTE) pour vérifier ce qui a été vendu
 *  - Les inputs de dates butoires (11 sous-dossiers signés)
 *
 * Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
 * Cette modale est BLOQUANTE : le bouton "Valider le projet" reste désactivé
 * tant qu'au moins une date manque.
 *
 * Effet wahou :
 *  - Backdrop radial sombre + blur progressif
 *  - Modal scale 0.86 → 1.02 → 1 avec rebond cubic-bezier
 *  - Header gradient vert + halos rotatifs + sparkles dorées
 *  - Icône calendar dans cercle qui pulse en boucle
 *  - Barre de progression dorée shimmer (devient verte à 100%)
 *  - Bouton "Valider" avec shimmer + glow quand tout est rempli
 *  - Bouton "Pré-remplir" qui suggère des délais standards par sous-dossier
 *  - Layout 2 colonnes responsive (1 colonne sur mobile)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, Sparkles, AlertTriangle, Check, Loader2,
  AlertCircle, Wand2, FileCheck, Receipt, CalendarDays, ChevronLeft, ChevronRight,
  Eye,
} from 'lucide-react';
import { usePlanningStore } from '@/store/usePlanningStore';
import type {
  SubFolder,
  DocumentFile,
} from '@/store/useDossierStore';
import {
  ARCHITECTE_PROJET_VERSION_REGEX,
  CUISINISTE_OPTION_REGEX,
  MENUISIER_PROJET_REGEX,
} from '@/store/useDossierStore';
import { getDocSignedUrl } from '@/lib/dossier-docs-api';

type Profession = 'architecte' | 'menuisier' | 'cuisiniste' | null;

export interface DateButoireValidationProps {
  open: boolean;
  /** Liste des labels de sous-dossiers signés à dater. */
  signedSubfolders: string[];
  /** ID du dossier en cours de validation — pour filtrer ses devis. */
  dossierId: string;
  /** Nom du client à afficher en titre. */
  clientName?: string;
  /** Sous-dossiers actifs du dossier (avec leurs documents). */
  subfolders?: SubFolder[];
  /** Métier de l'utilisateur — détermine quel sous-dossier est "le dernier projet". */
  profession?: Profession;
  loading?: boolean;
  onConfirm: (dates: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Suggestions de délais par défaut pour les sous-dossiers signés courants.
 * Délai en jours depuis aujourd'hui. Override possible si label inconnu (J+30).
 */
const DEFAULT_DELAYS: Record<string, number> = {
  'DOSSIER AVANT VENTE':   0,
  'PROJET VERSION 3':      7,
  'RELEVE DE MESURES':    10,
  'SUIVI DE CHANTIER':    14,
  'PLAN TECHNIQUE DCE':   30,
  'PERMIS DE CONSTRUIRE': 30,
  'COMMANDES':            45,
  'LIVRAISONS':           90,
  'FICHE DE POSE':        95,
  'RECEPTION CHANTIER':  120,
  'SAV':                 180,
};

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

function suggestDate(label: string): string {
  const days = DEFAULT_DELAYS[label] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDelta(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400_000);
}

export function DateButoireValidationModal({
  open, signedSubfolders, dossierId, clientName, subfolders, profession, loading, onConfirm, onCancel,
}: DateButoireValidationProps) {
  const planningEvents = usePlanningStore((s) => s.planningEvents);
  const gestEvents = usePlanningStore((s) => s.gestEvents);

  const [dates, setDates] = useState<Record<string, string>>({});
  // ID du doc en cours de chargement preview (loupe → spinner pendant fetch URL signée)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setDates({});
    setError(null);
    setWeekOffset(0);
  }, [open]);

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, loading, onCancel]);

  // ── Sous-dossier "dernier projet" selon la profession ────────────────────
  // Architecte : la version APD avec le numero le plus eleve (le projet final approuve)
  // Cuisiniste : l'OPTION avec le numero le plus eleve (l'option finale choisie)
  // Menuisier  : le PROJET avec le numero le plus eleve (le projet final)
  // Pour chaque cas, on remonte les documents qui s'y trouvent.
  const lastProjectSubfolder = useMemo<SubFolder | null>(() => {
    if (!subfolders || subfolders.length === 0) return null;

    let bestVersion = -1;
    let best: SubFolder | null = null;

    for (const sf of subfolders) {
      let version: number | null = null;
      if (profession === 'architecte') {
        const m = sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
        // On filtre sur APD uniquement (le projet final approuve)
        if (m && m[2].toUpperCase() === 'APD') version = parseInt(m[1], 10);
      } else if (profession === 'cuisiniste') {
        const m = sf.label.match(CUISINISTE_OPTION_REGEX);
        if (m) version = parseInt(m[1], 10);
      } else if (profession === 'menuisier') {
        const m = sf.label.match(MENUISIER_PROJET_REGEX);
        if (m) version = parseInt(m[1], 10);
      } else {
        // Pas de profession : on prend le dernier sous-dossier numerique connu (fallback)
        const m =
          sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX) ??
          sf.label.match(CUISINISTE_OPTION_REGEX) ??
          sf.label.match(MENUISIER_PROJET_REGEX);
        if (m) version = parseInt(m[1], 10);
      }
      if (version !== null && Number.isFinite(version) && version > bestVersion) {
        bestVersion = version;
        best = sf;
      }
    }
    return best;
  }, [subfolders, profession]);

  const lastProjectDocs = useMemo(() => {
    if (!lastProjectSubfolder?.documents) return [] as DocumentFile[];
    return lastProjectSubfolder.documents.map((d) =>
      typeof d === 'string' ? ({ name: d } as DocumentFile) : d,
    );
  }, [lastProjectSubfolder]);

  // ── Planning de la semaine courante (filtré par weekOffset) ──────────────
  const weekEvents = useMemo(() => {
    const fromPlanning: Array<{ day: number; startHour: number; duration: number; title: string; color: string }> =
      planningEvents
        .filter((e) => (e.weekOffset ?? 0) === weekOffset)
        .map((e) => ({ day: e.day, startHour: e.startHour, duration: e.duration, title: e.title, color: e.color }));
    const fromGest: typeof fromPlanning =
      gestEvents
        .filter((e) => e.weekOffset === weekOffset)
        .map((e) => ({
          day: e.day,
          startHour: e.startHour,
          duration: e.duration,
          title: e.client,
          color: e.type === 'POSE' ? '#4a7ec0' : e.type === 'LIVRAISON' ? '#c08a5a' : '#7c3a1e',
        }));
    return [...fromPlanning, ...fromGest];
  }, [planningEvents, gestEvents, weekOffset]);

  // ── Computed ─────────────────────────────────────────────────────────────
  const filledCount = useMemo(
    () => signedSubfolders.filter((l) => !!dates[l]).length,
    [signedSubfolders, dates],
  );
  const total = signedSubfolders.length;
  const allFilled = total > 0 && filledCount === total;
  const progressPct = total === 0 ? 0 : Math.round((filledCount / total) * 100);

  const today = new Date().toISOString().slice(0, 10);

  const handlePrefill = () => {
    const next: Record<string, string> = {};
    for (const label of signedSubfolders) next[label] = suggestDate(label);
    setDates(next);
    setError(null);
  };

  /**
   * Ouvre le doc dans un nouvel onglet (preview) sans fermer le modal.
   * - Backend (docId) : fetch URL signée fraîche puis window.open
   * - Legacy (dataUrl) : ouverture directe via blob URL
   * - Placeholder pur (ni docId ni dataUrl) : on indique "indisponible"
   */
  const handlePreviewDoc = async (doc: DocumentFile) => {
    const previewKey = doc.docId ?? doc.name;
    if (doc.dataUrl) {
      window.open(doc.dataUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!doc.docId || !dossierId) return;
    setPreviewLoadingId(previewKey);
    try {
      const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[validation-modal] preview failed:', err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!allFilled) {
      setError('Toutes les dates butoires doivent être renseignées avant la validation.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await onConfirm(dates);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la validation');
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Plage horaire affichée : on prend min/max des events visibles (avec borne 8h-19h par défaut)
  const hourFrom = Math.min(8, ...weekEvents.map((e) => e.startHour));
  const hourTo = Math.max(19, ...weekEvents.map((e) => e.startHour + e.duration));
  const hours = Array.from({ length: hourTo - hourFrom + 1 }, (_, i) => hourFrom + i);

  return (
    <>
      <style>{`
        @keyframes dbvFade {
          from { opacity: 0; backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        }
        @keyframes dbvReveal {
          0%   { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(6px); }
          60%  { opacity: 1; transform: scale(1.01) translateY(0); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes dbvHaloRot { to { transform: rotate(360deg); } }
        @keyframes dbvIconPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 179, 138, 0.55); }
          50%      { box-shadow: 0 0 0 14px rgba(217, 179, 138, 0); }
        }
        @keyframes dbvSparkle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translateY(-12px) scale(1.15); opacity: 0.85; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-30px) scale(0.85); opacity: 0; }
        }
        @keyframes dbvShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dbvRowIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dbv-shine {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes dbv-spin { to { transform: rotate(360deg); } }

        .dbv-bg {
          position: fixed; inset: 0; z-index: 90;
          background: radial-gradient(ellipse at center, rgba(48,64,53,0.65) 0%, rgba(8,12,10,0.88) 75%);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          animation: dbvFade 0.32s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .dbv-card {
          width: 100%;
          max-width: 1200px;
          max-height: 95vh;
          background: #fff;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            0 0 0 1px rgba(48,64,53,0.06),
            0 40px 100px rgba(0,0,0,0.5),
            0 12px 30px rgba(48,64,53,0.22),
            inset 0 1px 0 rgba(255,255,255,0.9);
          animation: dbvReveal 0.55s cubic-bezier(0.34, 1.42, 0.64, 1);
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        .dbv-head {
          position: relative; overflow: hidden; flex-shrink: 0;
          padding: 18px 22px 20px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
          color: #fff;
        }
        .dbv-head::before, .dbv-head::after {
          content: ''; position: absolute; pointer-events: none;
          border-radius: 50%;
        }
        .dbv-head::before {
          top: -45%; left: -8%; width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(217,179,138,0.42) 0%, rgba(217,179,138,0.1) 40%, transparent 70%);
          animation: dbvHaloRot 18s linear infinite;
        }
        .dbv-head::after {
          bottom: -38%; right: -6%; width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(74,163,80,0.25) 0%, transparent 60%);
          animation: dbvHaloRot 24s linear infinite reverse;
        }
        .dbv-spark {
          position: absolute; width: 4px; height: 4px;
          border-radius: 50%; background: #d9b38a;
          box-shadow: 0 0 8px rgba(217,179,138,0.9), 0 0 14px rgba(217,179,138,0.4);
          animation: dbvSparkle 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        .dbv-row { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .dbv-titles { display: flex; align-items: center; gap: 14px; }
        .dbv-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: radial-gradient(circle at 30% 30%, #f4d6a8 0%, #d9b38a 50%, #b88c5c 100%);
          color: #2a3a30; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          animation: dbvIconPulse 2.4s ease-in-out infinite;
          box-shadow: 0 6px 18px rgba(217,179,138,0.4);
        }
        .dbv-titles h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
        .dbv-titles p { margin: 2px 0 0; font-size: 11.5px; color: rgba(255,255,255,0.65); }

        .dbv-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .dbv-close:hover:not(:disabled) { background: rgba(255,255,255,0.22); transform: rotate(90deg); }
        .dbv-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .dbv-progress { position: relative; z-index: 1; margin-top: 12px; display: flex; align-items: center; gap: 14px; }
        .dbv-progress-pct {
          font-size: 22px; font-weight: 800; color: #fff;
          letter-spacing: -0.02em; line-height: 1;
        }
        .dbv-progress-pct.complete { color: #86efac; text-shadow: 0 0 14px rgba(134,239,172,0.5); }
        .dbv-progress-bar-wrap { flex: 1; }
        .dbv-progress-bar {
          height: 8px; border-radius: 999px;
          background: rgba(255,255,255,0.12);
          overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
          margin-top: 4px;
        }
        .dbv-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d9b38a 0%, #f0c785 50%, #d9b38a 100%);
          background-size: 200% 100%;
          animation: dbvShimmer 2.4s linear infinite;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 12px rgba(217,179,138,0.5);
        }
        .dbv-progress-fill.complete {
          background: linear-gradient(90deg, #22c55e 0%, #86efac 50%, #22c55e 100%);
          background-size: 200% 100%;
          box-shadow: 0 0 14px rgba(134,239,172,0.7);
        }
        .dbv-progress-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.55); font-weight: 700; }

        /* Body — 2 colonnes */
        .dbv-body {
          flex: 1; overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: linear-gradient(180deg, #fbf8f3 0%, #fff 100%);
        }
        @media (max-width: 900px) {
          .dbv-body { grid-template-columns: 1fr; }
        }
        .dbv-col-left { display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow-y: auto; border-right: 1px solid rgba(48,64,53,0.08); }
        .dbv-col-right { display: flex; flex-direction: column; padding: 16px; overflow-y: auto; }
        @media (max-width: 900px) {
          .dbv-col-left { border-right: none; border-bottom: 1px solid rgba(48,64,53,0.08); }
        }

        /* Sections cards */
        .dbv-section {
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(48,64,53,0.08);
          overflow: hidden;
        }
        .dbv-section-head {
          display: flex; align-items: center; gap: 8px; justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(48,64,53,0.06);
          background: linear-gradient(135deg, #f5eee8 0%, #faf6ef 100%);
        }
        .dbv-section-title {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #304035;
        }
        .dbv-section-title svg { color: #a67749; }

        /* Planning gestion mini */
        .dbv-plan-nav { display: inline-flex; align-items: center; gap: 6px; }
        .dbv-plan-nav button {
          width: 22px; height: 22px; border-radius: 6px;
          border: 1px solid rgba(48,64,53,0.12);
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(48,64,53,0.55);
          transition: all 0.15s ease;
        }
        .dbv-plan-nav button:hover { background: rgba(48,64,53,0.06); color: #1a1614; }
        .dbv-plan-nav span { font-size: 11px; font-weight: 700; color: rgba(48,64,53,0.7); min-width: 60px; text-align: center; }

        .dbv-plan-grid {
          display: grid;
          grid-template-columns: 36px repeat(7, minmax(0, 1fr));
          background: #fafaf7;
          font-size: 10px;
          height: 100%;
        }
        .dbv-plan-headcell {
          padding: 6px 4px; text-align: center;
          font-weight: 800; color: rgba(48,64,53,0.6);
          background: #fff;
          border-bottom: 1px solid rgba(48,64,53,0.08);
        }
        .dbv-plan-hour {
          padding: 4px;
          text-align: right;
          color: rgba(48,64,53,0.45);
          font-family: 'Courier New', monospace;
          border-right: 1px solid rgba(48,64,53,0.06);
          font-size: 9px;
          background: #fff;
        }
        .dbv-plan-cell {
          position: relative;
          height: 28px;
          border-right: 1px solid rgba(48,64,53,0.04);
          border-bottom: 1px solid rgba(48,64,53,0.04);
        }
        .dbv-plan-event {
          position: absolute; left: 2px; right: 2px; top: 1px;
          padding: 2px 5px;
          border-radius: 5px;
          font-size: 9px; font-weight: 700;
          color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }
        .dbv-plan-empty {
          padding: 18px 12px;
          text-align: center;
          font-size: 11px;
          color: rgba(48,64,53,0.4);
        }

        /* Devis list */
        .dbv-devis-list { display: flex; flex-direction: column; gap: 6px; padding: 10px; max-height: 240px; overflow-y: auto; }
        .dbv-devis-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          border: 1px solid rgba(48,64,53,0.08);
          background: #fff;
          transition: all 0.16s ease;
        }
        .dbv-devis-row:hover { border-color: rgba(166,119,73,0.3); background: #fff8ef; }
        .dbv-devis-icon {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(135deg, #fff8ef, #ffe7c2);
          color: #a67749;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 11px;
        }
        .dbv-devis-info { flex: 1; min-width: 0; }
        .dbv-devis-ref { font-size: 12px; font-weight: 700; color: #1a1614; }
        .dbv-devis-meta { font-size: 10.5px; color: rgba(48,64,53,0.5); margin-top: 1px; }
        .dbv-devis-amount { font-size: 12px; font-weight: 800; color: #16a34a; flex-shrink: 0; }
        .dbv-devis-amount.neg { color: rgba(48,64,53,0.4); }

        /* Bouton loupe pour preview document */
        .dbv-preview-btn {
          flex-shrink: 0;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.1);
          background: #fff;
          color: rgba(48,64,53,0.55);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.16s ease;
        }
        .dbv-preview-btn:hover:not(:disabled) {
          border-color: #a67749;
          background: #fff8ef;
          color: #a67749;
          transform: scale(1.06);
          box-shadow: 0 2px 8px rgba(166,119,73,0.22);
        }
        .dbv-preview-btn:active:not(:disabled) { transform: scale(0.96); }
        .dbv-preview-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .dbv-empty {
          padding: 28px 16px;
          text-align: center;
          color: rgba(48,64,53,0.4);
          font-size: 11.5px;
        }

        /* Dates butoires (right column) */
        .dbv-warn {
          display: flex; gap: 10px;
          padding: 11px 14px;
          margin-bottom: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border: 1px solid rgba(249,115,22,0.25);
          color: #9a3412;
          font-size: 12px; line-height: 1.5;
        }
        .dbv-warn-icon { color: #ea580c; flex-shrink: 0; margin-top: 1px; }

        .dbv-prefill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; margin-bottom: 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          border: 1px solid rgba(166,119,73,0.3);
          color: #7c4f1d; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
        }
        .dbv-prefill:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(166,119,73,0.25);
          border-color: #a67749;
        }
        .dbv-prefill:disabled { opacity: 0.5; cursor: not-allowed; }

        .dbv-list { display: flex; flex-direction: column; gap: 7px; }
        .dbv-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.16s ease;
          animation: dbvRowIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .dbv-item:hover { border-color: rgba(166,119,73,0.4); }
        .dbv-item.filled {
          background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
          border-color: rgba(34,197,94,0.3);
        }
        .dbv-item-bullet {
          width: 24px; height: 24px; border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800;
          background: rgba(48,64,53,0.08);
          color: rgba(48,64,53,0.55);
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.2s ease;
        }
        .dbv-item.filled .dbv-item-bullet {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; border-color: #16a34a;
          box-shadow: 0 3px 8px rgba(34,197,94,0.3);
        }
        .dbv-item-label {
          flex: 1; min-width: 0;
          font-size: 12px; font-weight: 700;
          color: #1a1614;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dbv-item-input {
          flex-shrink: 0; width: 145px;
          padding: 6px 8px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 7px;
          background: #fff;
          font-size: 11.5px; color: #1a1614;
          font-family: inherit;
          transition: all 0.16s ease;
        }
        .dbv-item-input:focus {
          outline: none;
          border-color: #a67749;
          box-shadow: 0 0 0 3px rgba(166,119,73,0.18);
        }
        .dbv-item.filled .dbv-item-input { border-color: rgba(34,197,94,0.4); }
        .dbv-item-delta {
          flex-shrink: 0;
          font-size: 10px; font-weight: 700;
          color: rgba(48,64,53,0.55);
          font-family: 'Courier New', monospace;
          min-width: 42px; text-align: right;
        }
        .dbv-item.filled .dbv-item-delta { color: #16a34a; }

        /* Footer */
        .dbv-foot {
          flex-shrink: 0;
          display: flex; gap: 10px; align-items: center; justify-content: flex-end;
          padding: 14px 22px;
          border-top: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
        }
        .dbv-error {
          flex: 1;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #b91c1c; font-weight: 600;
          margin-right: 10px;
        }

        .dbv-btn {
          padding: 10px 20px; border-radius: 11px;
          font-size: 13px; font-weight: 800;
          cursor: pointer; transition: all 0.2s ease; border: none;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.01em;
        }
        .dbv-cancel {
          background: rgba(48,64,53,0.05); color: #1a1614;
          border: 1px solid rgba(48,64,53,0.1);
        }
        .dbv-cancel:hover:not(:disabled) { background: rgba(48,64,53,0.1); }

        .dbv-confirm {
          background: linear-gradient(135deg, rgba(48,64,53,0.6) 0%, rgba(48,64,53,0.5) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          position: relative; overflow: hidden;
        }
        .dbv-confirm.ready {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff; cursor: pointer;
          box-shadow: 0 8px 22px rgba(34,197,94,0.4);
          animation: dbvIconPulse 2s ease-in-out infinite;
        }
        .dbv-confirm.ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(34,197,94,0.5);
        }
        .dbv-confirm.ready::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%);
          transform: translateX(-100%);
          animation: dbv-shine 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .dbv-confirm:disabled, .dbv-confirm:disabled:hover {
          background: linear-gradient(135deg, rgba(48,64,53,0.5) 0%, rgba(48,64,53,0.4) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          box-shadow: none;
          transform: none; animation: none;
        }
        .dbv-confirm.submitting { animation: none; cursor: wait; }
        .dbv-spin { animation: dbv-spin 0.9s linear infinite; }
      `}</style>

      <div
        className="dbv-bg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dbv-h2"
        onClick={() => { if (!submitting && !loading) onCancel(); }}
      >
        <div className="dbv-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="dbv-head">
            {[
              { left: '14%', bottom: '18%', delay: '0s' },
              { left: '36%', bottom: '60%', delay: '0.7s' },
              { left: '58%', bottom: '24%', delay: '1.4s' },
              { left: '82%', bottom: '50%', delay: '0.4s' },
              { left: '92%', bottom: '14%', delay: '2.1s' },
              { left: '24%', bottom: '78%', delay: '1.8s' },
            ].map((p, i) => (
              <span key={i} className="dbv-spark" style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }} />
            ))}

            <div className="dbv-row">
              <div className="dbv-titles">
                <div className="dbv-icon"><Calendar style={{ width: 24, height: 24 }} /></div>
                <div>
                  <h2 id="dbv-h2">Validation projet</h2>
                  <p>{clientName ? `Dossier ${clientName} · ` : ''}Renseignez les dates butoires avant de valider</p>
                </div>
              </div>
              <button
                type="button"
                className="dbv-close"
                onClick={onCancel}
                disabled={submitting || loading}
                aria-label="Fermer"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="dbv-progress">
              <span className={`dbv-progress-pct${allFilled ? ' complete' : ''}`}>{progressPct}%</span>
              <div className="dbv-progress-bar-wrap">
                <div className="dbv-progress-label">{filledCount} / {total} dates renseignées</div>
                <div className="dbv-progress-bar">
                  <div className={`dbv-progress-fill${allFilled ? ' complete' : ''}`} style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Body — 2 colonnes */}
          <div className="dbv-body">
            {/* COLONNE GAUCHE : Planning gestion + Devis */}
            <div className="dbv-col-left">
              <div className="dbv-section">
                <div className="dbv-section-head">
                  <span className="dbv-section-title">
                    <CalendarDays style={{ width: 13, height: 13 }} />
                    Planning gestion
                  </span>
                  <div className="dbv-plan-nav">
                    <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semaine précédente">
                      <ChevronLeft style={{ width: 12, height: 12 }} />
                    </button>
                    <span>{weekOffset === 0 ? 'Cette semaine' : weekOffset > 0 ? `+${weekOffset} sem.` : `${weekOffset} sem.`}</span>
                    <button type="button" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semaine suivante">
                      <ChevronRight style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>

                {/* Grille toujours visible (meme sans evenement) — l'utilisateur
                    voit immediatement quels creneaux sont libres pour planifier. */}
                <div className="dbv-plan-grid">
                  <div className="dbv-plan-headcell">·</div>
                  {DAYS.map((d) => <div key={d} className="dbv-plan-headcell">{d}</div>)}
                  {hours.map((h) => (
                    <div key={`row-${h}`} style={{ display: 'contents' }}>
                      <div className="dbv-plan-hour">{h}h</div>
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const evt = weekEvents.find((e) => e.day === day && e.startHour === h);
                        return (
                          <div key={`c-${h}-${day}`} className="dbv-plan-cell">
                            {evt && (
                              <div
                                className="dbv-plan-event"
                                style={{
                                  background: evt.color,
                                  height: `${Math.max(1, evt.duration) * 28 - 2}px`,
                                }}
                                title={evt.title}
                              >
                                {evt.title}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="dbv-section">
                <div className="dbv-section-head">
                  <span className="dbv-section-title">
                    <Receipt style={{ width: 13, height: 13 }} />
                    {profession === 'architecte' ? 'Dossier APD' : 'Dernier projet'}
                  </span>
                  {lastProjectSubfolder && (
                    <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.55)', fontWeight: 700 }}>
                      {lastProjectSubfolder.label}
                    </span>
                  )}
                </div>
                {!lastProjectSubfolder ? (
                  <div className="dbv-empty">
                    {profession === 'architecte'
                      ? 'Aucun PROJET VERSION X – APD trouvé dans ce dossier'
                      : profession === 'cuisiniste'
                      ? 'Aucune OPTION trouvée dans ce dossier'
                      : profession === 'menuisier'
                      ? 'Aucun PROJET trouvé dans ce dossier'
                      : 'Aucun projet trouvé'}
                  </div>
                ) : lastProjectDocs.length === 0 ? (
                  <div className="dbv-empty">
                    « {lastProjectSubfolder.label} » ne contient aucun document
                  </div>
                ) : (
                  <div className="dbv-devis-list">
                    {lastProjectDocs.map((doc, i) => {
                      const previewKey = doc.docId ?? doc.name;
                      const canPreview = !!(doc.docId || doc.dataUrl);
                      const isLoading = previewLoadingId === previewKey;
                      return (
                        <div key={i} className="dbv-devis-row">
                          <div className="dbv-devis-icon">
                            <Receipt style={{ width: 13, height: 13 }} />
                          </div>
                          <div className="dbv-devis-info">
                            <div className="dbv-devis-ref" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </div>
                            <div className="dbv-devis-meta">
                              {(doc.size || doc.type) && (
                                <>
                                  {doc.size ? `${(doc.size / 1024).toFixed(0)} Ko` : ''}
                                  {doc.size && doc.type ? ' · ' : ''}
                                  {doc.type ?? ''}
                                </>
                              )}
                              {!doc.size && !doc.type && doc.addedAt ? `Ajouté le ${doc.addedAt}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="dbv-preview-btn"
                            onClick={() => canPreview && handlePreviewDoc(doc)}
                            disabled={!canPreview || isLoading}
                            title={canPreview ? 'Voir le document' : 'Aperçu indisponible (placeholder sans contenu)'}
                            aria-label={`Voir ${doc.name}`}
                          >
                            {isLoading ? (
                              <Loader2 style={{ width: 14, height: 14, animation: 'dbv-spin 0.9s linear infinite' }} />
                            ) : (
                              <Eye style={{ width: 14, height: 14 }} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* COLONNE DROITE : Dates butoires */}
            <div className="dbv-col-right">
              <div className="dbv-warn">
                <AlertTriangle className="dbv-warn-icon" style={{ width: 16, height: 16 }} />
                <div>
                  Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
                  <strong> La validation est bloquée tant que toutes les dates ne sont pas saisies.</strong>
                </div>
              </div>

              <button
                type="button"
                className="dbv-prefill"
                onClick={handlePrefill}
                disabled={submitting || loading}
                title="Remplit avec des délais standards (modifiables ensuite)"
              >
                <Wand2 style={{ width: 12, height: 12 }} />
                <Sparkles style={{ width: 11, height: 11 }} />
                Pré-remplir avec des délais standards
              </button>

              <div className="dbv-list">
                {signedSubfolders.map((label, i) => {
                  const value = dates[label] ?? '';
                  const isFilled = !!value;
                  const delta = isFilled ? dayDelta(value) : 0;
                  return (
                    <div
                      key={label}
                      className={`dbv-item${isFilled ? ' filled' : ''}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="dbv-item-bullet">
                        {isFilled ? <Check style={{ width: 12, height: 12 }} /> : i + 1}
                      </div>
                      <span className="dbv-item-label" title={label}>{label}</span>
                      {isFilled && (
                        <span className="dbv-item-delta">
                          {delta === 0 ? "auj." : delta > 0 ? `J+${delta}` : `J${delta}`}
                        </span>
                      )}
                      <input
                        type="date"
                        className="dbv-item-input"
                        min={today}
                        value={value}
                        onChange={(e) => setDates((s) => ({ ...s, [label]: e.target.value }))}
                        disabled={submitting || loading}
                        aria-label={`Date butoire pour ${label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="dbv-foot">
            {error && (
              <div className="dbv-error" role="alert">
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
            <button
              type="button"
              className="dbv-btn dbv-cancel"
              onClick={onCancel}
              disabled={submitting || loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`dbv-btn dbv-confirm${allFilled ? ' ready' : ''}${submitting ? ' submitting' : ''}`}
              onClick={handleSubmit}
              disabled={!allFilled || submitting || loading}
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="dbv-spin" style={{ width: 14, height: 14 }} />
                  Validation…
                </>
              ) : (
                <>
                  <FileCheck style={{ width: 14, height: 14 }} />
                  {allFilled ? 'Valider le projet' : `Encore ${total - filledCount} date${total - filledCount > 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
