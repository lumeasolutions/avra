'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Package, Search, Plus, Trash2, AlertTriangle, X,
  ChevronUp, ChevronDown, TrendingUp, Euro, LayoutGrid,
  LayoutList, Edit3, Check, AlertCircle, CheckCircle2,
  Clock, Filter, ArrowUpDown, Tag, Boxes, Download, Image as ImageIcon,
  Upload, X as XIcon
} from 'lucide-react';
import { useStockStore, type StockItem } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmModal } from '@/components/layout/ConfirmModal';

/* ── CONSTANTES ── */
/** Liste de catégories par défaut (menuisier / hors cuisiniste / hors architecte). */
const CATEGORIES_DEFAULT = ['TOUTES', 'MEUBLES', 'ELECTRO', 'DECO', 'SANITAIRE', 'AUTRE'];

/** Liste enrichie pour le module cuisiniste — la cuisine demande une
 *  granularité métier plus fine (matériel élec, plan travail, accessoires, etc).
 *  L'ordre suit la fréquence d'usage en showroom cuisine. */
const CATEGORIES_CUISINISTE = [
  'TOUTES',
  'MEUBLES',
  'ELECTRO',
  'PETIT_ELECTRO',
  'PLAN_DE_TRAVAIL',
  'SANITAIRE',
  'MATERIEL_ELECTRIQUE',
  'ECLAIRAGE',
  'QUINCAILLERIE',
  'ACCESSOIRES',
  'CHAISES_TABOURETS',
  'DECO',
  'AUTRE',
];

/** Liste enrichie pour le module architecte d'intérieur — quasi identique
 *  à la cuisiniste mais on remplace 'MEUBLES' par 'MOBILIER' (terminologie
 *  métier : un architecte parle de "mobilier" pas de "meubles"). */
const CATEGORIES_ARCHITECTE = [
  'TOUTES',
  'MOBILIER',
  'ECLAIRAGE',
  'PLAN_DE_TRAVAIL',
  'SANITAIRE',
  'ELECTRO',
  'PETIT_ELECTRO',
  'MATERIEL_ELECTRIQUE',
  'QUINCAILLERIE',
  'ACCESSOIRES',
  'CHAISES_TABOURETS',
  'DECO',
  'AUTRE',
];

/** Liste enrichie pour le module menuisier — orientée matières premières
 *  (BOIS, PANNEAUX) puis pièces transformées (meubles) puis fournitures
 *  techniques. C'est la profession qui travaille le plus avec des stocks
 *  matériaux bruts, donc BOIS et PANNEAUX en tête de liste. */
const CATEGORIES_MENUISIER = [
  'TOUTES',
  'BOIS',
  'PANNEAUX',
  'MEUBLES',
  'QUINCAILLERIE',
  'ACCESSOIRES',
  'MATERIEL_ELECTRIQUE',
  'ELECTRO',
  'PETIT_ELECTRO',
  'SANITAIRE',
  'AUTRE',
];

/** Libellés humains pour l'affichage des chips et badges. */
const CAT_LABEL: Record<string, string> = {
  TOUTES:               'Toutes',
  MEUBLES:              'Meubles',
  MOBILIER:             'Mobilier',
  BOIS:                 'Bois',
  PANNEAUX:             'Panneaux',
  ELECTRO:              'Électro',
  PETIT_ELECTRO:        'Petit électro',
  DECO:                 'Déco',
  SANITAIRE:            'Sanitaire',
  AUTRE:                'Autre',
  QUINCAILLERIE:        'Quincaillerie',
  ACCESSOIRES:          'Accessoires',
  MATERIEL_ELECTRIQUE: 'Mat. électrique',
  PLAN_DE_TRAVAIL:      'Plan travail',
  CHAISES_TABOURETS:    'Chaises/tabourets',
  ECLAIRAGE:            'Éclairage',
};

const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  MEUBLES:              { bg: '#5b9bd5', text: '#fff',     dot: '#5b9bd5' },
  MOBILIER:             { bg: '#5b9bd5', text: '#fff',     dot: '#5b9bd5' },
  BOIS:                 { bg: '#854d0e', text: '#fff',     dot: '#854d0e' }, // brun bois
  PANNEAUX:             { bg: '#a16207', text: '#fff',     dot: '#a16207' }, // ocre pin
  ELECTRO:              { bg: '#f0c040', text: '#304035',  dot: '#f0c040' },
  PETIT_ELECTRO:        { bg: '#a855f7', text: '#fff',     dot: '#a855f7' },
  DECO:                 { bg: '#e07050', text: '#fff',     dot: '#e07050' },
  SANITAIRE:            { bg: '#2ecc71', text: '#fff',     dot: '#2ecc71' },
  AUTRE:                { bg: '#9b59b6', text: '#fff',     dot: '#9b59b6' },
  QUINCAILLERIE:        { bg: '#b45309', text: '#fff',     dot: '#b45309' },
  ACCESSOIRES:          { bg: '#7c3aed', text: '#fff',     dot: '#7c3aed' },
  MATERIEL_ELECTRIQUE:  { bg: '#dc2626', text: '#fff',     dot: '#dc2626' },
  PLAN_DE_TRAVAIL:      { bg: '#0891b2', text: '#fff',     dot: '#0891b2' },
  CHAISES_TABOURETS:    { bg: '#ea580c', text: '#fff',     dot: '#ea580c' },
  ECLAIRAGE:            { bg: '#facc15', text: '#304035',  dot: '#facc15' },
};

