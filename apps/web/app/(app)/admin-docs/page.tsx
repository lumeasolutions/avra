'use client';

/**
 * /admin-docs — Dossier administratif (admin only).
 *
 * Fonctionnalités :
 *  - Upload (drag&drop global ou bouton) avec MIME whitelist + scan magic bytes
 *  - Catégories : Juridique / Assurances / Fournisseurs / RH / Divers
 *  - Préférences : tags personnalisés, description, date d'expiration
 *  - Tableau de bord avec KPIs + alertes d'expiration
 *  - Vue grille / liste, tri colonnes, multi-sélection + actions en lot
 *  - Prévisualisation inline (PDF iframe sandboxé, images zoomables)
 *  - Versioning : remplace un doc → version N+1, historique conservé
 *  - Liens de partage temporaires (1h-7j) avec révocation
 *  - Audit log RGPD-conforme (qui, quand, quoi, IP) — conservation 90 jours
 *  - Suppression avec modale de confirmation "wahou"
 *
 * Sécurité côté frontend :
 *  - Tous les appels passent par le helper `api()` qui injecte le CSRF token
 *  - Aucun secret n'est exposé au client (cookies HttpOnly, tokens en mémoire)
 *  - L'aperçu PDF utilise un iframe sandboxé avec CSP strict côté serveur
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FolderOpen, Upload, Search, X, File, FileText, ImageIcon,
  Trash2, Download, Plus, Shield, Lock, Eye, Edit3,
  Briefcase, Users, Building2, Package, Check,
  Loader2, AlertCircle, AlertTriangle, Clock,
  LayoutDashboard, History, Link2, ListChecks, LayoutGrid, List,
  ArrowUpDown, ArrowUp, ArrowDown, Tag as TagIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useAdminDocsStore,
  type AdminDoc,
  parseTags,
  expirationStatus,
  formatBytes,
} from '@/store/useAdminDocsStore';

import { AdminDocPreviewModal } from '@/components/admin-docs/AdminDocPreviewModal';
import { AdminDocDeleteModal } from '@/components/admin-docs/AdminDocDeleteModal';
import { AdminDocEditModal } from '@/components/admin-docs/AdminDocEditModal';
import { AdminDocVersionsModal } from '@/components/admin-docs/AdminDocVersionsModal';
import { AdminDocShareModal } from '@/components/admin-docs/AdminDocShareModal';
import { AdminDocsDashboardPanel } from '@/components/admin-docs/AdminDocsDashboardPanel';
import { AdminDocsAuditPanel } from '@/components/admin-docs/AdminDocsAuditPanel';

// ─── Catégories ─────────────────────────────────────────────────────────────

const CATEGORY_DEFS = [
  { id: 'all',          label: 'Tous les documents', icon: FolderOpen },
  { id: 'Juridique',    label: 'Juridique',          icon: Building2 },
  { id: 'Assurances',   label: 'Assurances',         icon: Shield },
  { id: 'Fournisseurs', label: 'Fournisseurs',       icon: Package },
  { id: 'RH',           label: 'Ressources Humaines', icon: Users },
  { id: 'Divers',       label: 'Divers',             icon: Briefcase },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="h-5 w-5 text-emerald-600" />;
  return <File className="h-5 w-5 text-[#304035]/50" />;
}

function categoryLabel(folderId: string | null): string {
  return CATEGORY_DEFS.find(c => c.id === folderId)?.label ?? folderId ?? 'Divers';
}

type SortKey = 'name' | 'date' | 'size' | 'category' | 'expiresAt';
type SortDir = 'asc' | 'desc';

// ─── Page principale ─────────────────────────────────────────────────────────

export default function AdminDocsPage() {
  const {
    docs, stats, audit, auditTotal,
    loading, uploading, loadingStats, loadingAudit, error,
    fetchDocs, fetchStats, fetchAudit,
    uploadDoc, updateDoc, deleteDoc, bulkDeleteDocs,
    downloadDoc, fetchVersions, fetchShares, createShare, revokeShare,
  } = useAdminDocsStore();

  // ── État UI ──────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── État upload ──────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocCat, setNewDocCat] = useState('Juridique');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [newDocTags, setNewDocTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragOverPage, setDragOverPage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── État modaux ──────────────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<AdminDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDoc | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [editDoc, setEditDoc] = useState<AdminDoc | null>(null);
  const [versionsDoc, setVersionsDoc] = useState<AdminDoc | null>(null);
  const [shareDoc, setShareDoc] = useState<AdminDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Panels ───────────────────────────────────────────────────────────────
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 50;

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => { fetchDocs(); fetchStats(); }, [fetchDocs, fetchStats]);

  useEffect(() => {
    if (showAudit) fetchAudit(auditPage, auditPageSize);
  }, [showAudit, auditPage, fetchAudit]);

  // ── Drag & drop global (toute la page) ───────────────────────────────────
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        setDragOverPage(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      // On ne masque que si on quitte VRAIMENT la fenêtre
      if (e.relatedTarget === null || (e as any).clientX === 0) {
        setDragOverPage(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOverPage(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleFileSelect(file);
        setShowUpload(true);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtrage + tri ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = docs;
    if (activeCategory !== 'all') list = list.filter(d => d.folderId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.storedFile.originalName.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (d.tagsCsv ?? '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.title.localeCompare(b.title); break;
        case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'size': cmp = a.storedFile.sizeBytes - b.storedFile.sizeBytes; break;
        case 'category': cmp = (a.folderId ?? '').localeCompare(b.folderId ?? ''); break;
        case 'expiresAt': {
          const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
          cmp = ax - bx;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [docs, activeCategory, search, sortKey, sortDir]);

  const countFor = (catId: string) =>
    catId === 'all' ? docs.length : docs.filter(d => d.folderId === catId).length;

  const totalSize = useMemo(() => docs.reduce((s, d) => s + d.storedFile.sizeBytes, 0), [docs]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    if (!newDocTitle) setNewDocTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newDocTitle]);

  const resetUploadForm = () => {
    setSelectedFile(null);
    setNewDocTitle('');
    setNewDocDesc('');
    setNewDocExpiry('');
    setNewDocTags('');
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadError(null);
    try {
      await uploadDoc(selectedFile, {
        category: newDocCat,
        title: newDocTitle || selectedFile.name,
        description: newDocDesc || undefined,
        tagsCsv: newDocTags || undefined,
        expiresAt: newDocExpiry || undefined,
      });
      resetUploadForm();
      setShowUpload(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (e: any) {
      setUploadError(e?.message ?? 'Erreur upload');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError(null);
    try {
      await deleteDoc(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedIds((s) => { const next = new Set(s); next.delete(deleteTarget.id); return next; });
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Erreur suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true); setDeleteError(null);
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteDocs(ids);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Erreur suppression bulk');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((s) => {
      if (s.size === filtered.length) return new Set();
      return new Set(filtered.map((d) => d.id));
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' || key === 'size' ? 'desc' : 'asc'); }
  };

  const handleVersionUpload = async (file: File) => {
    if (!versionsDoc) return;
    await uploadDoc(file, {
      category: versionsDoc.folderId ?? 'Divers',
      title: versionsDoc.title,
      replaceDocumentId: versionsDoc.id,
    });
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-5 relative">
      <style>{`
        @media (max-width: 768px) {
          .adm-main-layout { flex-direction: column !important; }
          .adm-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 6px !important; }
          .adm-sidebar > * { flex: 1 1 auto !important; min-width: 120px !important; }
          .adm-table-wrap { overflow-x: auto; }
          .adm-table-inner { min-width: 720px; }
        }
        @keyframes admDropPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.02); }
        }
        .adm-drop-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(166, 119, 73, 0.18);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          animation: addbFade 0.2s ease-out;
        }
        .adm-drop-card {
          padding: 32px 48px;
          background: linear-gradient(135deg, #fff8ef 0%, #fff 100%);
          border: 3px dashed #a67749;
          border-radius: 28px;
          box-shadow: 0 32px 80px rgba(166,119,73,0.4);
          text-align: center;
          animation: admDropPulse 1.4s ease-in-out infinite;
        }
        .adm-drop-card svg { color: #a67749; margin: 0 auto 12px; }
        .adm-drop-card h3 { margin: 0; font-size: 22px; color: #1a1614; font-weight: 800; }
        .adm-drop-card p { margin: 6px 0 0; font-size: 13px; color: rgba(48,64,53,0.6); }
      `}</style>

      {/* ── Drop zone overlay (drag&drop global) ── */}
      {dragOverPage && !showUpload && (
        <div className="adm-drop-overlay">
          <div className="adm-drop-card">
            <Upload style={{ width: 48, height: 48 }} />
            <h3>Déposez votre fichier</h3>
            <p>Le formulaire d'upload s'ouvrira automatiquement.</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <PageHeader
        icon={<Shield className="h-7 w-7" />}
        title="Dossier administratif"
        subtitle={`${docs.length} document${docs.length > 1 ? 's' : ''} · ${formatBytes(totalSize)} · Accès restreint Admin`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {uploadSuccess && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">
                <Check className="h-4 w-4" /> Document ajouté
              </div>
            )}
            <button
              type="button"
              onClick={() => { fetchStats(); setShowDashboard(true); }}
              className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
              title="Tableau de bord — KPIs & alertes"
            >
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </button>
            <button
              type="button"
              onClick={() => { setAuditPage(1); setShowAudit(true); }}
              className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
              title="Journal d'audit (qui a fait quoi)"
            >
              <Shield className="h-4 w-4" />
              Audit
            </button>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-xl bg-[#a67749] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a67749]/85 shadow-md transition-colors"
            >
              <Upload className="h-4 w-4" /> Ajouter un document
            </button>
          </div>
        }
      />

      {/* ── Bannière sécurité ── */}
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-700">
          <span className="font-bold">Espace sécurisé — </span>
          Documents confidentiels accessibles uniquement aux membres avec le rôle <span className="font-bold">ADMIN</span>.
          Toutes les actions (upload, téléchargement, suppression, partage) sont auditées.
        </p>
      </div>

      {/* ── Erreur API globale ── */}
      {error && error !== 'Unauthorized' && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="adm-main-layout flex gap-5">

        {/* ── Sidebar catégories ── */}
        <div className="adm-sidebar w-52 shrink-0 space-y-1">
          {CATEGORY_DEFS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                activeCategory === cat.id
                  ? 'bg-[#304035] text-white shadow-md'
                  : 'bg-white border border-[#304035]/10 text-[#304035] hover:bg-[#304035]/5'
              )}
            >
              <div className="flex items-center gap-2.5">
                <cat.icon className="h-4 w-4 shrink-0" />
                <span className="text-left leading-snug">{cat.label}</span>
              </div>
              <span className={cn(
                'text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-[#304035]/10 text-[#304035]/60'
              )}>{countFor(cat.id)}</span>
            </button>
          ))}
        </div>

        {/* ── Zone documents ── */}
        <div className="flex-1 space-y-3">

          {/* Toolbar : Search + View toggle + Sort + Bulk actions */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher (nom, fichier, description, tag)…"
                className="w-full rounded-xl border border-[#304035]/15 bg-white py-2.5 pl-10 pr-4 text-sm text-[#304035] placeholder:text-[#304035]/35 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-[#304035]/40" />
                </button>
              )}
            </div>

            {/* Toggle vue grille/liste */}
            <div className="flex items-center bg-white border border-[#304035]/10 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/55 hover:text-[#304035]')}
                title="Vue liste"
                aria-label="Vue liste"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/55 hover:text-[#304035]')}
                title="Vue grille"
                aria-label="Vue grille"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bulk actions bar (apparait quand au moins 1 doc sélectionné) */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-[#304035] text-white px-4 py-2.5 shadow-md">
              <div className="flex items-center gap-3 text-sm">
                <ListChecks className="h-4 w-4" />
                <span className="font-bold">{selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-white/65 hover:text-white underline"
                >
                  Désélectionner
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setBulkDeleteCount(selectedIds.size); setShowBulkDelete(true); }}
                className="flex items-center gap-2 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-bold hover:bg-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#304035]">Ajouter un document</h3>
                <button onClick={() => { setShowUpload(false); resetUploadForm(); }}>
                  <X className="h-4 w-4 text-[#304035]/40" />
                </button>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {uploadError}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  dragOver ? 'border-[#304035] bg-[#304035]/5' : 'border-[#304035]/20 bg-[#f5eee8]/30 hover:border-[#304035]/40'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-[#304035]">{selectedFile.name}</p>
                    <p className="text-xs text-[#304035]/50">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#304035]/30 mx-auto mb-3" />
                    <p className="text-sm text-[#304035]/50 mb-1">Glissez votre fichier ici ou <span className="font-bold text-[#304035] underline">parcourez</span></p>
                    <p className="text-xs text-[#304035]/35">PDF, Word, Excel, images, txt — Max 25 Mo · MIME validé serveur</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Titre</label>
                  <input
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                    placeholder="Kbis 2026"
                    maxLength={200}
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Catégorie</label>
                  <select
                    value={newDocCat}
                    onChange={e => setNewDocCat(e.target.value)}
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  >
                    {CATEGORY_DEFS.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Date d'expiration (optionnelle)</label>
                  <input
                    type="date"
                    value={newDocExpiry}
                    onChange={e => setNewDocExpiry(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Tags (séparés par virgules)</label>
                  <input
                    value={newDocTags}
                    onChange={e => setNewDocTags(e.target.value)}
                    placeholder="urgent, 2026, blum"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Description / Notes (optionnelle)</label>
                <textarea
                  value={newDocDesc}
                  onChange={e => setNewDocDesc(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Notes internes (référence, contact, contexte…)"
                  className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowUpload(false); resetUploadForm(); }}
                  className="px-4 py-2 text-sm text-[#304035]/60 hover:text-[#304035]"
                  disabled={uploading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex items-center gap-2 rounded-xl bg-[#304035] px-5 py-2 text-sm font-bold text-white hover:bg-[#304035]/90 disabled:opacity-40 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {uploading ? 'Envoi…' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-[#304035]/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Chargement des documents…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white border border-[#304035]/8 p-12 text-center">
              <FolderOpen className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
              <p className="font-semibold text-[#304035]/50">Aucun document dans cette catégorie</p>
              <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-[#304035] font-bold underline">
                Ajouter le premier
              </button>
            </div>
          )}

          {/* List view */}
          {!loading && filtered.length > 0 && viewMode === 'list' && (
            <div className="rounded-2xl bg-white border border-[#304035]/8 overflow-hidden">
              <div className="adm-table-wrap"><div className="adm-table-inner">
                <div className="grid grid-cols-[36px_28px_1fr_140px_100px_110px_120px_130px] gap-0 px-4 py-2.5 bg-[#304035]/5 border-b border-[#304035]/8 text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest items-center">
                  <div>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 accent-[#304035] cursor-pointer"
                      aria-label="Tout sélectionner"
                    />
                  </div>
                  <div />
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-[#304035] text-left">
                    Nom {sortIcon('name')}
                  </button>
                  <button onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-[#304035]">
                    Catégorie {sortIcon('category')}
                  </button>
                  <button onClick={() => handleSort('size')} className="flex items-center gap-1 hover:text-[#304035]">
                    Taille {sortIcon('size')}
                  </button>
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-[#304035]">
                    Date {sortIcon('date')}
                  </button>
                  <button onClick={() => handleSort('expiresAt')} className="flex items-center gap-1 hover:text-[#304035]">
                    Expiration {sortIcon('expiresAt')}
                  </button>
                  <div className="text-right">Actions</div>
                </div>

                {filtered.map((doc, i) => {
                  const expState = expirationStatus(doc.expiresAt);
                  const tags = parseTags(doc.tagsCsv);
                  const versionCount = (doc._count?.childVersions ?? 0) + 1;
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'grid grid-cols-[36px_28px_1fr_140px_100px_110px_120px_130px] gap-0 items-center px-4 py-3 transition-colors',
                        isSelected ? 'bg-[#a67749]/8' : 'hover:bg-[#f5eee8]/40',
                        i < filtered.length - 1 && 'border-b border-[#304035]/5'
                      )}
                    >
                      <div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
                          className="h-3.5 w-3.5 accent-[#304035] cursor-pointer"
                          aria-label={`Sélectionner ${doc.title}`}
                        />
                      </div>
                      <div>{fileIcon(doc.storedFile.mimeType)}</div>
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-sm text-[#304035] leading-snug truncate">
                          {doc.title}
                          {versionCount > 1 && (
                            <span className="ml-2 text-[10px] font-bold text-[#a67749] bg-[#a67749]/10 px-1.5 py-0.5 rounded">
                              v{versionCount}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#304035]/40 truncate">{doc.storedFile.originalName}</p>
                        {tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {tags.slice(0, 4).map((t) => (
                              <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#a67749]/10 text-[#7c4f1d]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#304035]/55">{categoryLabel(doc.folderId)}</div>
                      <div className="text-xs text-[#304035]/55">{formatBytes(doc.storedFile.sizeBytes)}</div>
                      <div className="text-xs text-[#304035]/55">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs">
                        {doc.expiresAt ? (
                          <span className={cn(
                            'font-semibold px-2 py-0.5 rounded',
                            expState === 'expired' && 'bg-red-100 text-red-700',
                            expState === 'soon' && 'bg-orange-100 text-orange-700',
                            expState === 'far' && 'bg-emerald-50 text-emerald-700',
                          )}>
                            {expState === 'expired' && '⚠ '}
                            {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-[#304035]/30">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 rounded-lg hover:bg-[#304035]/8 text-[#304035]/40 hover:text-[#304035] transition-colors"
                          title="Aperçu"
                          aria-label="Aperçu"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => downloadDoc(doc.id, doc.storedFile.originalName)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-[#304035]/40 hover:text-blue-600 transition-colors"
                          title="Télécharger"
                          aria-label="Télécharger"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditDoc(doc)}
                          className="p-1.5 rounded-lg hover:bg-[#a67749]/10 text-[#304035]/40 hover:text-[#a67749] transition-colors"
                          title="Modifier"
                          aria-label="Modifier"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setVersionsDoc(doc)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-[#304035]/40 hover:text-purple-600 transition-colors"
                          title="Versions"
                          aria-label="Versions"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setShareDoc(doc)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-[#304035]/40 hover:text-cyan-600 transition-colors"
                          title="Partager"
                          aria-label="Partager"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#304035]/40 hover:text-red-600 transition-colors"
                          title="Supprimer"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div></div>
            </div>
          )}

          {/* Grid view */}
          {!loading && filtered.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((doc) => {
                const expState = expirationStatus(doc.expiresAt);
                const tags = parseTags(doc.tagsCsv);
                const versionCount = (doc._count?.childVersions ?? 0) + 1;
                const isSelected = selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'relative rounded-2xl bg-white border p-4 transition-all',
                      isSelected ? 'border-[#a67749] ring-2 ring-[#a67749]/30' : 'border-[#304035]/8 hover:border-[#304035]/20 hover:shadow-md'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(doc.id)}
                      className="absolute top-3 left-3 h-3.5 w-3.5 accent-[#304035] cursor-pointer"
                      aria-label={`Sélectionner ${doc.title}`}
                    />
                    <div className="flex items-start gap-2 mb-3 pl-7">
                      {fileIcon(doc.storedFile.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#304035] leading-snug truncate">
                          {doc.title}
                          {versionCount > 1 && (
                            <span className="ml-2 text-[10px] font-bold text-[#a67749] bg-[#a67749]/10 px-1.5 py-0.5 rounded">
                              v{versionCount}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#304035]/45 truncate">{categoryLabel(doc.folderId)}</p>
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mb-2 flex-wrap">
                        {tags.slice(0, 5).map((t) => (
                          <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#a67749]/10 text-[#7c4f1d]">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-[11px] text-[#304035]/55 space-y-1 mb-3">
                      <div>{formatBytes(doc.storedFile.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</div>
                      {doc.expiresAt && (
                        <div className={cn(
                          'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px]',
                          expState === 'expired' && 'bg-red-100 text-red-700',
                          expState === 'soon' && 'bg-orange-100 text-orange-700',
                          expState === 'far' && 'bg-emerald-50 text-emerald-700',
                        )}>
                          {expState === 'expired' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          Expire {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t border-[#304035]/5 -mx-4 px-4">
                      <button onClick={() => setPreviewDoc(doc)} className="flex-1 p-1.5 rounded-lg hover:bg-[#304035]/8 text-[#304035]/55" title="Aperçu" aria-label="Aperçu"><Eye className="h-3.5 w-3.5 mx-auto" /></button>
                      <button onClick={() => downloadDoc(doc.id, doc.storedFile.originalName)} className="flex-1 p-1.5 rounded-lg hover:bg-blue-50 text-[#304035]/55 hover:text-blue-600" title="Télécharger" aria-label="Télécharger"><Download className="h-3.5 w-3.5 mx-auto" /></button>
                      <button onClick={() => setEditDoc(doc)} className="flex-1 p-1.5 rounded-lg hover:bg-[#a67749]/10 text-[#304035]/55 hover:text-[#a67749]" title="Modifier" aria-label="Modifier"><Edit3 className="h-3.5 w-3.5 mx-auto" /></button>
                      <button onClick={() => setVersionsDoc(doc)} className="flex-1 p-1.5 rounded-lg hover:bg-purple-50 text-[#304035]/55 hover:text-purple-600" title="Versions" aria-label="Versions"><History className="h-3.5 w-3.5 mx-auto" /></button>
                      <button onClick={() => setShareDoc(doc)} className="flex-1 p-1.5 rounded-lg hover:bg-cyan-50 text-[#304035]/55 hover:text-cyan-600" title="Partager" aria-label="Partager"><Link2 className="h-3.5 w-3.5 mx-auto" /></button>
                      <button onClick={() => setDeleteTarget(doc)} className="flex-1 p-1.5 rounded-lg hover:bg-red-50 text-[#304035]/55 hover:text-red-600" title="Supprimer" aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5 mx-auto" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modaux ──────────────────────────────────────────────────────── */}

      <AdminDocPreviewModal
        open={!!previewDoc}
        documentId={previewDoc?.id ?? null}
        title={previewDoc?.title ?? ''}
        mimeType={previewDoc?.storedFile.mimeType ?? ''}
        onClose={() => setPreviewDoc(null)}
        onDownload={previewDoc ? () => downloadDoc(previewDoc.id, previewDoc.storedFile.originalName) : undefined}
      />

      <AdminDocDeleteModal
        open={!!deleteTarget}
        singleTitle={deleteTarget?.title ?? null}
        bulkCount={0}
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null); } }}
      />

      <AdminDocDeleteModal
        open={showBulkDelete}
        singleTitle={null}
        bulkCount={bulkDeleteCount}
        loading={deleting}
        error={deleteError}
        onConfirm={handleBulkDelete}
        onCancel={() => { if (!deleting) { setShowBulkDelete(false); setDeleteError(null); } }}
      />

      <AdminDocEditModal
        open={!!editDoc}
        doc={editDoc}
        onSave={updateDoc}
        onClose={() => setEditDoc(null)}
      />

      <AdminDocVersionsModal
        open={!!versionsDoc}
        doc={versionsDoc}
        fetchVersions={fetchVersions}
        onUploadNewVersion={handleVersionUpload}
        onDownload={downloadDoc}
        onClose={() => setVersionsDoc(null)}
      />

      <AdminDocShareModal
        open={!!shareDoc}
        doc={shareDoc}
        fetchShares={fetchShares}
        createShare={createShare}
        revokeShare={revokeShare}
        onClose={() => setShareDoc(null)}
      />

      <AdminDocsDashboardPanel
        open={showDashboard}
        stats={stats}
        loading={loadingStats}
        onClose={() => setShowDashboard(false)}
        onCategoryClick={(cat) => { setActiveCategory(cat); setShowDashboard(false); }}
        onDocClick={(id) => {
          const d = docs.find((x) => x.id === id);
          if (d) {
            setShowDashboard(false);
            setEditDoc(d);
          }
        }}
      />

      <AdminDocsAuditPanel
        open={showAudit}
        audit={audit}
        total={auditTotal}
        loading={loadingAudit}
        page={auditPage}
        pageSize={auditPageSize}
        onPageChange={setAuditPage}
        onClose={() => setShowAudit(false)}
      />
    </div>
  );
}
