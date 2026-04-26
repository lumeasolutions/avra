'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen, FileText, ImageIcon, Ruler, CheckCircle, ArrowLeft,
  GitCompare, AlertTriangle, Plus, ChevronRight, Tag, Phone, Mail,
  MapPin, Calendar, Receipt, FileCheck, StickyNote, Pencil, X,
  Clock, Circle, TrendingUp, Zap, Eye, Download, Check, CornerDownRight, LayoutDashboard, LayoutGrid, List
} from 'lucide-react';
import { useDossierStore, useFacturationStore } from '@/store';
import type { DocumentFile, SubFolderDocument } from '@/store/useDossierStore';
import { MENUISIER_PROJET_REGEX, ARCHITECTE_PROJET_VERSION_REGEX, ARCHITECTE_MAX_VERSION, CUISINISTE_OPTION_REGEX, CUISINISTE_MAX_OPTION } from '@/store/useDossierStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Trash2 } from 'lucide-react';
import { uploadDossierDoc, listDossierDocs, getDocSignedUrl, deleteDossierDoc } from '@/lib/dossier-docs-api';
import { DocThumbnail } from '@/components/dossiers/DocThumbnail';
import { useProjectActions } from '@/hooks/useProjectActions';

/** Normalise un document (string legacy ou objet) pour affichage. */
const normalizeDoc = (d: SubFolderDocument): DocumentFile =>
  typeof d === 'string' ? { name: d } : d;

/** Formate une taille (o, Ko, Mo). */
const formatSize = (bytes?: number): string => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
};

/**
 * Résout une URL d'accès pour un document :
 *  - Document API (docId) → demande une URL signée fraîche au backend (1 h)
 *  - Ancien format dataUrl → fallback local (documents pré-migration)
 *  - Rien → null
 */
async function resolveDocUrl(dossierId: string, doc: DocumentFile): Promise<string | null> {
  if (doc.docId) {
    try {
      const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId);
      return signedUrl;
    } catch (err) {
      console.error('[signedUrl]', err);
      return doc.dataUrl ?? null;
    }
  }
  return doc.dataUrl ?? null;
}

/** Déclenche le téléchargement via URL signée fraîche. */
async function downloadDoc(dossierId: string, doc: DocumentFile) {
  const src = await resolveDocUrl(dossierId, doc);
  if (!src) return;
  const a = document.createElement('a');
  a.href = src;
  a.download = doc.name;
  if (doc.docId && !doc.dataUrl) a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ── CONFIG STATUT ── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow: string; dot: string; Icon: React.ElementType }> = {
  'URGENT':    { label: 'URGENT',    bg: '#ef4444', text: 'white', border: '#fca5a5', glow: 'rgba(239,68,68,0.3)',    dot: '#ef4444', Icon: AlertTriangle },
  'EN COURS':  { label: 'EN COURS',  bg: '#f97316', text: 'white', border: '#fdba74', glow: 'rgba(249,115,22,0.3)',   dot: '#f97316', Icon: Clock },
  'FINITION':  { label: 'FINITION',  bg: '#10b981', text: 'white', border: '#6ee7b7', glow: 'rgba(16,185,129,0.3)',   dot: '#10b981', Icon: CheckCircle },
  'A VALIDER': { label: 'À VALIDER', bg: '#4ade80', text: 'white', border: '#bbf7d0', glow: 'rgba(74,222,128,0.3)',   dot: '#4ade80', Icon: Circle },
};
const STATUS_ORDER = ['URGENT', 'EN COURS', 'FINITION', 'A VALIDER'];
const PROGRESS_MAP: Record<string, number> = { 'URGENT': 15, 'EN COURS': 50, 'FINITION': 80, 'A VALIDER': 95 };

/* ── ÉTAPES PROGRESSION ── */
const STEPS = [
  { key: 'renseignement', label: 'Renseignement', statuses: ['URGENT'] },
  { key: 'en_cours',      label: 'En cours',       statuses: ['EN COURS'] },
  { key: 'finition',      label: 'Finition',        statuses: ['FINITION'] },
  { key: 'validation',    label: 'Validation',      statuses: ['A VALIDER'] },
];

