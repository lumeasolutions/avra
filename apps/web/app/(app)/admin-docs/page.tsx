'use client';

import { useState, useRef } from 'react';
import {
  FolderOpen, Upload, Search, X, File, FileText, Image,
  Trash2, Download, Plus, ChevronRight, Shield, Lock,
  Briefcase, Users, Building2, Package, AlertTriangle,
  Check, FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocFile {
  id: string;
  name: string;
  category: string;
  size: string;
  date: string;
  type: 'pdf' | 'doc' | 'img' | 'other';
  tags?: string[];
}

// ─── Données initiales — vides ────────────────────────────────────────────────

const INITIAL_DOCS: DocFile[] = [];

const CATEGORIES = [
  { id: 'all',          label: 'Tous les documents',  icon: FolderOpen,  count: INITIAL_DOCS.length },
  { id: 'Juridique',    label: 'Juridique',            icon: Building2,   count: INITIAL_DOCS.filter(d => d.category === 'Juridique').length },
  { id: 'Assurances',   label: 'Assurances',           icon: Shield,      count: INITIAL_DOCS.filter(d => d.category === 'Assurances').length },
  { id: 'Fournisseurs', label: 'Fournisseurs',         icon: Package,     count: INITIAL_DOCS.filter(d => d.category === 'Fournisseurs').length },
  { id: 'RH',           label: 'Ressources Humaines',  icon: Users,       count: INITIAL_DOCS.filter(d => d.category === 'RH').length },
  { id: 'Divers',       label: 'Divers',               icon: Briefcase,   count: INITIAL_DOCS.filter(d => d.category === 'Divers').length },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(type: DocFile['type']) {
  if (type === 'pdf')   return <FileText className="h-5 w-5 text-red-500" />;
  if (type === 'doc')   return <FileText className="h-5 w-5 text-blue-500" />;
  if (type === 'img')   return <Image className="h-5 w-5 text-purple-500" />;
  return <File className="h-5 w-5 text-[#304035]/50" />;
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDocsPage() {
  const [docs, setDocs]                 = useState<DocFile[]>(INITIAL_DOCS);
  const [activeCategory, setActive]     = useState('all');
  const [search, setSearch]             = useState('');
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [showUpload, setShowUpload]     = useState(false);
  const [newDocName, setNewDocName]     = useState('');
  const [newDocCat, setNewDocCat]       = useState('Juridique');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const filtered = docs.filter(d => {
    const matchCat = activeCategory === 'all' || d.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.tags?.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const totalSize = docs.length;

  const handleFakeUpload = () => {
    if (!newDocName.trim()) return;
    const ext = newDocName.split('.').pop()?.toLowerCase() ?? '';
    const type: DocFile['type'] = ext === 'pdf' ? 'pdf' : ext === 'png' || ext === 'jpg' ? 'img' : 'other';
    setDocs(prev => [{
      id: 'd' + Date.now(),
      name: newDocName,
      category: newDocCat,
      size: '— Ko',
      date: new Date().toLocaleDateString('fr-FR'),
      type,
    }, ...prev]);
    setNewDocName('');
    setShowUpload(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2500);
  };

  const handleDelete = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <PageHeader
        icon={<Shield className="h-7 w-7" />}
        title="Dossier administratif"
        subtitle={`${totalSize} document${totalSize > 1 ? 's' : ''} • Accès restreint Admin`}
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
          Ces documents sont confidentiels et accessibles uniquement aux membres avec le rôle <span className="font-bold">ADMIN</span>. Activez les sauvegardes automatiques dans Paramètres.
        </p>
      </div>

      <div className="flex gap-5">

        {/* ── Sidebar catégories ── */}
        <div className="w-52 shrink-0 space-y-1">
          {CATEGORIES.map(cat => (
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
              )}>{cat.count}</span>
            </button>
          ))}

          {/* Ajouter une catégorie */}
          <button className="w-full flex items-center gap-2 rounded-xl border border-dashed border-[#304035]/20 px-3.5 py-2.5 text-sm text-[#304035]/40 hover:text-[#304035]/70 hover:border-[#304035]/40 transition-colors">
            <FolderPlus className="h-4 w-4" />
            Nouvelle catégorie
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
              placeholder="Rechercher par nom ou tag…"
              className="w-full rounded-xl border border-[#304035]/15 bg-white py-2.5 pl-10 pr-4 text-sm text-[#304035] placeholder:text-[#304035]/35 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-[#304035]/40" /></button>}
          </div>

          {/* Upload modal */}
          {showUpload && (
            <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#304035]">Ajouter un document</h3>
                <button onClick={() => setShowUpload(false)}><X className="h-4 w-4 text-[#304035]/40" /></button>
              </div>
              <div className="border-2 border-dashed border-[#304035]/20 rounded-xl p-8 text-center bg-[#f5eee8]/30">
                <Upload className="h-8 w-8 text-[#304035]/30 mx-auto mb-3" />
                <p className="text-sm text-[#304035]/50 mb-1">Glissez vos fichiers ici ou</p>
                <button className="text-sm font-bold text-[#304035] underline">parcourez votre ordinateur</button>
                <p className="text-xs text-[#304035]/35 mt-2">PDF, Word, PNG, JPG — Max 20 Mo</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Nom du fichier</label>
                  <input
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    placeholder="Kbis-2026.pdf"
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
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-[#304035]/60 hover:text-[#304035]">Annuler</button>
                <button
                  onClick={handleFakeUpload}
                  disabled={!newDocName.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[#304035] px-5 py-2 text-sm font-bold text-white hover:bg-[#304035]/90 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Liste documents */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#304035]/8 p-12 text-center">
              <FolderOpen className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
              <p className="font-semibold text-[#304035]/50">Aucun document dans cette catégorie</p>
              <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-[#304035] font-bold underline">Ajouter le premier</button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#304035]/8 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_120px_80px_80px] gap-0 px-4 py-2.5 bg-[#304035]/5 border-b border-[#304035]/8 text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">
                <div className="w-8" />
                <div>Nom</div>
                <div>Taille</div>
                <div>Date</div>
                <div className="text-right">Actions</div>
              </div>
              {filtered.map((doc, i) => (
                <div
                  key={doc.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_120px_80px_80px] gap-0 items-center px-4 py-3 transition-colors hover:bg-[#f5eee8]/40',
                    i < filtered.length - 1 && 'border-b border-[#304035]/5'
                  )}
                >
                  <div className="w-8">{fileIcon(doc.type)}</div>
                  <div>
                    <p className="font-semibold text-sm text-[#304035] leading-snug">{doc.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#304035]/40">{doc.category}</span>
                      {doc.tags?.map(tag => (
                        <span key={tag} className="text-[9px] font-bold bg-[#304035]/8 text-[#304035]/60 rounded-full px-1.5 py-0.5">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-[#304035]/50">{doc.size}</div>
                  <div className="text-xs text-[#304035]/50">{doc.date}</div>
                  <div className="flex items-center gap-1 justify-end">
                    <button
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
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => setActive(cat.id)}
                className="rounded-xl bg-white border border-[#304035]/8 p-3 text-center hover:border-[#304035]/25 transition-colors"
              >
                <cat.icon className="h-5 w-5 text-[#304035]/50 mx-auto mb-1" />
                <p className="text-xs font-bold text-[#304035]">{cat.count}</p>
                <p className="text-[9px] text-[#304035]/40 leading-snug">{cat.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