const DOT_CONFIG = {
  green:  { label: 'Disponible',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  text: '#059669' },
  orange: { label: 'Sur commande', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  text: '#d97706' },
  red:    { label: 'Rupture',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
};

const DOT_NEXT: Record<StockItem['dot'], StockItem['dot']> = { green: 'orange', orange: 'red', red: 'green' };

type SortKey = 'supplier' | 'category' | 'purchase' | 'sale' | 'margin' | 'alphabetic' | 'created' | 'availability';
type SortDir = 'asc' | 'desc';

/* ── HELPERS ── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function calcMargin(purchase: number, sale: number | null): number | null {
  if (!sale || sale === 0) return null;
  return Math.round(((sale - purchase) / sale) * 100);
}

function exportToCSV(items: StockItem[]) {
  const headers = ['Fournisseur', 'Modèle', 'Référence', 'Catégorie', 'Matière', 'Quantité', 'Seuil', 'Prix Achat', 'Prix Vente', 'Marge', 'Disponibilité', 'Image URL'];
  const rows = items.map(item => [
    item.supplier,
    item.model,
    item.reference || '',
    item.category,
    item.material,
    item.quantity || '',
    item.minQuantity || '',
    item.purchase,
    item.sale || '',
    calcMargin(item.purchase, item.sale) !== null ? calcMargin(item.purchase, item.sale) + '%' : '',
    item.dot === 'green' ? 'Disponible' : item.dot === 'orange' ? 'Sur commande' : 'Rupture',
    item.image || ''
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `stock-${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
}

/* ── COMPOSANT PRINCIPAL ── */
export default function StockPage() {
  const stockItems      = useStockStore(s => s.stockItems);
  const addStockItem    = useStockStore(s => s.addStockItem);
  const updateStockDot  = useStockStore(s => s.updateStockDot);
  const updateStockItem = useStockStore(s => s.updateStockItem);
  const deleteStockItem = useStockStore(s => s.deleteStockItem);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  // Profession-aware :
  // - cuisiniste → 13 cats orientées cuisine (Meubles + plan travail + ...)
  // - architecte → 13 cats orientées design (Mobilier + éclairage + ...)
  // - menuisier  → 11 cats orientées matières (BOIS + PANNEAUX + ...)
  // - autre / null → fallback compact (6 cats)
  // Toutes les professions reçoivent la photo XL — c'est le critère
  // d'identification visuel commun à tous les métiers.
  const profession    = useAuthStore(s => s.profession);
  const isCuisiniste  = profession === 'cuisiniste';
  const isArchitecte  = profession === 'architecte';
  const isMenuisier   = profession === 'menuisier';
  /** Vrai si on doit afficher la version enrichie (cat + photo XL). */
  const isEnriched    = isCuisiniste || isArchitecte || isMenuisier;
  const CATEGORIES    = isCuisiniste
    ? CATEGORIES_CUISINISTE
    : isArchitecte
      ? CATEGORIES_ARCHITECTE
      : isMenuisier
        ? CATEGORIES_MENUISIER
        : CATEGORIES_DEFAULT;
  /** Catégorie par défaut au form selon profession.
   *  Menuisier → BOIS (matière première dominante). */
  const DEFAULT_CAT   = isArchitecte ? 'MOBILIER'
    : isMenuisier ? 'BOIS'
    : 'MEUBLES';

  /* ── ÉTAT ── */
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('TOUTES');
  const [dotFilter,   setDotFilter]   = useState<'all' | StockItem['dot']>('all');
  const [view,        setView]        = useState<'list' | 'grid'>('list');
  const [sortKey,     setSortKey]     = useState<SortKey>('supplier');
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');
  const [showAdd,     setShowAdd]     = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [form, setForm] = useState({
    supplier: '', model: '', purchase: '', sale: '',
    category: DEFAULT_CAT, material: '', dot: 'green' as StockItem['dot'],
    quantity: '', minQuantity: '', reference: '', image: '',
  });
  const [editForm, setEditForm] = useState<Partial<StockItem>>({});
  // Zoom image — 2 niveaux distincts pour ne pas mélanger hover et click :
  // - hoverImage : preview en gros sur hover (auto-disparaît au mouseleave)
  // - lockedImage : modal plein écran cliqué (reste tant que l'utilisateur
  //   clique sur le X ou hors de l'image)
  const [hoverImage,  setHoverImage]  = useState<{ url: string; name: string; x: number; y: number } | null>(null);
  const [lockedImage, setLockedImage] = useState<{ url: string; name: string } | null>(null);
  // ESC pour fermer le modal verrouillé
  useEffect(() => {
    if (!lockedImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockedImage(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lockedImage]);

  /* ── SORT ── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  /* ── FILTER + SORT ── */
  const filtered = stockItems
    .filter(i => {
      const s = search.toLowerCase();
      const matchSearch = !search
        || i.supplier.toLowerCase().includes(s)
        || i.model.toLowerCase().includes(s)
        || i.category.toLowerCase().includes(s)
        || i.material.toLowerCase().includes(s);
      const matchCat = catFilter === 'TOUTES' || i.category === catFilter;
      const matchDot = dotFilter === 'all' || i.dot === dotFilter;
      return matchSearch && matchCat && matchDot;
    })
    .sort((a, b) => {
      let va: number | string = '';
      let vb: number | string = '';
      if (sortKey === 'supplier') { va = a.supplier; vb = b.supplier; }
      else if (sortKey === 'category') { va = a.category; vb = b.category; }
      else if (sortKey === 'purchase') { va = a.purchase; vb = b.purchase; }
      else if (sortKey === 'sale') { va = a.sale ?? 0; vb = b.sale ?? 0; }
      else if (sortKey === 'margin') { va = calcMargin(a.purchase, a.sale) ?? -1; vb = calcMargin(b.purchase, b.sale) ?? -1; }
      else if (sortKey === 'alphabetic') { va = a.model.toUpperCase(); vb = b.model.toUpperCase(); }
      else if (sortKey === 'created') {
        va = new Date(a.createdAt || 0).getTime();
        vb = new Date(b.createdAt || 0).getTime();
      }
      else if (sortKey === 'availability') {
        const dotOrder = { green: 0, orange: 1, red: 2 };
        va = dotOrder[a.dot];
        vb = dotOrder[b.dot];
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  /* ── KPIs ── */
  const ruptures    = stockItems.filter(i => i.dot === 'red').length;
  const surCom      = stockItems.filter(i => i.dot === 'orange').length;
  const dispos      = stockItems.filter(i => i.dot === 'green').length;
  const valAchat    = stockItems.reduce((acc, i) => acc + i.purchase, 0);
  const valVente    = stockItems.reduce((acc, i) => acc + (i.sale ?? 0), 0);
  const avgMargin   = (() => {
    const items = stockItems.filter(i => i.sale && i.sale > 0);
    if (!items.length) return 0;
    return Math.round(items.reduce((acc, i) => acc + (calcMargin(i.purchase, i.sale) ?? 0), 0) / items.length);
  })();

  const kpis = [
    { icon: <Boxes className="h-5 w-5" />,     label: 'Articles en stock',    val: String(stockItems.length),  sub: `${filtered.length} affichés`,    color: '#5b9bd5', bg: 'from-[#5b9bd5]/10 to-[#5b9bd5]/5' },
    { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Disponibles',        val: String(dispos),             sub: `${surCom} sur commande`,         color: '#10b981', bg: 'from-[#10b981]/10 to-[#10b981]/5' },
    { icon: <AlertCircle className="h-5 w-5" />,  label: 'Ruptures de stock',  val: String(ruptures),           sub: ruptures > 0 ? 'Action requise' : 'Aucune alerte', color: ruptures > 0 ? '#ef4444' : '#10b981', bg: ruptures > 0 ? 'from-[#ef4444]/10 to-[#ef4444]/5' : 'from-[#10b981]/10 to-[#10b981]/5' },
    { icon: <Euro className="h-5 w-5" />,       label: 'Valeur stock (vente)', val: fmt(valVente),              sub: `Achat ${fmt(valAchat)}`,         color: '#a67749', bg: 'from-[#a67749]/10 to-[#a67749]/5' },
    { icon: <TrendingUp className="h-5 w-5" />, label: 'Marge moyenne',        val: avgMargin + '%',            sub: `Potentiel ${fmt(valVente - valAchat)}`, color: '#9b59b6', bg: 'from-[#9b59b6]/10 to-[#9b59b6]/5' },
  ];

  /* ── ADD ── */
  const handleAdd = () => {
    if (!form.supplier || !form.model) return;
    addStockItem({
      dot: form.dot,
      supplier: form.supplier.toUpperCase(),
      model: form.model.toUpperCase(),
      purchase: parseFloat(form.purchase) || 0,
      sale: form.sale ? parseFloat(form.sale) : null,
      category: form.category,
      material: form.material.toUpperCase(),
      quantity: form.quantity ? parseInt(form.quantity) : undefined,
      minQuantity: form.minQuantity ? parseInt(form.minQuantity) : undefined,
      reference: form.reference || undefined,
      image: form.image || undefined,
      createdAt: new Date().toISOString(),
    });
    setForm({ supplier: '', model: '', purchase: '', sale: '', category: DEFAULT_CAT, material: '', dot: 'green', quantity: '', minQuantity: '', reference: '', image: '' });
    setShowAdd(false);
  };

  /* ── EDIT ── */
  const startEdit = (item: StockItem) => {
    setEditId(item.id);
    setEditForm({ ...item });
  };
  const saveEdit = () => {
    if (editId && editForm) {
      updateStockItem(editId, {
        supplier: (editForm.supplier ?? '').toUpperCase(),
        model: (editForm.model ?? '').toUpperCase(),
        material: (editForm.material ?? '').toUpperCase(),
        category: editForm.category ?? DEFAULT_CAT,
        purchase: Number(editForm.purchase) || 0,
        sale: editForm.sale !== undefined && editForm.sale !== null ? Number(editForm.sale) : null,
        dot: editForm.dot ?? 'green',
      });
    }
    setEditId(null);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1 text-[#a67749]" />
      : <ChevronDown className="h-3 w-3 inline ml-1 text-[#a67749]" />;
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media (max-width: 768px) {
          .stk-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stk-table-wrap { overflow-x: auto; }
          .stk-table-inner { min-width: 700px; }
          .stk-card-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      

      {/* ── HEADER ── */}
      <PageHeader
        icon={<Package className="h-7 w-7" />}
        title="Stock"
        subtitle={`${stockItems.length} article${stockItems.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export button */}
            <button
              onClick={() => exportToCSV(filtered)}
              className="flex items-center gap-2 rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#10b981]/85 transition-all shadow-md hover:shadow-lg active:scale-95"
              title="Exporter en CSV/Excel"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
            {/* Vue toggle */}
            <div className="flex rounded-xl border border-white/20 bg-white/15 overflow-hidden shadow-sm">
              <button
                onClick={() => setView('list')}
                className="px-3 py-2 transition-all"
                style={{ background: view === 'list' ? 'rgba(255,255,255,0.25)' : 'transparent', color: view === 'list' ? 'white' : 'rgba(255,255,255,0.6)' }}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className="px-3 py-2 transition-all"
                style={{ background: view === 'grid' ? 'rgba(255,255,255,0.25)' : 'transparent', color: view === 'grid' ? 'white' : 'rgba(255,255,255,0.6)' }}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-[#a67749] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a67749]/85 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Ajouter un article
            </button>
          </div>
        }
      />

      {/* ── KPIs ── */}
      <div className="stk-kpi-grid grid grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <div
            key={i}
            className={`card-in rounded-2xl bg-gradient-to-br ${k.bg} border border-white/60 p-4 shadow-sm hover:shadow-md transition-all`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-8 w-8 rounded-xl flex items-center justify-center mb-3 shadow-sm" style={{ background: k.color + '22', color: k.color }}>
              {k.icon}
            </div>
            <p className="text-xl font-bold text-[#304035] leading-tight">{k.val}</p>
            <p className="text-[11px] font-semibold text-[#304035]/55 mt-0.5 leading-tight">{k.label}</p>
            <p className="text-[10px] text-[#304035]/35 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ALERTE RUPTURES ── */}
      {ruptures > 0 && (
        <div className="card-in flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200/60 px-5 py-3 shadow-sm" style={{ animationDelay: '200ms' }}>
          <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">{ruptures} article{ruptures > 1 ? 's' : ''} en rupture de stock</p>
            <p className="text-xs text-red-500/70">Cliquez sur un point rouge pour changer le statut</p>
          </div>
        </div>
      )}

      {/* ── FILTRES + RECHERCHE ── */}
      <div className="card-in space-y-3" style={{ animationDelay: '120ms' }}>
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un article, fournisseur, référence…"
            className="w-full rounded-2xl border border-[#304035]/12 bg-white pl-11 pr-4 py-3 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/15 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-[#304035]/40 hover:text-[#304035]" />
            </button>
          )}
        </div>

        {/* Tri/Sort options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#304035]/40" />
            <span className="text-xs font-semibold text-[#304035]/40 uppercase tracking-wider">Trier par</span>
          </div>
          {(['alphabetic', 'created', 'availability'] as const).map(key => {
            const labels: Record<typeof key, string> = {
              alphabetic: 'Alphabétique (A-Z)',
              created: 'Dernier enregistré',
              availability: 'Disponibilité',
            };
            return (
              <button
                key={key}
                onClick={() => {
                  if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortKey(key); setSortDir('asc'); }
                }}
                className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
                style={{
                  background: sortKey === key ? '#10b981' : 'white',
                  color: sortKey === key ? 'white' : '#304035',
                  border: sortKey === key ? 'none' : '1.5px solid rgba(48,64,53,0.12)',
                }}
              >
                {labels[key]}
                {sortKey === key && (
                  sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filtres catégorie + statut */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <Filter className="h-3.5 w-3.5 text-[#304035]/40" />
            <span className="text-xs font-semibold text-[#304035]/40 uppercase tracking-wider">Catégorie</span>
          </div>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
              style={{
                background: catFilter === c ? (CAT_COLORS[c]?.bg ?? '#304035') : 'white',
                color: catFilter === c ? (CAT_COLORS[c]?.text ?? '#fff') : '#304035',
                border: catFilter === c ? 'none' : '1.5px solid rgba(48,64,53,0.12)',
              }}
            >
              {CAT_LABEL[c] ?? (c.charAt(0) + c.slice(1).toLowerCase())}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-3 mr-1">
            <span className="text-xs font-semibold text-[#304035]/40 uppercase tracking-wider">Statut</span>
          </div>
          {(['all', 'green', 'orange', 'red'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDotFilter(d)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
              style={{
                background: dotFilter === d ? (d === 'all' ? '#304035' : DOT_CONFIG[d].bg) : 'white',
                color: dotFilter === d ? (d === 'all' ? 'white' : DOT_CONFIG[d].text) : '#304035',
                border: dotFilter === d ? 'none' : '1.5px solid rgba(48,64,53,0.12)',
              }}
            >
              {d !== 'all' && (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: DOT_CONFIG[d].color }} />
              )}
              {d === 'all' ? 'Tous' : DOT_CONFIG[d].label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#304035]/40 font-medium">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── CONTENU : LISTE ou GRILLE ── */}
      {filtered.length === 0 ? (
        <div className="card-in rounded-2xl bg-white border border-[#304035]/8 shadow-sm py-20 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-[#304035]/5 flex items-center justify-center">
            <Package className="h-7 w-7 text-[#304035]/20" />
          </div>
          <p className="text-[#304035]/40 font-semibold">Aucun article trouvé</p>
          <p className="text-[#304035]/25 text-sm">Modifiez vos filtres ou ajoutez un article</p>
        </div>
      ) : view === 'list' ? (

        /* ── VUE LISTE ── */
        <div className="card-in rounded-2xl bg-white shadow-md border border-[#304035]/8 overflow-hidden" style={{ animationDelay: '80ms' }}>
          <div className="stk-table-wrap">
          <div className="stk-table-inner">
          {/* En-tête colonnes */}
          <div className="grid items-center px-5 py-3 border-b border-[#304035]/8 bg-gradient-to-r from-[#304035]/3 to-transparent"
            style={{ gridTemplateColumns: '2.5rem 3rem 1fr 1fr 1fr 4rem 5.5rem 5.5rem 5rem 2.5rem' }}>
            <span />
            <span className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider text-center">Photo</span>
            <button onClick={() => handleSort('supplier')} className="text-left text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider hover:text-[#a67749] transition-colors">
              Fournisseur <SortIcon k="supplier" />
            </button>
            <span className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider">Modèle / Réf</span>
            <button onClick={() => handleSort('category')} className="text-left text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider hover:text-[#a67749] transition-colors">
              Catégorie <SortIcon k="category" />
            </button>
            <span className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider text-center">Qté</span>
            <button onClick={() => handleSort('purchase')} className="text-right text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider hover:text-[#a67749] transition-colors">
              Achat HT <SortIcon k="purchase" />
            </button>
            <button onClick={() => handleSort('sale')} className="text-right text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider hover:text-[#a67749] transition-colors">
              Vente HT <SortIcon k="sale" />
            </button>
            <button onClick={() => handleSort('margin')} className="text-right text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider hover:text-[#a67749] transition-colors">
              Marge <SortIcon k="margin" />
            </button>
            <span />
          </div>

          {/* Lignes */}
          <div className="divide-y divide-[#304035]/5">
            {filtered.map((item, idx) => {
              const dotCfg = DOT_CONFIG[item.dot];
              const margin = calcMargin(item.purchase, item.sale);
              const isEditing = editId === item.id;
              const catColor = CAT_COLORS[item.category];

              return (
                <div
                  key={item.id}
                  className="row-in grid items-center px-5 py-3.5 hover:bg-[#f5eee8]/40 transition-all group"
                  style={{ gridTemplateColumns: '2.5rem 3rem 1fr 1fr 1fr 4rem 5.5rem 5.5rem 5rem 2.5rem', animationDelay: `${idx * 30}ms` }}
                >
                  {/* Statut dot */}
                  <button
                    onClick={() => updateStockDot(item.id, DOT_NEXT[item.dot])}
                    title={`${dotCfg.label} — cliquer pour changer`}
                    className="flex items-center group/dot"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full transition-all group-hover/dot:scale-125 shadow-sm"
                      style={{ background: dotCfg.color, boxShadow: `0 0 6px ${dotCfg.color}55` }}
                    />
                  </button>

                  {/* Image thumbnail
                      Cuisiniste/architecte/menuisier : photo agrandie (16x16 = 64px).
                      Hover -> preview en gros (auto). Click -> verrou plein ecran avec X. */}
                  <div className="flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.model}
                        className={`${isEnriched ? 'h-16 w-16' : 'h-8 w-8'} rounded-lg object-cover border border-[#304035]/8 shadow-sm cursor-zoom-in transition-transform hover:scale-[1.05]`}
                        onMouseEnter={(e) => {
                          const r = (e.currentTarget as HTMLImageElement).getBoundingClientRect();
                          setHoverImage({ url: item.image!, name: item.model, x: r.right + 12, y: r.top });
                        }}
                        onMouseLeave={() => setHoverImage(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoverImage(null);
                          setLockedImage({ url: item.image!, name: item.model });
                        }}
                      />
                    ) : (
                      <div className={`${isEnriched ? 'h-16 w-16' : 'h-8 w-8'} rounded-lg bg-[#304035]/5 flex items-center justify-center border border-[#304035]/8`}>
                        <ImageIcon className={`${isEnriched ? 'h-7 w-7' : 'h-4 w-4'} text-[#304035]/25`} />
                      </div>
                    )}
                  </div>

                  {/* Fournisseur */}
                  {isEditing ? (
                    <input
                      value={editForm.supplier ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))}
                      className="w-full rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-2.5 py-1.5 text-sm font-semibold text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30 mr-2"
                    />
                  ) : (
                    <span className="font-semibold text-[#304035] text-sm truncate">{item.supplier}</span>
                  )}

                  {/* Modèle */}
                  {isEditing ? (
                    <input
                      value={(editForm.model ?? '') + (editForm.material ? ' — ' + editForm.material : '')}
                      onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))}
                      className="w-full rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-2.5 py-1.5 text-sm text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30 mr-2"
                    />
                  ) : (
                    <span className="text-sm text-[#304035]/75 truncate">
                      {item.model}{item.material ? ` — ${item.material}` : ''}
                    </span>
                  )}

                  {/* Catégorie */}
                  {isEditing ? (
                    <select
                      value={editForm.category ?? DEFAULT_CAT}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-2 py-1.5 text-xs font-bold text-[#304035] focus:outline-none mr-2"
                    >
                      {CATEGORIES.filter(c => c !== 'TOUTES').map(c => (
                        <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: (catColor?.bg ?? '#304035') + '22', color: catColor?.bg ?? '#304035' }}
                      >
                        {CAT_LABEL[item.category] ?? item.category}
                      </span>
                    </span>
                  )}

                  {/* Quantité */}
                  <div className="text-center">
                    {isEditing ? (
                      <input
                        type="number" min="0"
                        value={editForm.quantity ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="w-12 rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-1.5 py-1.5 text-sm text-center text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30"
                      />
                    ) : (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg inline-block ${
                        item.quantity !== undefined && item.minQuantity !== undefined && item.quantity <= item.minQuantity
                          ? 'bg-red-100 text-red-600'
                          : item.quantity !== undefined
                          ? 'bg-[#304035]/6 text-[#304035]/60'
                          : 'text-[#304035]/20'
                      }`}>
                        {item.quantity !== undefined ? item.quantity : '—'}
                      </span>
                    )}
                  </div>

                  {/* Prix achat */}
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.purchase ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, purchase: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-2.5 py-1.5 text-sm text-right text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30"
                    />
                  ) : (
                    <span className="text-sm text-right text-[#304035]/60 font-medium">{fmt(item.purchase)}</span>
                  )}

                  {/* Prix vente */}
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.sale ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, sale: Number(e.target.value) || null }))}
                      className="w-full rounded-lg border border-[#304035]/20 bg-[#f5eee8]/60 px-2.5 py-1.5 text-sm text-right text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30"
                    />
                  ) : (
                    <span className="text-sm text-right font-bold text-[#304035]">
                      {item.sale !== null ? fmt(item.sale) : <span className="text-[#304035]/25 font-normal">—</span>}
                    </span>
                  )}

                  {/* Marge */}
                  <span className="text-right">
                    {margin !== null ? (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{
                          background: margin >= 40 ? 'rgba(16,185,129,0.12)' : margin >= 20 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          color: margin >= 40 ? '#059669' : margin >= 20 ? '#d97706' : '#dc2626',
                        }}
                      >
                        {margin}%
                      </span>
                    ) : (
                      <span className="text-[#304035]/20 text-xs">—</span>
                    )}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <button
                        onClick={saveEdit}
                        className="p-1.5 rounded-lg bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg bg-[#304035]/5 text-[#304035]/40 hover:bg-[#304035]/10 hover:text-[#304035] transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: item.id, name: item.model })}
                          className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer total */}
          <div className="grid px-5 py-3 border-t border-[#304035]/8 bg-gradient-to-r from-[#304035]/3 to-transparent text-xs font-bold text-[#304035]/60 uppercase tracking-wider"
            style={{ gridTemplateColumns: '2.5rem 3rem 1fr 1fr 1fr 4rem 5.5rem 5.5rem 5rem 2.5rem' }}>
            <span />
            <span />
            <span>{filtered.length} article{filtered.length > 1 ? 's' : ''}</span>
            <span />
            <span />
            <span className="text-center text-[#304035]/60">{filtered.reduce((acc, i) => acc + (i.quantity ?? 0), 0)} u.</span>
            <span className="text-right text-[#304035]/60">{fmt(filtered.reduce((acc, i) => acc + i.purchase, 0))}</span>
            <span className="text-right text-[#304035]">{fmt(filtered.reduce((acc, i) => acc + (i.sale ?? 0), 0))}</span>
            <span className="text-right text-[#a67749]">
              {(() => {
                const items = filtered.filter(i => i.sale && i.sale > 0);
                if (!items.length) return '—';
                return Math.round(items.reduce((acc, i) => acc + (calcMargin(i.purchase, i.sale) ?? 0), 0) / items.length) + '%';
              })()}
            </span>
            <span />
          </div>
          </div>
          </div>
        </div>

      ) : (

        /* ── VUE GRILLE ── */
        <div className="stk-card-grid grid grid-cols-3 gap-4">
          {filtered.map((item, idx) => {
            const dotCfg = DOT_CONFIG[item.dot];
            const margin = calcMargin(item.purchase, item.sale);
            const catColor = CAT_COLORS[item.category];
            return (
              <div
                key={item.id}
                className="card-in rounded-2xl bg-white border border-[#304035]/8 shadow-sm hover:shadow-lg transition-all group flex flex-col gap-3 overflow-hidden"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Image section — cuisiniste : zone agrandie (h-44 ~176px)
                    car la photo est l'element le plus important pour identifier
                    un meuble. Autres : reste a h-24 (~96px).
                    Hover -> preview / Click -> verrou plein ecran. */}
                <div className={`${isEnriched ? 'h-44' : 'h-24'} bg-gradient-to-br from-[#304035]/3 to-[#304035]/1 flex items-center justify-center relative overflow-hidden border-b border-[#304035]/8`}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.model}
                      className="h-full w-full object-cover cursor-zoom-in transition-transform hover:scale-[1.02]"
                      onMouseEnter={(e) => {
                        const r = (e.currentTarget as HTMLImageElement).getBoundingClientRect();
                        setHoverImage({ url: item.image!, name: item.model, x: r.right - 4, y: r.top });
                      }}
                      onMouseLeave={() => setHoverImage(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoverImage(null);
                        setLockedImage({ url: item.image!, name: item.model });
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ImageIcon className={`${isEnriched ? 'h-10 w-10' : 'h-6 w-6'} text-[#304035]/15`} />
                      <span className="text-[10px] text-[#304035]/20 font-medium">Pas d'image</span>
                    </div>
                  )}
                  {/* Top row with dot and category */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-white/80 text-[#304035]/40 hover:text-[#304035] transition-all bg-white/40 backdrop-blur-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: item.id, name: item.model })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-all bg-white/40 backdrop-blur-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <button
                      onClick={() => updateStockDot(item.id, DOT_NEXT[item.dot])}
                      title={dotCfg.label}
                      className="transition-all hover:scale-125"
                    >
                      <span
                        className="h-3 w-3 rounded-full block transition-all"
                        style={{ background: dotCfg.color, boxShadow: `0 0 8px ${dotCfg.color}88` }}
                      />
                    </button>
                  </div>
                </div>

                {/* Card content */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Title and category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-bold text-[#304035] text-base leading-tight">{item.supplier}</p>
                      <p className="text-sm text-[#304035]/60 mt-0.5">{item.model}{item.material ? ` — ${item.material}` : ''}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: (catColor?.bg ?? '#304035') + '22', color: catColor?.bg ?? '#304035' }}
                    >
                      {CAT_LABEL[item.category] ?? item.category}
                    </span>
                  </div>

                  {/* Quantité */}
                  {item.quantity !== undefined && (
                    <div className="text-xs font-semibold text-[#304035]/60">
                      <span className={`px-2 py-0.5 rounded-lg ${
                        item.minQuantity !== undefined && item.quantity <= item.minQuantity
                          ? 'bg-red-100 text-red-600'
                          : 'bg-[#304035]/6 text-[#304035]/60'
                      }`}>
                        Stock: {item.quantity} u.
                      </span>
                    </div>
                  )}

                  {/* Prix */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="text-[#304035]/40 font-semibold uppercase">Achat</p>
                      <p className="font-semibold text-[#304035]/60">{fmt(item.purchase)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#304035]/40 font-semibold uppercase">Vente</p>
                      <p className="font-bold text-[#304035]">
                        {item.sale !== null ? fmt(item.sale) : <span className="text-[#304035]/20 font-normal">—</span>}
                      </p>
                    </div>
                  </div>

                  {/* Marge */}
                  {margin !== null && (
                    <div className="mt-auto pt-2 border-t border-[#304035]/6">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg inline-block"
                        style={{
                          background: margin >= 40 ? 'rgba(16,185,129,0.12)' : margin >= 20 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          color: margin >= 40 ? '#059669' : margin >= 20 ? '#d97706' : '#dc2626',
                        }}
                      >
                        Marge {margin}%
                      </span>
                    </div>
                  )}

                  {/* Statut badge */}
                  <div
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-center"
                    style={{ background: dotCfg.bg, color: dotCfg.text }}
                  >
                    {dotCfg.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL AJOUTER ── */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10 fade-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#304035]/8 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-[#304035]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#304035]">Nouvel article</h3>
                  <p className="text-xs text-[#304035]/40">Remplissez les informations du produit</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-[#f5eee8] transition-colors">
                <X className="h-5 w-5 text-[#304035]/40" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Ligne 1 : Fournisseur + Modèle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Fournisseur *</label>
                  <input
                    autoFocus
                    value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Ex : LAPALMA"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Modèle / Réf *</label>
                  <input
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Ex : S164"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
              </div>

              {/* Ligne 2 : Matière + Catégorie */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Matière / Finition</label>
                  <input
                    value={form.material}
                    onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                    placeholder="Ex : INOX, LAITON…"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Catégorie</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.filter(c => c !== 'TOUTES').map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(f => ({ ...f, category: c }))}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                        style={{
                          background: form.category === c ? (CAT_COLORS[c]?.bg ?? '#304035') : (CAT_COLORS[c]?.bg ?? '#304035') + '15',
                          color: form.category === c ? (CAT_COLORS[c]?.text ?? '#fff') : (CAT_COLORS[c]?.bg ?? '#304035'),
                        }}
                      >
                        {CAT_LABEL[c] ?? c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ligne 3 : Prix achat + vente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Prix achat (€ HT)</label>
                  <input
                    type="number"
                    value={form.purchase}
                    onChange={e => setForm(f => ({ ...f, purchase: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Prix vente (€ HT)</label>
                  <input
                    type="number"
                    value={form.sale}
                    onChange={e => setForm(f => ({ ...f, sale: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                  {/* Preview marge */}
                  {form.purchase && form.sale && (
                    <p className="text-[10px] mt-1 font-semibold" style={{ color: '#a67749' }}>
                      Marge : {calcMargin(parseFloat(form.purchase), parseFloat(form.sale))}%
                    </p>
                  )}
                </div>
              </div>

              {/* Ligne 4 : Quantité + Seuil
                  La 'Référence fournisseur' a été supprimée — c'était un doublon
                  avec 'Modèle / Réf' (ligne 1). Une seule source de vérité. */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Qté en stock</label>
                  <input
                    type="number" min="0"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="Ex : 12"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Seuil d'alerte</label>
                  <input
                    type="number" min="0"
                    value={form.minQuantity}
                    onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))}
                    placeholder="Ex : 3"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                </div>
              </div>

              {/* Image — URL OU upload depuis l'ordinateur, avec preview live.
                  L'upload local est encodé en data URL et stocké dans le même
                  champ form.image (string) pour rester compatible avec le
                  rendu existant <img src={item.image}>. */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Image produit</label>
                <div className="flex gap-2">
                  <input
                    value={form.image.startsWith('data:') ? '' : form.image}
                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                    placeholder="Coller une URL https://… ou cliquer sur Importer →"
                    className="flex-1 rounded-xl border border-[#304035]/15 bg-[#f5eee8]/40 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                  />
                  <label
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#a67749]/40 bg-[#a67749]/8 text-xs font-bold text-[#a67749] cursor-pointer hover:bg-[#a67749]/15 transition-colors shrink-0"
                    title="Importer une image depuis votre ordinateur"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Importer
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1 * 1024 * 1024) {
                          alert("Image trop lourde (max 1 Mo). Compressez-la ou utilisez une URL.");
                          e.currentTarget.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setForm(f => ({ ...f, image: reader.result as string }));
                        };
                        reader.onerror = () => alert("Impossible de lire le fichier.");
                        reader.readAsDataURL(file);
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {form.image ? (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#304035]/8 bg-white p-2">
                    <img
                      src={form.image}
                      alt="Aperçu produit"
                      className="h-14 w-14 rounded-lg object-cover border border-[#304035]/10 bg-[#f5eee8]/40"
                      onError={(ev) => { (ev.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#304035]">
                        {form.image.startsWith('data:')
                          ? 'Fichier importé depuis votre ordinateur'
                          : 'Image distante (URL)'}
                      </p>
                      <p className="text-[10px] text-[#304035]/40 truncate">
                        {form.image.startsWith('data:')
                          ? `${(form.image.length / 1024 / 1.37).toFixed(0)} Ko ~`
                          : form.image}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image: '' }))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#304035]/40 hover:text-red-500 transition-colors"
                      title="Retirer l'image"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[9px] text-[#304035]/30 mt-1">Optionnel — affiché en miniature dans la liste des articles</p>
                )}
              </div>

              {/* Disponibilité */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Disponibilité</label>
                <div className="flex gap-2">
                  {(['green', 'orange', 'red'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, dot: d }))}
                      className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 transition-all text-xs font-bold"
                      style={{
                        borderColor: form.dot === d ? DOT_CONFIG[d].color : 'transparent',
                        background: form.dot === d ? DOT_CONFIG[d].bg : 'rgba(48,64,53,0.04)',
                        color: form.dot === d ? DOT_CONFIG[d].text : '#304035',
                      }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DOT_CONFIG[d].color }} />
                      {DOT_CONFIG[d].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!form.supplier || !form.model}
                className="flex-1 rounded-xl bg-[#304035] py-3 font-bold text-white hover:bg-[#304035]/85 transition-all disabled:opacity-40 active:scale-98"
              >
                Enregistrer l'article
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-semibold text-[#304035] hover:bg-[#f5eee8] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HOVER PREVIEW (suit la souris, auto-disparaît au mouseleave) ── */}
      {hoverImage && !lockedImage && (
        <div
          className="fixed z-[60] pointer-events-none rounded-2xl shadow-2xl border-2 border-white bg-white overflow-hidden"
          style={{
            left: Math.min(hoverImage.x, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 340),
            top: Math.min(hoverImage.y, (typeof window !== 'undefined' ? window.innerHeight : 768) - 340),
            width: 320,
            height: 320,
            animation: 'cardIn 0.12s ease both',
          }}
        >
          <img
            src={hoverImage.url}
            alt={hoverImage.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <p className="text-xs font-semibold text-white truncate">{hoverImage.name}</p>
            <p className="text-[10px] text-white/70 mt-0.5">Cliquez pour verrouiller en grand</p>
          </div>
        </div>
      )}

      {/* ── LOCKED FULLSCREEN MODAL (X pour fermer, ESC, ou click hors image) ── */}
      {lockedImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
          onClick={() => setLockedImage(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLockedImage(null); }}
            className="absolute top-5 right-5 h-11 w-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label="Fermer l'image"
            title="Fermer (Échap)"
          >
            <XIcon className="h-6 w-6" />
          </button>
          <div className="relative max-w-[92vw] max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lockedImage.url}
              alt={lockedImage.name}
              className="max-w-[92vw] max-h-[88vh] w-auto h-auto object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl px-5 py-4">
              <p className="text-sm font-bold text-white truncate">{lockedImage.name}</p>
              <p className="text-[11px] text-white/60 mt-0.5">Cliquez en dehors de l'image, sur la croix ou Échap pour fermer</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer l'article ?"
        message={confirmDelete ? `« ${confirmDelete.name} » sera supprimé définitivement.` : undefined}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => { if (confirmDelete) deleteStockItem(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
