'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FolderOpen, Upload, Search, X, File, FileText, ImageIcon,
  Trash2, Download, Plus, Shield, Lock,
  Briefcase, Users, Building2, Package, Check, FolderPlus,
  Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAdminDocsStore, type AdminDoc } from '@/store/useAdminDocsStore';

// ─── Catégories ───────────────────────────────────────────────────────────────

const CATEGORY_DEFS = [
  { id: 'all',          label: 'Tous les documents',  icon: FolderOpen  },
  { id: 'Juridique',    label: 'Juridique',            icon: Building2   },
  { id: 'Assurances',   label: 'Assurances',           icon: Shield      },
  { id: 'Fournisseurs', label: 'Fournisseurs',         icon: Package     },
  { id: 'RH',           label: 'Ressources Humaines',  icon: Users       },
  { id: 'Divers',       label: 'Divers',               icon: Briefcase   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-[#304035]/50" />;
}

function categoryLabel(folderId: string | null): string {
  return CATEGORY_DEFS.find(c => c.id === folderId)?.label ?? folderId ?? 'Divers';
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDocsPage() {
  const { docs, loading, uploading, error, fetchDocs, uploadDoc, deleteDoc, downloadDoc } = useAdminDocsStore();

  const [activeCategory, setActive] = useState('all');
  const [search, setSearch]         = useState('');
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocCat, setNewDocCat]       = useState('Juridique');
  const [newDocTitle, setNewDocTitle]   = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  const filtered = docs.filter(d => {
    const matchCat = activeCategory === 'all' || d.folderId === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.storedFile.originalName.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const countFor = (catId: string) =>
    catId === 'all' ? docs.length : docs.filter(d => d.folderId === catId).length;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!newDocTitle) setNewDocTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [newDocTitle]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadDoc(selectedFile, newDocCat, newDocTitle || selectedFile.name);
      setSelectedFile(null);
      setNewDocTitle('');
      setShowUpload(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch {
      // error already in store
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(id);
    setDeleteId(null);
  };

  const handleDownload = async (doc: AdminDoc) => {
    await downloadDoc(doc.id, doc.storedFile.originalName);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <PageHeader
        icon={<Shield className="h-7 w-7" />}
        title="Dossier administratif"
        subtitle={`${docs.length} document${docs.length > 1 ? 's' : ''} • Accès restreint Admin`}
        actions={
          <div className="flex items-center gap-2">
            {uploadSuccess && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700">
                <Check className="h-4 w-4" /> Document ajouté
              </div>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-xl bg-[#a67749] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a67749]/85 transition-colors"
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
          Ces documents sont confidentiels et accessibles uniquement aux membres avec le rôle <span className="font-bold">ADMIN</span>.
        </p>
      </div>

      {/* ── Erreur API ── */}
      {error && error !== 'Unauthorized' && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-5">

        {/* ── Sidebar catégories ── */}
        <div className="w-52 shrink-0 space-y-1">
          {CATEGORY_DEFS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                activeCategory === cat.id
                  ? 'bg-[#304035] text-white'
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

          <button
            onClick={() => { setShowUpload(true); }}
            className="w-full flex items-center gap-2 rounded-xl border border-dashed border-[#304035]/20 px-3.5 py-2.5 text-sm text-[#304035]/40 hover:text-[#304035]/70 hover:border-[#304035]/40 transition-colors"
          >
            <FolderPlus className="h-4 w-4" /> Ajouter un document
          </button>
        </div>

        {/* ── Zone documents ── */}
        <div className="flex-1 space-y-4">

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom…"
              className="w-full rounded-xl border border-[#304035]/15 bg-white py-2.5 pl-10 pr-4 text-sm text-[#304035] placeholder:text-[#304035]/35 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-[#304035]/40" /></button>}
          </div>

          {/* Upload modal */}
          {showUpload && (
            <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#304035]">Ajouter un document</h3>
                <button onClick={() => { setShowUpload(false); setSelectedFile(null); setNewDocTitle(''); }}><X className="h-4 w-4 text-[#304035]/40" /></button>
              </div>

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
                    <p className="text-xs text-[#304035]/50">{formatSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#304035]/30 mx-auto mb-3" />
                    <p className="text-sm text-[#304035]/50 mb-1">Glissez votre fichier ici ou <span className="font-bold text-[#304035] underline">parcourez</span></p>
                    <p className="text-xs text-[#304035]/35">PDF, Word, Excel, images — Max 20 Mo</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Titre du document</label>
                  <input
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                    placeholder="Kbis 2026"
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
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowUpload(false); setSelectedFile(null); setNewDocTitle(''); }} className="px-4 py-2 text-sm text-[#304035]/60 hover:text-[#304035]">Annuler</button>
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

          {/* État chargement */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-[#304035]/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Chargement des documents…</span>
            </div>
          )}

          {/* Liste documents */}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white border border-[#304035]/8 p-12 text-center">
              <FolderOpen className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
              <p className="font-semibold text-[#304035]/50">Aucun document dans cette catégorie</p>
              <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-[#304035] font-bold underline">Ajouter le premier</button>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="rounded-2xl bg-white border border-[#304035]/8 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_120px_100px_80px_80px] gap-0 px-4 py-2.5 bg-[#304035]/5 border-b border-[#304035]/8 text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">
                <div className="w-8" />
                <div>Nom</div>
                <div>Catégorie</div>
                <div>Taille</div>
                <div>Date</div>
                <div className="text-right">Actions</div>
              </div>
              {filtered.map((doc, i) => (
                <div
                  key={doc.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_120px_100px_80px_80px] gap-0 items-center px-4 py-3 transition-colors hover:bg-[#f5eee8]/40',
                    i < filtered.length - 1 && 'border-b border-[#304035]/5'
                  )}
                >
                  <div className="w-8">{fileIcon(doc.storedFile.mimeType)}</div>
                  <div>
                    <p className="font-semibold text-sm text-[#304035] leading-snug">{doc.title}</p>
                    <p className="text-[10px] text-[#304035]/40">{doc.storedFile.originalName}</p>
                  </div>
                  <div className="text-xs text-[#304035]/50">{categoryLabel(doc.folderId)}</div>
                  <div className="text-xs text-[#304035]/50">{formatSize(doc.storedFile.sizeBytes)}</div>
                  <div className="text-xs text-[#304035]/50">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</div>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-[#304035]/30 hover:text-blue-600 transition-colors"
                      title="Télécharger"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {deleteId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 rounded-lg hover:bg-[#f5eee8] text-[#304035]/40">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#304035]/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Résumé catégories */}
          <div className="grid grid-cols-5 gap-3">
            {CATEGORY_DEFS.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => setActive(cat.id)}
                className="rounded-xl bg-white border border-[#304035]/8 p-3 text-center hover:border-[#304035]/25 transition-colors"
              >
                <cat.icon className="h-5 w-5 text-[#304035]/50 mx-auto mb-1" />
                <p className="text-xs font-bold text-[#304035]">{countFor(cat.id)}</p>
                <p className="text-[9px] text-[#304035]/40 leading-snug">{cat.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
