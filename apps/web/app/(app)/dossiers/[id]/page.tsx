'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen, FileText, ImageIcon, Ruler, CheckCircle, ArrowLeft,
  GitCompare, AlertTriangle, Plus, ChevronRight, Tag, Phone, Mail,
  MapPin, Calendar, Receipt, FileCheck, StickyNote, Pencil, X,
  Clock, Circle, TrendingUp, Zap, Eye, Download, Check
} from 'lucide-react';
import { useDossierStore, useFacturationStore } from '@/store';
import type { DocumentFile, SubFolderDocument } from '@/store/useDossierStore';
import { MENUISIER_PROJET_REGEX } from '@/store/useDossierStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Trash2 } from 'lucide-react';
import { uploadDossierDoc, listDossierDocs, getDocSignedUrl, deleteDossierDoc } from '@/lib/dossier-docs-api';
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
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderLabel, setNewFolderLabel] = useState('');
  // Modal "documents dans le sous-dossier"
  const [openedSubfolder, setOpenedSubfolder] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  // États transitoires pour les opérations docs (loading + erreur visible).
  const [docOpStatus, setDocOpStatus] = useState<{ kind: 'idle' | 'uploading' | 'deleting' | 'error' | 'success'; message?: string }>({ kind: 'idle' });
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
              {dossier.subfolders.map((sf, i) => {
                // Alerte dynamique : uniquement si le sous-dossier est vide
                // (aucun document présent). Dès qu'un document est ajouté,
                // l'alerte disparaît automatiquement.
                const isEmpty = !sf.documents || sf.documents.length === 0;
                const isValidated = !!sf.validated;
                const docsCount = sf.documents?.length ?? 0;
                // Date affichée : dernière modif du sous-dossier, sinon date de création du dossier
                const displayDate = sf.date ?? dossier.createdAt;
                return (
                <div key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenedSubfolder(sf.label)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenedSubfolder(sf.label); } }}
                  className="subfolder-row flex w-full items-center gap-4 px-5 py-4 text-left transition-all border-l-4 border-l-transparent hover:border-l-[#a67749] hover:bg-[#304035]/[0.02] cursor-pointer"
                >
                  <div className="p-2 bg-[#304035]/5 rounded-xl text-[#a67749]/70 shrink-0">
                    {getIconForType(sf.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[#304035] text-sm block truncate">{sf.label}</span>
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
            <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#304035]">{sf.label}</h3>
                  <p className="text-xs text-[#304035]/50 mt-1">
                    {docs.length} document{docs.length > 1 ? 's' : ''}{sf.date ? ` · Modifié le ${sf.date}` : ''}
                  </p>
                </div>
                <button onClick={() => { setOpenedSubfolder(null); setDocOpStatus({ kind: 'idle' }); setNewDocName(''); }} className="p-2 rounded-lg hover:bg-[#304035]/5 transition-colors" aria-label="Fermer">
                  <X className="h-5 w-5 text-[#304035]/60" />
                </button>
              </div>

              {/* Liste des documents */}
              <div className="rounded-xl border border-[#304035]/10 divide-y divide-[#304035]/5 mb-5 max-h-72 overflow-y-auto">
                {docs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#304035]/40 text-sm">
                    Aucun document dans ce sous-dossier
                  </div>
                ) : docs.map((doc, i) => {
                  // Un doc est prévisualisable si on peut récupérer son contenu :
                  //  - docId (API → URL signée fraîche)
                  //  - dataUrl (legacy local)
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
    </div>
  );
}
 