function avatarColor(name: string) {
  const palettes = [
    ['#2d5a30', '#4aa350'], ['#7c3a1e', '#c08a5a'],
    ['#1e3a5f', '#4a7ec0'], ['#5a2d5a', '#c04aa3'],
    ['#3a4a1e', '#7ec04a'], ['#1a4a4a', '#4ac0c0'],
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

const getIconForType = (type?: string) => {
  switch (type) {
    case 'photo':    return <ImageIcon className="h-4 w-4" />;
    case 'measure':  return <Ruler className="h-4 w-4" />;
    case 'project':  return <FileText className="h-4 w-4" />;
    case 'approval': return <CheckCircle className="h-4 w-4" />;
    default:         return <FileText className="h-4 w-4" />;
  }
};

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const dossiers          = useDossierStore(s => s.dossiers);
  const dossiersSignes    = useDossierStore(s => s.dossiersSignes);
  const allInvoices       = useFacturationStore(s => s.invoices);
  const dossier           = [...dossiers, ...dossiersSignes].find(d => d.id === id);
  const invoices          = allInvoices.filter(i => i.dossierId === id);
  // Actions persistées en DB via l'API (double-write : optimistic local + API)
  const { signProject, updateProjectStatus } = useProjectActions();
  // Actions uniquement locales (pas encore d'endpoint API dédié).
  // NOTE : subfolders, validation, notes sont conservés en localStorage.
  // Pour les rendre multi-device, il faudra ajouter des endpoints backend
  // (cf. AUDIT_DOSSIERS_DOCUMENTS.md fix #6).
  const addSubfolder      = useDossierStore(s => s.addSubfolder);
  const removeSubfolder   = useDossierStore(s => s.removeSubfolder);
  const toggleSubfolderValidated = useDossierStore(s => s.toggleSubfolderValidated);
  const addDocumentToSubfolder = useDossierStore(s => s.addDocumentToSubfolder);
  const removeDocumentFromSubfolder = useDossierStore(s => s.removeDocumentFromSubfolder);
  const ensureDefaultSubfolders = useDossierStore(s => s.ensureDefaultSubfolders);
  const updateDossierNotes = useDossierStore(s => s.updateDossierNotes);
  const profession = useAuthStore(s => s.profession);
  const isMenuisier = profession === 'menuisier';
  const isArchitecte = profession === 'architecte';
  const isCuisiniste = profession === 'cuisiniste';

  // Modale de confirmation de suppression d'un sous-dossier
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; docsCount: number } | null>(null);

  // Backfill : complète les dossiers créés avant l'ajout des sous-dossiers par défaut
  useEffect(() => {
    if (id) ensureDefaultSubfolders(id, profession);
  }, [id, ensureDefaultSubfolders, profession]);

  // ────────────────────────────────────────────────────────────────────
  // Réhydratation depuis le backend (source de vérité = DB).
  // Au chargement, on liste tous les documents du dossier côté API et on
  // complète le store local avec ceux qui manquent (identification par docId).
  // Si un document référence un sous-dossier inconnu, on le crée à la volée
  // afin de ne jamais perdre un upload. Fallback "AUTRES" si label vide.
  // Erreur réseau silencieuse : l'état local est conservé.
  // ────────────────────────────────────────────────────────────────────
  const [loadingDocs, setLoadingDocs] = useState(false);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoadingDocs(true);
      try {
        const remote = await listDossierDocs(id);
        if (cancelled) return;
        // Snapshot du store après backfill, pour repérer les docIds déjà connus
        const dossierNow = [
          ...useDossierStore.getState().dossiers,
          ...useDossierStore.getState().dossiersSignes,
        ].find(d => d.id === id);
        if (!dossierNow) return;

        const existingDocIds = new Set<string>();
        const existingLabels = new Set<string>();
        const subs = 'signedSubfolders' in dossierNow
          ? (dossierNow as any).signedSubfolders
          : dossierNow.subfolders;
        for (const sf of subs ?? []) {
          existingLabels.add(sf.label);
          for (const d of (sf.documents ?? [])) {
            if (typeof d !== 'string' && d.docId) existingDocIds.add(d.docId);
          }
        }

        const FALLBACK_LABEL = 'AUTRES';

        for (const doc of remote) {
          if (existingDocIds.has(doc.id)) continue; // déjà dans le store
          // Détermine le sous-dossier cible
          let targetLabel = (doc.subfolderLabel ?? '').trim() || FALLBACK_LABEL;
          // Sous-dossier inconnu dans le store ? on le crée à la volée
          if (!existingLabels.has(targetLabel)) {
            addSubfolder(id, targetLabel);
            existingLabels.add(targetLabel);
          }
          addDocumentToSubfolder(id, targetLabel, {
            docId: doc.id,
            name: doc.originalName,
            type: doc.mimeType ?? undefined,
            size: doc.sizeBytes ?? undefined,
            addedAt: doc.createdAt,
          });
          existingDocIds.add(doc.id);
        }
      } catch {
        // silencieux : on conserve l'état local (hors ligne / non authentifié)
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addInvoice        = useFacturationStore(s => s.addInvoice);

  const [showDevis,     setShowDevis]     = useState(false);
  const [showStatus,    setShowStatus]    = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);

  // Fermeture clavier du tableau de bord
  useEffect(() => {
    if (!showDashboard) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDashboard(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showDashboard]);
  const [newFolderLabel, setNewFolderLabel] = useState('');
  // Modal "documents dans le sous-dossier"
  const [openedSubfolder, setOpenedSubfolder] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  // États transitoires pour les opérations docs (loading + erreur visible).
  const [docOpStatus, setDocOpStatus] = useState<{ kind: 'idle' | 'uploading' | 'deleting' | 'error' | 'success'; message?: string }>({ kind: 'idle' });

  // Mode d'affichage des docs dans le modal sous-dossier (liste / grille).
  // Préférence persistée localStorage pour rester cohérent entre sessions.
  const [docsViewMode, setDocsViewMode] = useState<'list' | 'grid'>('list');
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('avra-dossier-docs-view');
    if (saved === 'grid' || saved === 'list') setDocsViewMode(saved);
  }, []);
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('avra-dossier-docs-view', docsViewMode);
  }, [docsViewMode]);
  // Document en cours de prévisualisation (plein écran) + URL signée résolue
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openPreview = async (doc: DocumentFile) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    const url = await resolveDocUrl(id, doc);
    setPreviewUrl(url);
  };
  const closePreview = () => { setPreviewDoc(null); setPreviewUrl(null); };
  const [devisObjet,    setDevisObjet]    = useState('');
  const [devisMontant,  setDevisMontant]  = useState('');
  const [devisTva,      setDevisTva]      = useState('20');
  // Les notes sont synchronisées avec le store (persistées en localStorage).
  // Valeur initiale = celle du dossier en store ; les changements sont propagés
  // via updateDossierNotes.
  const [notes,         setNotesLocal]    = useState(dossier?.notes ?? '');
  const [editingNotes,  setEditingNotes]  = useState(false);
  const setNotes = (v: string) => {
    setNotesLocal(v);
    if (id) updateDossierNotes(id, v);
  };
  // Re-synchronise notes quand le dossier change (navigation, sync API)
  useEffect(() => {
    setNotesLocal(dossier?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier?.id]);

  if (!dossier) {
    return (
      <div className="space-y-6 w-full">
        <Link href="/dossiers" className="inline-flex items-center gap-2 text-sm font-medium text-[#304035]/60 hover:text-[#304035] transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux dossiers
        </Link>
        <div className="rounded-2xl bg-white p-12 text-center shadow-md border border-[#304035]/8 w-full" style={{ minHeight: 300 }}>
          <FolderOpen className="h-16 w-16 text-[#304035]/20 mx-auto mb-4" />
          <p className="text-[#304035]/60 font-medium">Dossier introuvable</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[dossier.status] ?? STATUS_CONFIG['EN COURS'];
  const StatusIcon = cfg.Icon;
  // Progression reelle : ratio de sous-dossiers valides sur le total.
  // PROGRESS_MAP servait de fallback simule quand il n'y avait pas encore de validations.
  const totalSubs = dossier.subfolders.length;
  const validatedSubs = dossier.subfolders.filter(sf => sf.validated).length;
  const progress = totalSubs === 0
    ? (PROGRESS_MAP[dossier.status] ?? 0)
    : Math.round((validatedSubs / totalSubs) * 100);
  const [c1, c2] = avatarColor(dossier.name);
  const initials = `${dossier.name.charAt(0)}${dossier.firstName ? dossier.firstName.charAt(0) : ''}`.toUpperCase();
  const stepIdx = STATUS_ORDER.indexOf(dossier.status);
  const totalHT = invoices.reduce((s, i) => s + (i.montantHT > 0 ? i.montantHT : 0), 0);

  // Signe le dossier : POST /projects/:id/sign (via useProjectActions) + mise à jour store.
  // Fire-and-forget : on route immédiatement vers /dossiers-signes, l'API tourne en arrière-plan.
  const handleSigner = async () => {
    try {
      await signProject(id);
    } catch (err) {
      console.warn('[sign] API call failed (state local conservé) :', err);
    } finally {
      router.push('/dossiers-signes');
    }
  };
  const handleAddFolder = () => {
    if (!newFolderLabel.trim()) return;
    addSubfolder(id, newFolderLabel.trim());
    setNewFolderLabel(''); setShowAddFolder(false);
  };

  return (
    <div className="w-full space-y-0">
      <style>{`
        @media (max-width: 768px) {
          .dos-detail-grid { grid-template-columns: 1fr !important; }
          .dos-detail-grid > .col-span-2,
          .dos-detail-grid > .col-span-1 { grid-column: span 1 !important; }
          .dos-sub-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HEADER WAHOU — fond texturé vert
      ══════════════════════════════════════════ */}
      <div className="dossier-header relative rounded-2xl overflow-hidden mb-5" style={{ minHeight: 200 }}>
        {/* SVG background identique à la sidebar */}
        <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <defs>
            <linearGradient id="dhGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#567060"/>
              <stop offset="50%"  stopColor="#4A6358"/>
              <stop offset="100%" stopColor="#334840"/>
            </linearGradient>
            <filter id="dhGrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
              <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
              <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended"/>
              <feComposite in="blended" in2="SourceGraphic" operator="in"/>
            </filter>
          </defs>
          <rect width="1200" height="200" fill="#304035"/>
          {/* Motif cercles décoratifs */}
          <circle cx="950" cy="100" r="180" fill="white" fillOpacity="0.03"/>
          <circle cx="1100" cy="20"  r="120" fill="white" fillOpacity="0.04"/>
          <circle cx="80"   cy="160" r="100" fill="white" fillOpacity="0.03"/>
        </svg>

        {/* Contenu du header */}
        <div className="relative z-10 flex items-center gap-6 px-8 py-6">
          {/* Avatar grand format */}
          <div className="dossier-avatar relative shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl select-none shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.15)` }}>
              {initials}
            </div>
            {/* Badge statut sur l'avatar */}
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-lg"
              style={{ background: cfg.bg, color: cfg.text, boxShadow: `0 0 0 2px white` }}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </div>
          </div>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">
              {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {dossier.createdAt && (
                <span className="flex items-center gap-1.5 text-white/55 text-xs">
                  <Calendar className="h-3 w-3" /> Créé le {dossier.createdAt}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-white/55 text-xs">
                <FolderOpen className="h-3 w-3" /> {dossier.subfolders.length} éléments
              </span>
              {dossier.postalCode && (
                <span className="flex items-center gap-1.5 text-white/55 text-xs">
                  <MapPin className="h-3 w-3" /> {dossier.postalCode}
                </span>
              )}
            </div>

            {/* Barre de progression par étapes */}
            <div className="mt-4 flex items-center gap-0">
              {STEPS.map((step, i) => {
                const done    = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`step-done w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-md transition-all`}
                        style={{
                          animationDelay: `${0.3 + i * 0.08}s`,
                          background: done ? 'white' : 'rgba(255,255,255,0.15)',
                          color: done ? c1 : 'rgba(255,255,255,0.4)',
                          boxShadow: current ? `0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2)` : 'none',
                          transform: current ? 'scale(1.15)' : 'scale(1)',
                        }}>
                        {done && i < stepIdx ? '✓' : i + 1}
                      </div>
                      <span className="text-[9px] font-semibold mt-1 whitespace-nowrap"
                        style={{ color: done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 rounded-full"
                        style={{ background: i < stepIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bouton Tableau de bord — rond, anime, voyant.
              Place entre la progression d'etapes et la colonne d'actions. */}
          <style>{`
            @keyframes ddbBtnAuraRotate { to { transform: rotate(360deg); } }
            @keyframes ddbBtnPulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(217, 179, 138, 0.55), 0 8px 22px rgba(217, 179, 138, 0.35), inset 0 1px 0 rgba(255,255,255,0.4); }
              50%      { box-shadow: 0 0 0 14px rgba(217, 179, 138, 0), 0 8px 22px rgba(217, 179, 138, 0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
            }
            @keyframes ddbBtnIconFloat {
              0%, 100% { transform: translateY(0); }
              50%      { transform: translateY(-1.5px); }
            }
            @keyframes ddbBtnSparkle {
              0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0; }
              50%      { transform: scale(1.15) rotate(180deg); opacity: 1; }
            }
            .ddb-trigger-wrap {
              position: relative;
              width: 64px;
              flex-shrink: 0;
              align-self: center;
              margin: 0 18px 0 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            .ddb-trigger-circle {
              position: relative;
              width: 64px; height: 64px;
            }
            .ddb-trigger-label {
              font-size: 9.5px;
              font-weight: 700;
              color: rgba(255, 255, 255, 0.85);
              text-transform: uppercase;
              letter-spacing: 0.06em;
              white-space: nowrap;
              text-align: center;
              line-height: 1.2;
              text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
            }
            /* Anneau rotatif gradient en arriere plan — relativement au cercle */
            .ddb-trigger-aura {
              position: absolute; inset: -6px;
              border-radius: 50%;
              background: conic-gradient(
                from 0deg,
                rgba(217, 179, 138, 0) 0deg,
                rgba(217, 179, 138, 0.7) 90deg,
                rgba(240, 200, 130, 0.95) 180deg,
                rgba(217, 179, 138, 0.7) 270deg,
                rgba(217, 179, 138, 0) 360deg
              );
              animation: ddbBtnAuraRotate 5s linear infinite;
              opacity: 0.85;
              filter: blur(2px);
              pointer-events: none;
            }
            /* Cercle interieur "vide" pour ne montrer que l'anneau de l'aura */
            .ddb-trigger-aura::before {
              content: '';
              position: absolute; inset: 6px;
              border-radius: 50%;
              background: linear-gradient(135deg, #2a3a30 0%, #3d5244 100%);
            }
            /* Bouton principal : disque dore */
            .ddb-trigger-btn {
              position: relative;
              width: 100%; height: 100%;
              border-radius: 50%;
              background:
                radial-gradient(circle at 30% 30%, #f4d6a8 0%, #d9b38a 35%, #b88c5c 100%);
              border: 2px solid rgba(255, 255, 255, 0.35);
              cursor: pointer;
              display: flex; align-items: center; justify-content: center;
              color: #2a3a30;
              animation: ddbBtnPulse 2.4s ease-in-out infinite;
              transition: transform 0.25s cubic-bezier(0.34, 1.42, 0.64, 1);
              z-index: 1;
            }
            .ddb-trigger-btn:hover { transform: scale(1.08); }
            .ddb-trigger-btn:active { transform: scale(0.96); }
            .ddb-trigger-btn svg {
              animation: ddbBtnIconFloat 2.4s ease-in-out infinite;
            }
            /* Etat ouvert : inversion couleurs (vert + halo intense) */
            .ddb-trigger-btn.is-open {
              background: radial-gradient(circle at 30% 30%, #4a6552 0%, #2a3a30 100%);
              color: #d9b38a;
              border-color: rgba(217, 179, 138, 0.6);
            }
            /* Sparkles autour du bouton */
            .ddb-trigger-spark {
              position: absolute;
              width: 6px; height: 6px;
              border-radius: 50%;
              background: #fff;
              box-shadow: 0 0 8px #fff, 0 0 14px rgba(217, 179, 138, 0.9);
              animation: ddbBtnSparkle 2.8s ease-in-out infinite;
              pointer-events: none;
              z-index: 2;
            }
            .ddb-trigger-spark.s1 { top: -4px; left: 50%; animation-delay: 0s; }
            .ddb-trigger-spark.s2 { top: 50%; right: -4px; animation-delay: 0.7s; }
            .ddb-trigger-spark.s3 { bottom: -4px; left: 30%; animation-delay: 1.4s; }
            .ddb-trigger-spark.s4 { top: 30%; left: -4px; animation-delay: 2.1s; }

            @media (max-width: 768px) {
              .ddb-trigger-wrap { width: 52px; margin: 0 10px; }
              .ddb-trigger-circle { width: 52px; height: 52px; }
              .ddb-trigger-label { font-size: 9px; }
            }
          `}</style>
          <div className="ddb-trigger-wrap">
            <div className="ddb-trigger-circle">
              <span className="ddb-trigger-aura" aria-hidden="true" />
              <span className="ddb-trigger-spark s1" aria-hidden="true" />
              <span className="ddb-trigger-spark s2" aria-hidden="true" />
              <span className="ddb-trigger-spark s3" aria-hidden="true" />
              <span className="ddb-trigger-spark s4" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setShowDashboard(v => !v)}
                className={`ddb-trigger-btn${showDashboard ? ' is-open' : ''}`}
                title="Tableau de bord — vue d'ensemble du dossier"
                aria-expanded={showDashboard}
                aria-controls="dossier-dashboard-panel"
              >
                <LayoutDashboard className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </div>
            <span className="ddb-trigger-label">Tableau de bord</span>
          </div>

          {/* Actions header */}
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setShowStatus(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              <Tag className="h-3.5 w-3.5" />
              Changer statut
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
              <GitCompare className="h-3.5 w-3.5" />
              Comparer
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LAYOUT 2 COLONNES
      ══════════════════════════════════════════ */}
      <div className="dos-detail-grid grid grid-cols-3 gap-4">

        {/* ── COLONNE GAUCHE (2/3) — dossiers & fichiers ── */}
        <div className="col-span-2 col-left space-y-4">

          {/* Section fichiers */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#304035]/5 rounded-xl">
                  <FolderOpen className="h-4 w-4 text-[#304035]" />
                </div>
                <h2 className="text-sm font-bold text-[#304035]">Dossiers & fichiers</h2>
                {loadingDocs && (
                  <div
                    className="h-3.5 w-3.5 border-2 border-[#a67749] border-t-transparent rounded-full animate-spin"
                    title="Synchronisation des documents…"
                    aria-label="Synchronisation des documents"
                  />
                )}
              </div>
              <button
                onClick={() => setShowAddFolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a67749]/10 text-[#a67749] text-xs font-bold hover:bg-[#a67749]/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>
            <div className="divide-y divide-[#304035]/5">
              {(() => {
                // ── Tri d'affichage ────────────────────────────────────────
                // Architecte : groupe V1-APS + V2..V5-APS (V2+ indentees), puis
                //              V1-APD + V2..V5-APD.
                // Cuisiniste : groupe OPTION 1 + OPTION 2..5 (OPTION 2+ indentees).
                // Autres : ordre inchange.
                type DisplayItem = { sf: typeof dossier.subfolders[number]; depth: number };
                const items: DisplayItem[] = [];
                if (isArchitecte) {
                  const nonProjet: DisplayItem[] = [];
                  const aps: DisplayItem[] = [];
                  const apd: DisplayItem[] = [];
                  for (const sub of dossier.subfolders) {
                    const m = sub.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
                    if (!m) {
                      nonProjet.push({ sf: sub, depth: 0 });
                      continue;
                    }
                    const v = parseInt(m[1], 10);
                    const phase = m[2].toUpperCase();
                    const it: DisplayItem = { sf: sub, depth: v > 1 ? 1 : 0 };
                    if (phase === 'APS') aps.push(it);
                    else if (phase === 'APD') apd.push(it);
                  }
                  const byVersion = (a: DisplayItem, b: DisplayItem) => {
                    const va = parseInt(a.sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX)?.[1] ?? '0', 10);
                    const vb = parseInt(b.sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX)?.[1] ?? '0', 10);
                    return va - vb;
                  };
                  aps.sort(byVersion);
                  apd.sort(byVersion);
                  items.push(...nonProjet, ...aps, ...apd);
                } else if (isCuisiniste) {
                  const nonOption: DisplayItem[] = [];
                  const options: DisplayItem[] = [];
                  for (const sub of dossier.subfolders) {
                    const m = sub.label.match(CUISINISTE_OPTION_REGEX);
                    if (!m) {
                      nonOption.push({ sf: sub, depth: 0 });
                      continue;
                    }
                    const v = parseInt(m[1], 10);
                    options.push({ sf: sub, depth: v > 1 ? 1 : 0 });
                  }
                  options.sort((a, b) => {
                    const va = parseInt(a.sf.label.match(CUISINISTE_OPTION_REGEX)?.[1] ?? '0', 10);
                    const vb = parseInt(b.sf.label.match(CUISINISTE_OPTION_REGEX)?.[1] ?? '0', 10);
                    return va - vb;
                  });
                  items.push(...nonOption, ...options);
                } else {
                  for (const sub of dossier.subfolders) items.push({ sf: sub, depth: 0 });
                }
                return items;
              })().map(({ sf, depth }, i) => {
                // Alerte dynamique : uniquement si le sous-dossier est vide
                // (aucun document présent). Dès qu'un document est ajouté,
                // l'alerte disparaît automatiquement.
                const isEmpty = !sf.documents || sf.documents.length === 0;
                const isValidated = !!sf.validated;
                const docsCount = sf.documents?.length ?? 0;
                // Date affichée : dernière modif du sous-dossier, sinon date de création du dossier
                const displayDate = sf.date ?? dossier.createdAt;
                const isChildVersion = depth > 0;
                return (
                <div key={`${sf.label}-${i}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenedSubfolder(sf.label)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenedSubfolder(sf.label); } }}
                  className={`subfolder-row flex w-full items-center gap-4 px-5 py-4 text-left transition-all border-l-4 border-l-transparent hover:border-l-[#a67749] hover:bg-[#304035]/[0.02] cursor-pointer ${isChildVersion ? 'pl-12 bg-[#a67749]/[0.025]' : ''}`}
                >
                  {isChildVersion && (
                    <CornerDownRight className="h-4 w-4 text-[#a67749]/50 shrink-0 -ml-1" />
                  )}
                  <div className={`p-2 rounded-xl shrink-0 ${isChildVersion ? 'bg-[#a67749]/8 text-[#a67749]/60' : 'bg-[#304035]/5 text-[#a67749]/70'}`}>
                    {getIconForType(sf.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm block truncate ${isChildVersion ? 'text-[#304035]/85' : 'text-[#304035]'}`}>{sf.label}</span>
                    <span className="text-xs text-[#304035]/50 mt-0.5 block">
                      Modifié le {displayDate} · {docsCount} document{docsCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Badge "Vide" si aucun document — masqué si validé */}
                  {isEmpty && !isValidated && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 shrink-0" title="Ce sous-dossier est vide">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-orange-600">Vide</span>
                    </div>
                  )}

                  {/* Architecte : bouton + pour créer la version suivante (APS / APD).
                   *  Visible uniquement sur la version la plus haute déjà existante
                   *  pour cette phase, et tant qu'on n'a pas atteint le plafond de 5. */}
                  {isArchitecte && (() => {
                    const m = sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
                    if (!m) return null;
                    const currentVersion = parseInt(m[1], 10);
                    const phase = m[2].toUpperCase() as 'APS' | 'APD';
                    if (!Number.isFinite(currentVersion)) return null;
                    if (currentVersion >= ARCHITECTE_MAX_VERSION) return null;
                    // Trouve la version max actuelle pour cette phase
                    let maxVersion = 0;
                    for (const other of dossier.subfolders) {
                      const om = other.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
                      if (!om) continue;
                      if (om[2].toUpperCase() !== phase) continue;
                      const v = parseInt(om[1], 10);
                      if (Number.isFinite(v) && v > maxVersion) maxVersion = v;
                    }
                    // N'afficher le + que sur la version max — sinon ça pollue la liste
                    if (currentVersion !== maxVersion) return null;
                    const nextLabel = `PROJET VERSION ${currentVersion + 1} – ${phase}`;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSubfolder(id, nextLabel);
                        }}
                        className="flex items-center justify-center h-7 w-7 rounded-full bg-[#a67749]/12 text-[#a67749] hover:bg-[#a67749] hover:text-white hover:shadow-md transition-all shrink-0 group"
                        title={`Créer ${nextLabel}`}
                        aria-label={`Créer ${nextLabel}`}
                      >
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                      </button>
                    );
                  })()}

                  {/* Cuisiniste : bouton + pour créer l'option suivante (OPTION N+1).
                   *  Visible uniquement sur l'OPTION la plus haute, jusqu'au plafond de 5. */}
                  {isCuisiniste && (() => {
                    const m = sf.label.match(CUISINISTE_OPTION_REGEX);
                    if (!m) return null;
                    const currentOption = parseInt(m[1], 10);
                    if (!Number.isFinite(currentOption)) return null;
                    if (currentOption >= CUISINISTE_MAX_OPTION) return null;
                    let maxOption = 0;
                    for (const other of dossier.subfolders) {
                      const om = other.label.match(CUISINISTE_OPTION_REGEX);
                      if (!om) continue;
                      const v = parseInt(om[1], 10);
                      if (Number.isFinite(v) && v > maxOption) maxOption = v;
                    }
                    if (currentOption !== maxOption) return null;
                    const nextLabel = `OPTION ${currentOption + 1}`;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSubfolder(id, nextLabel);
                        }}
                        className="flex items-center justify-center h-7 w-7 rounded-full bg-[#a67749]/12 text-[#a67749] hover:bg-[#a67749] hover:text-white hover:shadow-md transition-all shrink-0 group"
                        title={`Créer ${nextLabel}`}
                        aria-label={`Créer ${nextLabel}`}
                      >
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                      </button>
                    );
                  })()}

                  {/* Bouton Valider / Pastille verte validée */}
                  {isValidated ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSubfolderValidated(dossier.id, sf.label); }}
                      className="flex items-center gap-1.5 shrink-0 transition-all hover:scale-105"
                      title="Cliquer pour annuler la validation"
                    >
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]">
                        <CheckCircle className="h-4 w-4 text-white" strokeWidth={3} />
                      </span>
                      <span className="text-xs font-bold text-green-600">Validé</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSubfolderValidated(dossier.id, sf.label); }}
                      className="px-3 py-1.5 rounded-lg bg-[#304035] text-white text-xs font-bold shrink-0 transition-all hover:bg-[#a67749] hover:shadow-md"
                      title="Marquer ce sous-dossier comme validé"
                    >
                      Valider
                    </button>
                  )}

                  {/* Bouton supprimer — menuisier uniquement, bloqué si des documents sont presents */}
                  {isMenuisier && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ label: sf.label, docsCount });
                      }}
                      className="p-2 rounded-lg text-red-500/60 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                      title={`Supprimer "${sf.label}"`}
                      aria-label={`Supprimer ${sf.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <ChevronRight className="sf-arrow h-4 w-4 text-[#304035]/25 shrink-0" />
                </div>
                );
              })}
              {dossier.subfolders.length === 0 && (
                <div className="px-5 py-10 text-center text-[#304035]/40 text-sm">
                  Aucun fichier — commencez par créer un devis
                </div>
              )}

              {/* Bouton "Creer projet N+1" - menuisier uniquement */}
              {isMenuisier && (() => {
                const nextN = dossier.subfolders.reduce((max, sf) => {
                  const m = sf.label.match(MENUISIER_PROJET_REGEX);
                  if (!m) return max;
                  const n = parseInt(m[1], 10);
                  return Number.isFinite(n) && n > max ? n : max;
                }, 0) + 1;
                const nextLabel = `PROJET ${nextN}`;
                return (
                  <button
                    type="button"
                    onClick={() => addSubfolder(id, nextLabel)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-[#a67749] bg-gradient-to-r from-[#a67749]/5 via-[#d9b38a]/10 to-[#a67749]/5 hover:from-[#a67749]/10 hover:via-[#d9b38a]/20 hover:to-[#a67749]/10 border-t border-dashed border-[#a67749]/30 transition-all group"
                    title={`Créer ${nextLabel}`}
                  >
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#a67749] text-white shadow-md group-hover:rotate-90 transition-transform duration-300">
                      <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    Créer {nextLabel}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Section factures liées */}
          {invoices.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-bold text-[#304035]">Factures liées</h2>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT)} HT
                </span>
              </div>
              <div className="divide-y divide-[#304035]/5">
                {invoices.map(inv => {
                  const statutColors: Record<string, string> = {
                    'PAYÉE': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'EN ATTENTE': 'bg-orange-50 text-orange-700 border-orange-200',
                    'RETARD': 'bg-red-50 text-red-700 border-red-200',
                    'ACOMPTE': 'bg-blue-50 text-blue-700 border-blue-200',
                    'AVOIR': 'bg-purple-50 text-purple-700 border-purple-200',
                  };
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#304035]">{inv.ref ?? inv.type}</p>
                        <p className="text-xs text-[#304035]/40">{inv.date}</p>
                      </div>
                      <span className="text-sm font-bold text-[#304035]">
                        {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(inv.montantHT)} HT
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statutColors[inv.statut] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {inv.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions principales */}
          <div className="dos-sub-grid-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDevis(true)}
              className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              <Plus className="h-4 w-4" />
              Créer un devis
            </button>
            <button
              onClick={handleSigner}
              className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'linear-gradient(135deg, #304035, #4a6358)', boxShadow: '0 4px 16px rgba(48,64,53,0.3)' }}
            >
              <FileCheck className="h-4 w-4" />
              Faire valider le projet
            </button>
          </div>
        </div>

        {/* ── COLONNE DROITE (1/3) — fiche client + actions ── */}
        <div className="col-span-1 col-right space-y-4">

          {/* Fiche client */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
            <div className="px-5 py-4 border-b border-[#304035]/5">
              <h2 className="text-sm font-bold text-[#304035]">Fiche client</h2>
            </div>
            <div className="p-5 space-y-3">
              {dossier.phone && (
                <a href={`tel:${dossier.phone}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3 hover:bg-[#304035]/8 transition-all group">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg">
                    <Phone className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035] font-medium group-hover:text-[#a67749] transition-colors">{dossier.phone}</span>
                </a>
              )}
              {dossier.email && (
                <a href={`mailto:${dossier.email}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3 hover:bg-[#304035]/8 transition-all group">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg">
                    <Mail className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035] font-medium truncate group-hover:text-[#a67749] transition-colors">{dossier.email}</span>
                </a>
              )}
              {dossier.address && (
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035]/70 leading-snug">{dossier.address}{dossier.postalCode ? `, ${dossier.postalCode}` : ''}</span>
                </div>
              )}
              {!dossier.phone && !dossier.email && !dossier.address && (
                <p className="text-xs text-[#304035]/30 text-center py-2">Aucune info de contact</p>
              )}
            </div>
          </div>

          {/* Progression — reflete reellement le ratio de sous-dossiers valides */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#304035]">Progression</h2>
                <span
                  className="text-sm font-black tabular-nums"
                  style={{ color: progress === 100 ? '#10b981' : progress >= 50 ? '#a67749' : '#304035' }}
                >
                  {progress}%
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="h-2 bg-[#304035]/8 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: progress === 100
                      ? 'linear-gradient(90deg, #10b981, #22c55e)'
                      : `linear-gradient(90deg, ${c1}, ${c2})`,
                  }}
                />
              </div>

              {/* Ratio reel des validations */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#304035]/70">
                  {validatedSubs} / {totalSubs} sous-dossier{totalSubs > 1 ? 's' : ''} validé{validatedSubs > 1 ? 's' : ''}
                </span>
                {totalSubs > 0 && progress < 100 && (
                  <span className="text-[10px] font-bold text-[#a67749] bg-[#a67749]/10 px-2 py-0.5 rounded-full">
                    {totalSubs - validatedSubs} restant{totalSubs - validatedSubs > 1 ? 's' : ''}
                  </span>
                )}
                {progress === 100 && totalSubs > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    🎉 Complet
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#304035]/5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.bg }} />
                <span className="text-xs font-semibold" style={{ color: cfg.bg }}>{cfg.label}</span>
                <span className="text-xs text-[#304035]/40 ml-auto">{dossier.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Résumé financier */}
          {totalHT > 0 && (
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #304035, #4a6358)' }}>
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-white/70" />
                <h2 className="text-sm font-bold text-white">Finances</h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Montant HT</span>
                  <span className="text-base font-black text-white">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">TVA ({parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20}%)</span>
                  <span className="text-sm font-bold text-white/70">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT * ((parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20) / 100))}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Total TTC</span>
                  <span className="text-base font-black text-emerald-400">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT * (1 + (parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20) / 100))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes rapides */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-[#a67749]" />
                <h2 className="text-sm font-bold text-[#304035]">Notes</h2>
              </div>
              <button onClick={() => setEditingNotes(v => !v)}
                className="p-1.5 rounded-lg hover:bg-[#304035]/5 transition-all text-[#304035]/40 hover:text-[#304035]">
                {editingNotes ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="p-4">
              {editingNotes ? (
                <textarea
                  autoFocus
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ajouter une note sur ce dossier…"
                  rows={4}
                  className="w-full text-sm text-[#304035] placeholder:text-[#304035]/30 bg-[#304035]/3 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                />
              ) : (
                <p className="text-sm text-[#304035]/50 min-h-[60px] leading-relaxed">
                  {notes || <span className="italic text-[#304035]/25">Aucune note — cliquez sur le crayon pour en ajouter</span>}
                </p>
              )}
            </div>
          </div>

          {/* Action rapide */}
          <button
            onClick={() => setShowDevis(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #a67749, #c08a5a)', boxShadow: '0 4px 16px rgba(166,119,73,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            Action rapide
          </button>
        </div>
      </div>

      {/* ══ MODAL : Changement de Statut ══ */}
      {showStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10">
            <div className="flex items-center gap-3 mb-6">
              <Tag className="h-5 w-5 text-[#304035]" />
              <h3 className="text-xl font-bold text-[#304035]">Changer le statut</h3>
            </div>
            <div className="space-y-2">
              {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[string]][]).map(([s, c]) => {
                const Icon = c.Icon;
                const isActive = dossier.status === s;
                return (
                  <button key={s}
                    onClick={() => { updateProjectStatus(id, s); setShowStatus(false); }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-left transition-all"
                    style={isActive
                      ? { background: c.bg, color: c.text, boxShadow: `0 4px 12px ${c.glow}` }
                      : { background: '#f9f7f5', color: '#304035' }}>
                    <Icon className="h-4 w-4" style={{ color: isActive ? c.text : c.bg }} />
                    {isActive ? `✓ ${c.label} (actuel)` : c.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowStatus(false)}
              className="mt-5 w-full rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL : Documents d'un sous-dossier ══ */}
      {openedSubfolder && (() => {
        const sf = dossier.subfolders.find(s => s.label === openedSubfolder);
        if (!sf) return null;
        const docs = (sf.documents ?? []).map(normalizeDoc);

        // Ajout "manuel" par nom seul — placeholder local, sans upload.
        // Utile pour noter qu'un document physique est attendu mais pas encore reçu.
        const handleAddDoc = () => {
          const name = newDocName.trim();
          if (!name) return;
          addDocumentToSubfolder(id, openedSubfolder, { name });
          setNewDocName('');
        };

        // Upload réel via l'API NestJS → Supabase Storage.
        // Toutes les vérifs (MIME, taille, ownership) sont faites côté serveur.
        const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files) return;
          const arr = Array.from(files);
          let succeeded = 0;
          let failed = 0;
          let lastError = '';
          setDocOpStatus({ kind: 'uploading', message: `Téléversement en cours (${arr.length} fichier${arr.length > 1 ? 's' : ''})…` });
          for (const f of arr) {
            try {
              const uploaded = await uploadDossierDoc(id, openedSubfolder, f);
              addDocumentToSubfolder(id, openedSubfolder, {
                docId: uploaded.id,
                name: uploaded.originalName,
                type: uploaded.mimeType ?? f.type,
                size: uploaded.sizeBytes ?? f.size,
                addedAt: uploaded.createdAt,
              });
              succeeded++;
            } catch (err: any) {
              failed++;
              lastError = err?.message ?? 'erreur réseau';
              console.error(`[Dossier] upload failed for ${f.name}:`, err);
            }
          }
          e.target.value = '';
          if (failed === 0) {
            setDocOpStatus({ kind: 'success', message: `${succeeded} fichier${succeeded > 1 ? 's' : ''} téléversé${succeeded > 1 ? 's' : ''}` });
            setTimeout(() => setDocOpStatus({ kind: 'idle' }), 2200);
          } else {
            setDocOpStatus({
              kind: 'error',
              message: succeeded > 0
                ? `${succeeded} OK · ${failed} échec(s) — ${lastError}`
                : `Échec téléversement : ${lastError}`,
            });
          }
        };

        // Suppression : si le doc est sur le backend (docId présent), on purge
        // côté API d'abord (DB + bucket). Puis on retire du store local.
        const handleDelete = async (doc: DocumentFile) => {
          setDocOpStatus({ kind: 'deleting', message: `Suppression de ${doc.name}…` });
          if (doc.docId) {
            try {
              await deleteDossierDoc(id, doc.docId);
            } catch (err: any) {
              const msg = err?.message ?? 'erreur réseau';
              console.error('[Dossier] delete failed:', err);
              setDocOpStatus({ kind: 'error', message: `Suppression impossible : ${msg}` });
              return;
            }
          }
          removeDocumentFromSubfolder(id, openedSubfolder, doc.name);
          setDocOpStatus({ kind: 'success', message: 'Document supprimé' });
          setTimeout(() => setDocOpStatus({ kind: 'idle' }), 1800);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={() => { setOpenedSubfolder(null); setDocOpStatus({ kind: 'idle' }); setNewDocName(''); }}>
            <div className={`w-full ${docsViewMode === 'grid' ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10 transition-all`} onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-5 gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-[#304035] truncate">{sf.label}</h3>
                  <p className="text-xs text-[#304035]/50 mt-1">
                    {docs.length} document{docs.length > 1 ? 's' : ''}{sf.date ? ` · Modifié le ${sf.date}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle affichage : liste / grille (vignettes) */}
                  <div className="flex items-center bg-[#304035]/5 rounded-lg p-0.5 mr-1">
                    <button
                      type="button"
                      onClick={() => setDocsViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${docsViewMode === 'list' ? 'bg-white text-[#304035] shadow-sm' : 'text-[#304035]/40 hover:text-[#304035]/70'}`}
                      title="Vue liste"
                      aria-label="Vue liste"
                      aria-pressed={docsViewMode === 'list'}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocsViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${docsViewMode === 'grid' ? 'bg-white text-[#304035] shadow-sm' : 'text-[#304035]/40 hover:text-[#304035]/70'}`}
                      title="Vue grille (vignettes)"
                      aria-label="Vue grille (vignettes)"
                      aria-pressed={docsViewMode === 'grid'}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => { setOpenedSubfolder(null); setDocOpStatus({ kind: 'idle' }); setNewDocName(''); }} className="p-2 rounded-lg hover:bg-[#304035]/5 transition-colors" aria-label="Fermer">
                    <X className="h-5 w-5 text-[#304035]/60" />
                  </button>
                </div>
              </div>

              {/* Vue LISTE */}
              {docsViewMode === 'list' && (
                <div className="rounded-xl border border-[#304035]/10 divide-y divide-[#304035]/5 mb-5 max-h-72 overflow-y-auto">
                  {docs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#304035]/40 text-sm">
                      Aucun document dans ce sous-dossier
                    </div>
                  ) : docs.map((doc, i) => {
                    const canPreview = !!(doc.docId || doc.dataUrl);
                    const isImg = doc.type?.startsWith('image/');
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        {isImg && doc.dataUrl ? (
                          <div className="h-9 w-9 rounded-lg overflow-hidden bg-[#304035]/5 shrink-0 border border-[#304035]/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={doc.dataUrl} alt={doc.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-[#304035]/5 shrink-0 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-[#a67749]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm text-[#304035] truncate font-medium">{doc.name}</span>
                          {(doc.size || doc.type) && (
                            <span className="block text-[11px] text-[#304035]/40 truncate">
                              {formatSize(doc.size)}{doc.size && doc.type ? ' · ' : ''}{doc.type ?? ''}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => canPreview && openPreview(doc)}
                          disabled={!canPreview}
                          title={canPreview ? 'Aperçu' : 'Aperçu indisponible (document placeholder sans contenu)'}
                          className="p-1.5 rounded-lg text-[#304035]/50 hover:text-[#304035] hover:bg-[#304035]/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Aperçu"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => canPreview && downloadDoc(id, doc)}
                          disabled={!canPreview}
                          title={canPreview ? 'Télécharger' : 'Téléchargement indisponible'}
                          className="p-1.5 rounded-lg text-[#304035]/50 hover:text-[#a67749] hover:bg-[#a67749]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded-lg text-[#304035]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Supprimer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Vue GRILLE — vignettes type explorateur Windows */}
              {docsViewMode === 'grid' && (
                <div className="rounded-xl border border-[#304035]/10 mb-5 max-h-[480px] overflow-y-auto p-3 bg-[#fafaf7]">
                  {docs.length === 0 ? (
                    <div className="px-4 py-12 text-center text-[#304035]/40 text-sm">
                      Aucun document dans ce sous-dossier
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {docs.map((doc, i) => {
                        const canPreview = !!(doc.docId || doc.dataUrl);
                        return (
                          <div
                            key={i}
                            className="dt-card group relative"
                            style={{ position: 'relative' }}
                          >
                            <style>{`
                              .dt-card { transition: transform 0.18s ease; }
                              .dt-actions {
                                position: absolute; top: 6px; left: 6px;
                                display: flex; gap: 4px;
                                opacity: 0;
                                transition: opacity 0.18s ease;
                              }
                              .dt-card:hover .dt-actions { opacity: 1; }
                              .dt-action-btn {
                                width: 26px; height: 26px;
                                border-radius: 8px;
                                background: rgba(255, 255, 255, 0.95);
                                border: 1px solid rgba(48, 64, 53, 0.12);
                                display: flex; align-items: center; justify-content: center;
                                cursor: pointer;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                                color: #304035;
                                transition: all 0.16s ease;
                              }
                              .dt-action-btn:hover { transform: scale(1.08); }
                              .dt-action-dl:hover { color: #a67749; background: #fff8ef; }
                              .dt-action-rm:hover { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
                              .dt-action-btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
                            `}</style>
                            <button
                              type="button"
                              onClick={() => canPreview && openPreview(doc)}
                              disabled={!canPreview}
                              className="block w-full text-left disabled:cursor-not-allowed"
                              title={canPreview ? `Cliquer pour aperçu : ${doc.name}` : doc.name}
                              aria-label={`Aperçu de ${doc.name}`}
                            >
                              <DocThumbnail doc={doc} dossierId={id} height={120} />
                            </button>

                            <div className="mt-2 px-1">
                              <p className="text-xs font-semibold text-[#304035] truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-[#304035]/45 truncate">
                                {formatSize(doc.size)}{doc.size && doc.type ? ' · ' : ''}{doc.type?.split('/')[1] ?? ''}
                              </p>
                            </div>

                            {/* Actions visibles au hover */}
                            <div className="dt-actions">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (canPreview) downloadDoc(id, doc); }}
                                disabled={!canPreview}
                                className="dt-action-btn dt-action-dl"
                                title="Télécharger"
                                aria-label="Télécharger"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                className="dt-action-btn dt-action-rm"
                                title="Supprimer"
                                aria-label="Supprimer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Bandeau état opération (upload/delete) */}
              {docOpStatus.kind !== 'idle' && (
                <div
                  className={`mb-3 rounded-xl px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
                    docOpStatus.kind === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : docOpStatus.kind === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#a67749]/10 text-[#7c3a1e] border border-[#a67749]/30'
                  }`}
                  role="status"
                >
                  {(docOpStatus.kind === 'uploading' || docOpStatus.kind === 'deleting') && (
                    <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  {docOpStatus.kind === 'success' && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {docOpStatus.kind === 'error' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                  <span className="flex-1">{docOpStatus.message}</span>
                  <button
                    type="button"
                    onClick={() => setDocOpStatus({ kind: 'idle' })}
                    className="text-current hover:opacity-70"
                    aria-label="Fermer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Upload fichier */}
              <label className="block mb-3">
                <span className="sr-only">Téléverser un fichier</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id={`sf-file-${sf.label}`}
                  disabled={docOpStatus.kind === 'uploading' || docOpStatus.kind === 'deleting'}
                />
                <label
                  htmlFor={`sf-file-${sf.label}`}
                  className={`flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-all ${
                    docOpStatus.kind === 'uploading' || docOpStatus.kind === 'deleting'
                      ? 'border-[#304035]/10 text-[#304035]/30 cursor-not-allowed'
                      : 'border-[#304035]/20 text-[#304035]/70 hover:border-[#a67749] hover:bg-[#a67749]/5 hover:text-[#a67749] cursor-pointer'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Téléverser un ou plusieurs fichiers
                </label>
              </label>

              {/* Ajouter manuellement (placeholder sans upload) */}
              <div className="flex gap-2">
                <input
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddDoc()}
                  placeholder="Nom du document (ex: devis_client.pdf)"
                  className="flex-1 rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                />
                <button
                  onClick={handleAddDoc}
                  disabled={!newDocName.trim()}
                  className="rounded-xl bg-[#304035] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a67749] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL : Aperçu plein écran d'un document ══ */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#304035]/10 bg-[#304035]/[0.02]">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#304035] truncate">{previewDoc.name}</p>
                <p className="text-[11px] text-[#304035]/50">
                  {formatSize(previewDoc.size)}{previewDoc.size && previewDoc.type ? ' · ' : ''}{previewDoc.type ?? ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDoc(id, previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a67749] text-white text-xs font-bold hover:bg-[#304035] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 rounded-lg hover:bg-[#304035]/5 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-[#304035]/60" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[#304035]/[0.03] flex items-center justify-center p-4">
              {!previewUrl ? (
                <div className="flex items-center gap-3 text-[#304035]/60 text-sm">
                  <div className="h-5 w-5 border-2 border-[#a67749] border-t-transparent rounded-full animate-spin" />
                  Chargement sécurisé…
                </div>
              ) : previewDoc.type?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md" />
              ) : previewDoc.type === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewDoc.name} className="w-full h-[80vh] rounded-lg bg-white" />
              ) : previewDoc.type?.startsWith('text/') ? (
                <iframe src={previewUrl} title={previewDoc.name} className="w-full h-[80vh] rounded-lg bg-white" />
              ) : (
                <div className="text-center py-12 px-6">
                  <FileText className="h-16 w-16 text-[#304035]/20 mx-auto mb-4" />
                  <p className="text-sm text-[#304035]/60 mb-4">
                    Aperçu non disponible pour ce type de fichier.
                  </p>
                  <button
                    onClick={() => downloadDoc(id, previewDoc)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#304035] text-white text-sm font-bold hover:bg-[#a67749] transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger le fichier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Ajout d'un sous-dossier ══ */}
      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10">
            <h3 className="text-xl font-bold text-[#304035] mb-5">Nouveau dossier</h3>
            <input autoFocus value={newFolderLabel}
              onChange={e => setNewFolderLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
              placeholder="RELEVE DE MESURES, PROJET VERSION 1..."
              className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-4 py-3 text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 mb-5" />
            <div className="flex gap-3">
              <button onClick={handleAddFolder} className="flex-1 rounded-xl bg-[#304035] py-3 font-bold text-white hover:bg-[#304035]/90 transition-colors">Ajouter</button>
              <button onClick={() => setShowAddFolder(false)} className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Créer un devis ══ */}
      {showDevis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-[#304035]/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>{initials}</div>
              <div>
                <h3 className="text-xl font-bold text-[#304035]">Créer un devis</h3>
                <p className="text-xs text-[#304035]/50">Pour {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}</p>
              </div>
            </div>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">Objet du devis</label>
                <input value={devisObjet} onChange={e => setDevisObjet(e.target.value)}
                  className="w-full rounded-xl border border-[#304035]/15 px-4 py-3 text-sm text-[#304035] placeholder-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  placeholder="Cuisine complète, salle de bain..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">Montant HT (€)</label>
                  <input type="number" value={devisMontant} onChange={e => setDevisMontant(e.target.value)}
                    className="w-full rounded-xl border border-[#304035]/15 px-4 py-3 text-sm text-[#304035] placeholder-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                    placeholder="15 000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">TVA (%)</label>
                  <div className="flex gap-1">
                    {['5.5','10','20'].map(t => (
                      <button key={t} type="button" onClick={() => setDevisTva(t)}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${devisTva === t ? 'bg-[#304035] text-white border-[#304035]' : 'bg-white text-[#304035]/60 border-[#304035]/12'}`}>
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {devisMontant && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-600">Total TTC</span>
                  <span className="text-base font-black text-emerald-700">
                    {new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(parseFloat(devisMontant) * (1 + parseFloat(devisTva)/100))}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  if (devisObjet) {
                    addSubfolder(id, `DEVIS — ${devisObjet}`);
                    if (devisMontant) addInvoice({ dossierId: id, client: dossier.name, date: new Date().toLocaleDateString('fr-FR'), montantHT: parseFloat(devisMontant), tva: parseFloat(devisTva) || 20, statut: 'EN ATTENTE', type: 'Facture' });
                  }
                  setShowDevis(false); setDevisObjet(''); setDevisMontant(''); setDevisTva('20');
                }}
                className="flex-1 rounded-xl py-3 font-bold text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #304035, #4a6358)' }}>
                Créer le devis
              </button>
              <button onClick={() => setShowDevis(false)}
                className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODALE WAOUHH — CONFIRMATION SUPPRESSION
      ═══════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15, 20, 17, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            animation: 'dcFadeIn 0.25s ease-out',
          }}
        >
          <style>{`
            @keyframes dcFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes dcPopIn {
              0% { opacity: 0; transform: scale(0.85) translateY(20px); }
              60% { transform: scale(1.03) translateY(-4px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes dcIconShake {
              0%, 100% { transform: rotate(0deg); }
              20% { transform: rotate(-8deg); }
              40% { transform: rotate(8deg); }
              60% { transform: rotate(-6deg); }
              80% { transform: rotate(6deg); }
            }
            @keyframes dcPulseRed {
              0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 20px 60px rgba(239,68,68,0.3); }
              50%      { box-shadow: 0 0 0 14px rgba(239,68,68,0), 0 20px 60px rgba(239,68,68,0.45); }
            }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              background: 'linear-gradient(145deg, #ffffff 0%, #fef7f5 100%)',
              borderRadius: 28,
              padding: 36,
              boxShadow: '0 30px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(239,68,68,0.1) inset',
              animation: 'dcPopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Glow décoratif rouge en haut */}
            <div style={{
              position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
              width: 280, height: 280, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Icône corbeille pulsante */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'dcPulseRed 2s ease-in-out infinite',
                }}
              >
                <div style={{ animation: 'dcIconShake 1.2s ease-in-out infinite' }}>
                  <Trash2 className="h-10 w-10 text-white" strokeWidth={2.2} />
                </div>
              </div>
            </div>

            {/* Titre */}
            <h3 style={{
              textAlign: 'center',
              fontSize: 22, fontWeight: 800,
              color: '#304035',
              marginBottom: 10,
              position: 'relative', zIndex: 2,
            }}>
              Supprimer ce sous-dossier&nbsp;?
            </h3>

            {/* Label du sous-dossier */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))',
              border: '1.5px solid rgba(239,68,68,0.25)',
              borderRadius: 14,
              padding: '10px 18px',
              margin: '0 auto 18px',
              width: 'fit-content',
              color: '#991b1b',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: '0.03em',
              position: 'relative', zIndex: 2,
              maxWidth: '100%',
            }}>
              <span style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deleteConfirm.label}
              </span>
            </div>

            {/* Message */}
            <p style={{
              textAlign: 'center',
              fontSize: 14,
              color: 'rgba(48,64,53,0.65)',
              lineHeight: 1.55,
              marginBottom: 28,
              position: 'relative', zIndex: 2,
            }}>
              {deleteConfirm.docsCount > 0 ? (
                <>
                  ⚠️ Ce sous-dossier contient <strong style={{ color: '#b91c1c' }}>{deleteConfirm.docsCount} document{deleteConfirm.docsCount > 1 ? 's' : ''}</strong>.
                  <br />
                  Leur lien sera perdu. Cette action est <strong>définitive</strong>.
                </>
              ) : (
                <>
                  Cette action est <strong>définitive</strong>.
                  <br />
                  Vous ne pourrez pas récupérer ce sous-dossier.
                </>
              )}
            </p>

            {/* Boutons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              position: 'relative', zIndex: 2,
            }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(48,64,53,0.15)',
                  background: 'white',
                  color: '#304035',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5eee8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ✋ Je ne veux pas supprimer
              </button>
              <button
                onClick={() => {
                  removeSubfolder(id, deleteConfirm.label);
                  setDeleteConfirm(null);
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(239,68,68,0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.4)';
                }}
              >
                🗑️ Oui, je veux supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
       *  PANEL TABLEAU DE BORD DU DOSSIER
       *  Liste des sous-dossiers avec statut validation + date.
       *  Ouvert/ferme via le bouton 'Tableau de bord' dans la banniere.
       *  ══════════════════════════════════════════════════════════════════ */}
      {showDashboard && (() => {
        // Calculs : progression + listes valide / en attente
        const allSubs = dossier.subfolders;
        const totalSubs = allSubs.length;
        const validatedSubs = allSubs.filter(sf => sf.validated);
        const pendingSubs = allSubs.filter(sf => !sf.validated);
        const progressPct = totalSubs === 0 ? 0 : Math.round((validatedSubs.length / totalSubs) * 100);
        const allDone = totalSubs > 0 && validatedSubs.length === totalSubs;

        return (
          <>
            <style>{`
              @keyframes ddbFadeBg {
                from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
                to   { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
              }
              @keyframes ddbReveal {
                0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.82) rotate(-1deg); filter: blur(8px); }
                60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.02) rotate(0); filter: blur(0); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); filter: blur(0); }
              }
              @keyframes ddbHaloRotate {
                0%   { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes ddbAuraGlow {
                0%, 100% { opacity: 0.55; transform: scale(1); }
                50%      { opacity: 0.85; transform: scale(1.03); }
              }
              @keyframes ddbRowIn {
                from { opacity: 0; transform: translateX(-14px) scale(0.98); }
                to   { opacity: 1; transform: translateX(0) scale(1); }
              }
              @keyframes ddbRingPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
                50%      { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
              }
              @keyframes ddbWarnPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.55); }
                50%      { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
              }
              @keyframes ddbShimmer {
                0%   { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              @keyframes ddbSparkleFloat {
                0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
                10%  { opacity: 1; }
                50%  { opacity: 0.8; transform: translateY(-12px) translateX(4px) scale(1.1); }
                90%  { opacity: 0.4; }
                100% { transform: translateY(-30px) translateX(-2px) scale(0.9); opacity: 0; }
              }
              @keyframes ddbCountUp {
                from { transform: translateY(8px); opacity: 0; }
                to   { transform: translateY(0); opacity: 1; }
              }
              @keyframes ddbCircleDraw {
                from { stroke-dashoffset: 283; }
                to   { stroke-dashoffset: var(--circle-offset, 113); }
              }

              .ddb-backdrop {
                position: fixed; inset: 0;
                background:
                  radial-gradient(ellipse at center, rgba(48, 64, 53, 0.65) 0%, rgba(8, 12, 10, 0.85) 75%);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 70;
                animation: ddbFadeBg 0.32s ease-out;
              }

              /* Aura lumineuse derriere le panel */
              .ddb-aura {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: min(820px, calc(100vw - 24px));
                height: 70vh; max-height: 760px;
                z-index: 75;
                pointer-events: none;
                background:
                  radial-gradient(ellipse at 30% 20%, rgba(217, 179, 138, 0.4), transparent 55%),
                  radial-gradient(ellipse at 70% 80%, rgba(74, 163, 80, 0.32), transparent 55%);
                filter: blur(40px);
                animation: ddbAuraGlow 4s ease-in-out infinite;
                border-radius: 50%;
              }

              .ddb-panel {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                z-index: 80;
                width: min(720px, calc(100vw - 32px));
                max-height: min(86vh, 820px);
                overflow: hidden;
                background: #fff;
                border-radius: 28px;
                border: 1px solid rgba(255, 255, 255, 0.6);
                box-shadow:
                  0 0 0 1px rgba(48, 64, 53, 0.06),
                  0 40px 100px rgba(0, 0, 0, 0.45),
                  0 12px 30px rgba(48, 64, 53, 0.22),
                  inset 0 1px 0 rgba(255, 255, 255, 0.9);
                animation: ddbReveal 0.55s cubic-bezier(0.34, 1.42, 0.64, 1);
                display: flex; flex-direction: column;
              }
              .ddb-header {
                position: relative;
                padding: 20px 22px 24px;
                background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
                color: #fff;
                overflow: hidden;
              }
              /* Halo dore qui tourne lentement en arriere-plan */
              .ddb-header::before {
                content: '';
                position: absolute;
                top: -50%; left: -10%;
                width: 320px; height: 320px;
                background: radial-gradient(circle, rgba(217, 179, 138, 0.42) 0%, rgba(217, 179, 138, 0.1) 40%, transparent 70%);
                animation: ddbHaloRotate 18s linear infinite;
                pointer-events: none;
              }
              /* 2eme halo plus subtil sur la droite */
              .ddb-header::after {
                content: '';
                position: absolute;
                bottom: -40%; right: -10%;
                width: 280px; height: 280px;
                background: radial-gradient(circle, rgba(74, 163, 80, 0.25) 0%, transparent 60%);
                animation: ddbHaloRotate 24s linear infinite reverse;
                pointer-events: none;
              }

              /* Particules sparkles dans le header */
              .ddb-sparkle {
                position: absolute;
                width: 4px; height: 4px;
                background: #d9b38a;
                border-radius: 50%;
                box-shadow: 0 0 8px rgba(217, 179, 138, 0.9), 0 0 14px rgba(217, 179, 138, 0.4);
                animation: ddbSparkleFloat 3.5s ease-in-out infinite;
                pointer-events: none;
              }
              .ddb-header-row {
                display: flex; align-items: flex-start; justify-content: space-between;
                gap: 12px; position: relative; z-index: 1;
              }
              .ddb-title-block { display: flex; align-items: center; gap: 12px; }
              .ddb-title-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: rgba(255,255,255,0.12);
                border: 1px solid rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                color: #d9b38a;
              }
              .ddb-title h3 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
              .ddb-title p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.62); }

              .ddb-close {
                width: 34px; height: 34px; border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.85);
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.2s ease;
              }
              .ddb-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

              .ddb-progress-block {
                margin-top: 16px;
                position: relative; z-index: 1;
              }
              .ddb-progress-flex {
                display: flex; align-items: center; gap: 20px;
                margin-bottom: 14px;
              }
              .ddb-circle-wrap {
                position: relative;
                width: 104px; height: 104px;
                flex-shrink: 0;
                animation: ddbCountUp 0.6s ease-out 0.4s both;
              }
              .ddb-circle-svg {
                position: absolute; inset: 0;
                width: 100%; height: 100%;
                display: block;
              }
              /* Centrage parfait : grid place-items + line-height 1 + box centree
                 sur le rayon utile du cercle (rayon 42 sur viewBox 100). */
              .ddb-circle-pct {
                position: absolute; inset: 0;
                display: grid;
                place-items: center;
                pointer-events: none;
              }
              .ddb-circle-pct-inner {
                display: inline-flex; align-items: center; gap: 1px;
                line-height: 1;
                /* Compense le poids visuel du caractere '%' a droite pour que
                   le bloc soit OPTIQUEMENT centre dans le cercle. */
                transform: translateX(-3px);
              }
              .ddb-circle-num {
                font-size: 26px; font-weight: 800; color: #fff;
                letter-spacing: -0.04em;
                line-height: 1;
                text-shadow: 0 1px 8px rgba(217, 179, 138, 0.6);
              }
              .ddb-circle-unit {
                font-size: 12px; color: rgba(255,255,255,0.72);
                font-weight: 700;
                line-height: 1;
                margin-left: 2px;
                align-self: flex-start;
                margin-top: 2px;
              }

              .ddb-progress-stats {
                display: flex; flex: 1;
                gap: 14px;
                animation: ddbCountUp 0.6s ease-out 0.55s both;
              }
              .ddb-stats-row {
                flex: 1; display: flex; flex-direction: column; align-items: flex-start;
                min-width: 0;
              }
              .ddb-stat-num {
                font-size: 22px; font-weight: 800; line-height: 1;
                letter-spacing: -0.02em;
              }
              .ddb-stat-ok { color: #86efac; text-shadow: 0 0 12px rgba(134, 239, 172, 0.4); }
              .ddb-stat-warn { color: #fdba74; text-shadow: 0 0 12px rgba(253, 186, 116, 0.4); }
              .ddb-stat-total { color: rgba(255,255,255,0.95); }
              .ddb-stat-label {
                font-size: 9.5px; color: rgba(255,255,255,0.55);
                text-transform: uppercase; letter-spacing: 0.1em;
                font-weight: 700; margin-top: 4px;
              }
              .ddb-stat-divider {
                width: 1px; height: 32px; align-self: center;
                background: rgba(255,255,255,0.12);
              }

              .ddb-progress-bar {
                height: 8px; border-radius: 999px;
                background: rgba(255,255,255,0.1);
                overflow: hidden;
                position: relative;
                border: 1px solid rgba(255,255,255,0.08);
                animation: ddbCountUp 0.6s ease-out 0.7s both;
              }
              .ddb-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #d9b38a 0%, #f0c785 50%, #d9b38a 100%);
                background-size: 200% 100%;
                animation: ddbShimmer 2.4s linear infinite;
                border-radius: 999px;
                transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
                box-shadow: 0 0 12px rgba(217, 179, 138, 0.5);
              }
              .ddb-all-done-badge {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 4px 10px; border-radius: 999px;
                background: rgba(34, 197, 94, 0.18);
                border: 1px solid rgba(34, 197, 94, 0.45);
                color: #86efac;
                font-size: 11px; font-weight: 700;
                margin-top: 8px;
                position: relative; z-index: 1;
              }

              .ddb-body {
                flex: 1;
                overflow-y: auto;
                padding: 14px 16px 18px;
                background: linear-gradient(180deg, #fbf8f3 0%, #fff 30%);
              }

              .ddb-section-title {
                font-size: 10px; font-weight: 800;
                text-transform: uppercase; letter-spacing: 0.12em;
                color: rgba(48, 64, 53, 0.45);
                margin: 4px 4px 8px;
                display: flex; align-items: center; gap: 6px;
              }
              .ddb-section-title:not(:first-child) { margin-top: 16px; }

              .ddb-row {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 14px;
                border-radius: 14px;
                background: #fff;
                border: 1px solid rgba(48, 64, 53, 0.08);
                margin-bottom: 8px;
                transition: all 0.15s ease;
                animation: ddbRowIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards;
              }
              .ddb-row:hover { border-color: rgba(48, 64, 53, 0.18); box-shadow: 0 2px 10px rgba(48, 64, 53, 0.06); transform: translateX(2px); }
              .ddb-row-validated { background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); border-color: rgba(34, 197, 94, 0.25); }
              .ddb-row-pending   { background: linear-gradient(135deg, #fff7ed 0%, #fff 100%); border-color: rgba(249, 115, 22, 0.28); }

              .ddb-icon-circle {
                width: 32px; height: 32px; border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
              }
              .ddb-icon-validated { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; animation: ddbRingPulse 2.5s ease-in-out infinite; }
              .ddb-icon-pending   { background: linear-gradient(135deg, #fb923c, #ea580c); color: #fff; animation: ddbWarnPulse 2.5s ease-in-out infinite; }

              .ddb-row-label {
                flex: 1; min-width: 0;
                font-size: 13px; font-weight: 700;
                color: #1a1614;
              }
              .ddb-row-meta {
                font-size: 11px; color: rgba(48, 64, 53, 0.5);
                margin-top: 2px; font-weight: 500;
              }
              .ddb-row-date {
                font-size: 12px; font-weight: 700;
                font-family: 'Courier New', monospace;
                padding: 4px 10px; border-radius: 8px;
                flex-shrink: 0;
              }
              .ddb-row-date-ok { background: rgba(34, 197, 94, 0.12); color: #15803d; }
              .ddb-row-date-warn { background: rgba(249, 115, 22, 0.12); color: #c2410c; }

              .ddb-empty {
                padding: 32px 16px; text-align: center;
                color: rgba(48, 64, 53, 0.4);
                font-size: 13px;
              }

              @media (max-width: 768px) {
                .ddb-panel { top: 70px; right: 12px; left: 12px; width: auto; }
                .ddb-progress-pct { font-size: 24px; }
              }
            `}</style>

            <div className="ddb-backdrop" onClick={() => setShowDashboard(false)} aria-hidden="true" />
            <div className="ddb-aura" aria-hidden="true" />

            <aside id="dossier-dashboard-panel" className="ddb-panel" role="dialog" aria-label="Tableau de bord du dossier">
              {/* Header avec progression + sparkles + halos rotatifs */}
              <div className="ddb-header">
                {/* Particules dorees scintillantes */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const positions = [
                    { left: '12%', bottom: '10%', delay: '0s' },
                    { left: '28%', bottom: '40%', delay: '0.6s' },
                    { left: '46%', bottom: '15%', delay: '1.2s' },
                    { left: '62%', bottom: '50%', delay: '0.3s' },
                    { left: '78%', bottom: '22%', delay: '0.9s' },
                    { left: '88%', bottom: '60%', delay: '1.5s' },
                    { left: '20%', bottom: '70%', delay: '2.1s' },
                    { left: '70%', bottom: '8%',  delay: '1.8s' },
                  ];
                  const p = positions[i];
                  return (
                    <span
                      key={i}
                      className="ddb-sparkle"
                      style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }}
                    />
                  );
                })}

                <div className="ddb-header-row">
                  <div className="ddb-title-block">
                    <div className="ddb-title-icon"><LayoutDashboard className="h-5 w-5" /></div>
                    <div className="ddb-title">
                      <h3>Tableau de bord</h3>
                      <p>{dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''} · {totalSubs} sous-dossier{totalSubs > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ddb-close"
                    onClick={() => setShowDashboard(false)}
                    aria-label="Fermer le tableau de bord"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Barre de progression + cercle radial — visible uniquement si au moins un sous-dossier */}
                {totalSubs > 0 && (
                  <div className="ddb-progress-block">
                    <div className="ddb-progress-flex">
                      {/* Cercle radial wahou */}
                      <div className="ddb-circle-wrap">
                        <svg viewBox="0 0 100 100" className="ddb-circle-svg" aria-hidden="true">
                          <defs>
                            <linearGradient id="ddbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#f0c785" />
                              <stop offset="50%" stopColor="#d9b38a" />
                              <stop offset="100%" stopColor="#c89a64" />
                            </linearGradient>
                            <filter id="ddbGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2" result="b" />
                              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="url(#ddbGrad)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * progressPct) / 100}
                            transform="rotate(-90 50 50)"
                            filter="url(#ddbGlow)"
                            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
                          />
                        </svg>
                        <div className="ddb-circle-pct">
                          <span className="ddb-circle-pct-inner">
                            <span className="ddb-circle-num">{progressPct}</span>
                            <span className="ddb-circle-unit">%</span>
                          </span>
                        </div>
                      </div>

                      {/* Stats à droite */}
                      <div className="ddb-progress-stats">
                        <div className="ddb-stats-row">
                          <span className="ddb-stat-num ddb-stat-ok">{validatedSubs.length}</span>
                          <span className="ddb-stat-label">Validés</span>
                        </div>
                        <div className="ddb-stat-divider" />
                        <div className="ddb-stats-row">
                          <span className="ddb-stat-num ddb-stat-warn">{pendingSubs.length}</span>
                          <span className="ddb-stat-label">En attente</span>
                        </div>
                        <div className="ddb-stat-divider" />
                        <div className="ddb-stats-row">
                          <span className="ddb-stat-num ddb-stat-total">{totalSubs}</span>
                          <span className="ddb-stat-label">Total</span>
                        </div>
                      </div>
                    </div>

                    <div className="ddb-progress-bar">
                      <div className="ddb-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    {allDone && (
                      <div className="ddb-all-done-badge">
                        <Check className="h-3 w-3" />
                        Dossier complet — tous les sous-dossiers validés
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body — listes des sous-dossiers */}
              <div className="ddb-body">
                {totalSubs === 0 ? (
                  <div className="ddb-empty">
                    Ce dossier ne contient pas encore de sous-dossier.
                  </div>
                ) : (
                  <>
                    {/* Section : sous-dossiers en attente (priorité haute en haut) */}
                    {pendingSubs.length > 0 && (
                      <>
                        <div className="ddb-section-title">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          En attente · {pendingSubs.length}
                        </div>
                        {pendingSubs.map((sf, i) => {
                          const docsCount = sf.documents?.length ?? 0;
                          return (
                            <div
                              key={`p-${sf.label}`}
                              className="ddb-row ddb-row-pending"
                              style={{ animationDelay: `${i * 60}ms` }}
                              role="button"
                              tabIndex={0}
                              onClick={() => { setOpenedSubfolder(sf.label); setShowDashboard(false); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenedSubfolder(sf.label); setShowDashboard(false); } }}
                            >
                              <div className="ddb-icon-circle ddb-icon-pending">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="ddb-row-label">{sf.label}</div>
                                <div className="ddb-row-meta">
                                  {docsCount === 0 ? 'Vide · à compléter' : `${docsCount} document${docsCount > 1 ? 's' : ''} · à valider`}
                                </div>
                              </div>
                              <div className="ddb-row-date ddb-row-date-warn">À VALIDER</div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Section : sous-dossiers validés */}
                    {validatedSubs.length > 0 && (
                      <>
                        <div className="ddb-section-title">
                          <Check className="h-3 w-3 text-green-600" />
                          Validés · {validatedSubs.length}
                        </div>
                        {validatedSubs.map((sf, i) => {
                          const displayDate = sf.date ?? dossier.createdAt;
                          return (
                            <div
                              key={`v-${sf.label}`}
                              className="ddb-row ddb-row-validated"
                              style={{ animationDelay: `${(pendingSubs.length + i) * 60}ms` }}
                              role="button"
                              tabIndex={0}
                              onClick={() => { setOpenedSubfolder(sf.label); setShowDashboard(false); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenedSubfolder(sf.label); setShowDashboard(false); } }}
                            >
                              <div className="ddb-icon-circle ddb-icon-validated">
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="ddb-row-label">{sf.label}</div>
                                <div className="ddb-row-meta">
                                  Validé le {displayDate}
                                </div>
                              </div>
                              <div className="ddb-row-date ddb-row-date-ok">{displayDate}</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>
            </aside>
          </>
        );
      })()}
    </div>
  );
}
 