'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderCheck, Search, X, ChevronRight, TrendingUp, BadgeCheck,
  Calendar, LayoutGrid, List, ArrowUpRight, Package, CheckCircle2,
  Clock, AlertTriangle, Plus, Trash2, Check, BarChart3, Target,
  ExternalLink, ShoppingCart,
  Phone, Mail, MapPin, FileText, Hourglass,
} from 'lucide-react';
import Link from 'next/link';
import { VendeurBadge } from '@/components/vendeur/VendeurBadge';
import { useDossierStore, useFacturationStore, useVisibleDossiersSignes, type ConfirmationFournisseur, type CommandeType, type CommandeAccessEntry } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardTriggerButton } from '@/components/layout/DashboardTriggerButton';
import {
  DateButoireValidationModal,
  MENUISIER_DATE_BUTOIRE_ITEMS,
  CUISINISTE_DATE_BUTOIRE_ITEMS,
  ARCHITECTE_DATE_BUTOIRE_ITEMS,
  DEFAULT_DATE_BUTOIRE_ITEMS,
  type DateButoireItem,
} from '@/components/dossiers/DateButoireValidationModal';
import { SignedDossierDashboardModal } from '@/components/dossiers/SignedDossierDashboardModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  const palettes = [
    ['#2d5a30', '#4aa350'],
    ['#7c3a1e', '#c08a5a'],
    ['#1e3a5f', '#4a7ec0'],
    ['#5a2d5a', '#c04aa3'],
    ['#3a4a1e', '#7ec04a'],
    ['#1a4a4a', '#4ac0c0'],
    ['#4a3a1e', '#c0a04a'],
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const fmt = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  // dd/mm/yyyy → construction LOCALE (sinon décalage d'un jour en fuseau négatif).
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(+y, +m - 1, +d);
    if (!isNaN(date.getTime())) return fmt(date);
  }
  // ISO yyyy-mm-dd (input date / extraction IA) → LOCAL, pas UTC (aligné avec
  // getLineStatus : la date affichée ne doit pas contredire la pastille de statut).
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(date.getTime())) return fmt(date);
  }
  // Fallback (autres formats parsables).
  const d2 = new Date(dateStr);
  if (!isNaN(d2.getTime())) return fmt(d2);
  return dateStr;
}

function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── Config dates butoires par métier ──────────────────────────────────────
//
// Refonte 05/05/2026 : on utilise désormais les MEMES listes que la modale
// Validation projet (DateButoireValidationModal) pour garantir la cohérence
// entre saisie et tableau de bord. La clé d'indexation est le `label` du
// DateButoireItem (pas un id slug) pour matcher exactement ce que la modale
// sauvegarde dans datesButoiresSignes[dossierId][label].

// (SAV_DASHBOARD_ITEM + getDateButoireItemsForProfession déplacés dans le
//  composant partagé SignedDossierDashboardModal — le tableau de bord est
//  désormais rendu par ce composant, identique dans la liste ET dans le détail.)

/**
 * Items EXACTEMENT comme la modale « Dates butoires » (DateButoireValidationModal).
 * Sert au compteur "X/Y dates butoires" des cartes pour qu'il corresponde
 * exactement à ce que la modale permet de saisir.
 *
 * 30/07/2026 : SAV fait maintenant partie des listes profession elles-mêmes
 * (kind 'date', comme les autres) — il compte donc normalement dans X/Y, ce
 * qui est correct puisqu'il est désormais saisissable dès la modale de
 * validation (plus seulement depuis le tableau de bord du dossier signé).
 */
function getModalDateItems(profession: string | null): DateButoireItem[] {
  if (profession === 'menuisier') return MENUISIER_DATE_BUTOIRE_ITEMS;
  if (profession === 'cuisiniste') return CUISINISTE_DATE_BUTOIRE_ITEMS;
  if (profession === 'architecte') return ARCHITECTE_DATE_BUTOIRE_ITEMS;
  return DEFAULT_DATE_BUTOIRE_ITEMS;
}

// ─── Sous-composant : Panneau confirmations d'un dossier ──────────────────────

function ConfirmationsPanel({ dossierId, confirmations = [] }: { dossierId: string; confirmations: ConfirmationFournisseur[] }) {
  const addConfirmation = useDossierStore(s => s.addConfirmation);
  const updateConfirmation = useDossierStore(s => s.updateConfirmation);
  const deleteConfirmation = useDossierStore(s => s.deleteConfirmation);
  const toggleConfirmationValidee = useDossierStore(s => s.toggleConfirmationValidee);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fournisseur: '', produit: '', dateButoir: '', dateConfirmation: '', type: 'STANDARD' as CommandeType, montant: '' });

  const validees = confirmations.filter(c => c.validee);
  const nonValidees = confirmations.filter(c => !c.validee);

  const handleAdd = () => {
    if (!form.fournisseur || !form.produit) return;
    addConfirmation(dossierId, {
      fournisseur: form.fournisseur,
      produit: form.produit,
      dateButoir: form.dateButoir,
      dateConfirmation: form.dateConfirmation,
      type: form.type,
      validee: false,
      montant: form.montant ? parseFloat(form.montant) : undefined,
    });
    setForm({ fournisseur: '', produit: '', dateButoir: '', dateConfirmation: '', type: 'STANDARD', montant: '' });
    setShowAdd(false);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Stats rapides */}
      <div className="sig-stats-grid grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
          <p className="text-lg font-black text-emerald-700">{validees.length}</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Validées ✓</p>
          <p className="text-[9px] text-emerald-500 mt-0.5">Alimentent les stats</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
          <p className="text-lg font-black text-amber-700">{nonValidees.length}</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">En attente</p>
          <p className="text-[9px] text-amber-500 mt-0.5">Hors stats</p>
        </div>
        <div className="rounded-xl bg-[#304035]/5 border border-[#304035]/10 p-3 text-center">
          <p className="text-lg font-black text-[#304035]">{confirmations.length}</p>
          <p className="text-[10px] font-bold text-[#304035]/60 uppercase tracking-widest">Total</p>
          <p className="text-[9px] text-[#304035]/40 mt-0.5">Confirmations</p>
        </div>
      </div>

      {/* Confirmations validées */}
      {validees.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> Confirmations validées — alimentent les statistiques
          </p>
          {validees.map(c => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-[#304035] truncate">{c.fournisseur} — {c.produit}</p>
                {c.montant && <p className="text-[10px] text-emerald-600 font-bold">{formatMontant(c.montant)}</p>}
              </div>
              <div className="text-[10px] text-[#304035]/50 shrink-0">{c.dateButoir}</div>
              <button
                onClick={() => toggleConfirmationValidee(dossierId, c.id)}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 shrink-0"
              >
                Retirer
              </button>
              <button onClick={() => deleteConfirmation(dossierId, c.id)} className="text-[#304035]/25 hover:text-red-500 shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmations en attente */}
      {nonValidees.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> En attente de validation — hors statistiques
          </p>
          {nonValidees.map(c => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-[#304035] truncate">{c.fournisseur} — {c.produit}</p>
                <div className="flex items-center gap-2">
                  {c.type === 'ELECTRO_DIRECT' && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-600 rounded px-1">Électro direct client</span>
                  )}
                  {c.montant && <span className="text-[10px] text-amber-700 font-bold">{formatMontant(c.montant)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-[#304035]/40">Butoir : {c.dateButoir || '—'}</p>
                {c.dateConfirmation && <p className="text-[10px] text-[#304035]/40">Conf. : {c.dateConfirmation}</p>}
              </div>
              <button
                onClick={() => toggleConfirmationValidee(dossierId, c.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 shrink-0"
              >
                <Check className="h-3 w-3" /> Valider
              </button>
              <button onClick={() => deleteConfirmation(dossierId, c.id)} className="text-[#304035]/25 hover:text-red-500 shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire ajout */}
      {showAdd ? (
        <div className="rounded-xl border border-[#304035]/15 bg-white p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} placeholder="Fournisseur *" className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30" />
            <input value={form.produit} onChange={e => setForm(p => ({ ...p, produit: e.target.value }))} placeholder="Produit / référence *" className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30" />
            <input value={form.dateButoir} onChange={e => setForm(p => ({ ...p, dateButoir: e.target.value }))} placeholder="Date butoir commande" className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30" />
            <input value={form.dateConfirmation} onChange={e => setForm(p => ({ ...p, dateConfirmation: e.target.value }))} placeholder="Date butoir confirmation" className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30" />
            <input type="number" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} placeholder="Montant HT (€)" className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as CommandeType }))} className="rounded-lg border border-[#304035]/15 px-3 py-1.5 text-xs text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#304035]/30">
              <option value="STANDARD">Standard</option>
              <option value="ELECTRO_DIRECT">Électro en direct client</option>
            </select>
          </div>
          {form.type === 'ELECTRO_DIRECT' && (
            <p className="text-[10px] text-blue-600 bg-blue-50 rounded-lg px-2 py-1.5">
              ℹ️ Type "Électro direct client" : la confirmation sera ajoutée mais <strong>n'alimentera PAS les statistiques</strong>, même si validée.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-[#304035]/50 hover:text-[#304035]">Annuler</button>
            <button onClick={handleAdd} disabled={!form.fournisseur || !form.produit} className="flex items-center gap-1 rounded-lg bg-[#304035] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#304035]/90 disabled:opacity-40">
              <Plus className="h-3 w-3" /> Ajouter
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#304035]/20 py-2 text-xs font-bold text-[#304035]/50 hover:text-[#304035] hover:border-[#304035]/40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une confirmation
        </button>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DossiersSignesPage() {
  const router = useRouter();
  const dossiersSignes = useVisibleDossiersSignes();
  const datesButoiresSignes = useDossierStore(s => s.datesButoiresSignes);
  const setDatesButoiresSignes = useDossierStore(s => s.setDatesButoiresSignes);
  // Sources d'échéances additionnelles pour le centre de pilotage global :
  // commandes/livraisons saisies via les panneaux ACCÉDER + état de validation
  // des dates butoires (pour ne piloter que ce qui reste à faire).
  const commandesAccess = useDossierStore(s => s.commandesAccess);
  const echeancesValidees = useDossierStore(s => s.echeancesValidees);
  const invoices = useFacturationStore(s => s.invoices);
  const profession = useAuthStore(s => s.profession);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'montant'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'commandes' | 'commande-fournisseur' | 'confirmations'>('commandes');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openModalType, setOpenModalType] = useState<'dates' | 'tableau' | null>(null);
  const [modalDossierId, setModalDossierId] = useState<string | null>(null);
  // Tableau de bord global "Dossiers signés"
  const [showDashboard, setShowDashboard] = useState(false);
  useEffect(() => {
    if (!showDashboard) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDashboard(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDashboard]);

  // Associer les montants des factures aux dossiers signés.
  // Les dossiers ARCHIVÉS (archivedAt non-null) sont exclus de cette liste
  // — ils sont visibles uniquement dans Paramètres → Dossiers archivés
  // (feature Archives du 28/05/2026).
  const enriched = useMemo(() => {
    return dossiersSignes
      .filter(d => !d.archivedAt)
      .map(d => {
        const inv = invoices.filter(i => i.dossierId === d.id);
        const montantHT = inv.reduce((sum, i) => sum + (i.montantHT > 0 ? i.montantHT : 0), 0);
        return { ...d, montantHT, invoiceCount: inv.length };
      });
  }, [dossiersSignes, invoices]);

  // Compteur d'archives (affiche en haut comme un lien discret).
  const archivedCount = useMemo(
    () => dossiersSignes.filter(d => d.archivedAt).length,
    [dossiersSignes],
  );

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.firstName?.toLowerCase() ?? '').includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'montant') return b.montantHT - a.montantHT;
      return b.signedDate.localeCompare(a.signedDate);
    });
    return list;
  }, [enriched, search, sortBy]);

  // KPIs
  const totalCA = enriched.reduce((s, d) => s + d.montantHT, 0);
  const moyenneCA = enriched.length > 0 ? totalCA / enriched.length : 0;
  const dernierSigne = enriched.length > 0
    ? [...enriched].sort((a, b) => b.signedDate.localeCompare(a.signedDate))[0]
    : null;

  // Stats confirmations
  const allConfs = dossiersSignes.flatMap(d => d.confirmations ?? []);
  const confsValidees = allConfs.filter(c => c.validee && c.type === 'STANDARD');
  const confsAttente = allConfs.filter(c => !c.validee);

  return (
    <div className="space-y-5 w-full">
      <style>{`
        @media (max-width: 768px) {
          .sig-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sig-search-bar { flex-direction: column !important; }
          .sig-search-bar > * { width: 100% !important; }
          .sig-tab-bar { flex-wrap: wrap !important; width: 100% !important; }
          .sig-modal { max-width: 100% !important; margin: 0 !important; border-radius: 16px !important; }
          .sig-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      

      {/* ── HEADER ── */}
      <PageHeader
        icon={<FolderCheck className="h-7 w-7" />}
        title="Dossiers signés"
        subtitle={`${enriched.length} dossier${enriched.length > 1 ? 's' : ''} validé${enriched.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-3">
            {/* Lien discret vers les archives - visible seulement s'il y en a.
                Pointe vers Parametres -> Dossiers archives (28/05/2026). */}
            {archivedCount > 0 && (
              <button
                onClick={() => router.push('/parametres?section=archives')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white text-xs font-semibold transition-all shadow-sm"
                title="Voir les dossiers archives (termines)"
              >
                📦 {archivedCount} archivé{archivedCount > 1 ? 's' : ''}
              </button>
            )}
            <div className="flex items-center bg-white/15 rounded-xl border border-white/20 p-1 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/25 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/25 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
            {/* Tableau de bord global Dossiers signes — round gold */}
            <DashboardTriggerButton
              open={showDashboard}
              onClick={() => setShowDashboard(v => !v)}
              controlsId="signes-dashboard-panel"
              size={56}
            />
          </div>
        }
      />

      {/* ── PANEL TABLEAU DE BORD (flottant, ouvert via le bouton dore) ── */}
      {showDashboard && (
        <SignesDashboardPanel
          enriched={enriched}
          datesButoiresSignes={datesButoiresSignes}
          commandesAccess={commandesAccess}
          echeancesValidees={echeancesValidees}
          onClose={() => setShowDashboard(false)}
          onOpenDossier={(id) => { setShowDashboard(false); setExpandedId(id); }}
        />
      )}

      {/* ── KPI STRIP ── */}
      <div className="sig-kpi-grid grid grid-cols-4 gap-3">
        <div className="bg-[#304035] rounded-2xl p-4 shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-xl bg-white/10"><TrendingUp className="h-4 w-4 text-white" /></div>
            <button onClick={() => router.push('/facturation')} className="p-1 rounded-lg hover:bg-white/10 transition-colors"><ArrowUpRight className="h-4 w-4 text-emerald-400" /></button>
          </div>
          <div className="text-xl font-bold text-white">{totalCA > 0 ? formatMontant(totalCA) : '—'}</div>
          <div className="text-xs font-semibold text-white/60 mt-0.5">CA signé</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#304035]/8 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-xl bg-emerald-50"><BadgeCheck className="h-4 w-4 text-emerald-600" /></div>
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-xl font-bold text-[#304035]">{enriched.length}</div>
          <div className="text-xs font-semibold text-[#304035]/50 mt-0.5">Dossiers signés</div>
          <div className="text-xs text-[#304035]/30 mt-0.5">Moy. {moyenneCA > 0 ? formatMontant(moyenneCA) : '—'}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-xl bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 rounded px-1.5 py-0.5">Stats</span>
          </div>
          <div className="text-xl font-bold text-emerald-700">{confsValidees.length}</div>
          <div className="text-xs font-semibold text-emerald-600/70 mt-0.5">Conf. validées</div>
          <div className="text-xs text-[#304035]/30 mt-0.5">Alimentent les stats</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-xl bg-amber-50"><Clock className="h-4 w-4 text-amber-600" /></div>
            {confsAttente.length > 0 && <span className="text-[9px] font-bold bg-amber-100 text-amber-600 rounded px-1.5 py-0.5">{confsAttente.length}</span>}
          </div>
          <div className="text-xl font-bold text-amber-700">{confsAttente.length}</div>
          <div className="text-xs font-semibold text-amber-600/70 mt-0.5">Conf. en attente</div>
          <div className="text-xs text-[#304035]/30 mt-0.5">Hors statistiques</div>
        </div>
      </div>

      {/* ── ONGLETS ── */}
      <div className="sig-tab-bar flex items-center gap-1 bg-white rounded-xl border border-[#304035]/10 p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('commandes')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'commandes' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/50 hover:text-[#304035]')}
        >
          <FolderCheck className="h-4 w-4" /> Dossier signé
        </button>
        <button
          onClick={() => setActiveTab('commande-fournisseur')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'commande-fournisseur' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/50 hover:text-[#304035]')}
        >
          <ShoppingCart className="h-4 w-4" /> Commandes fournisseurs
        </button>
        <button
          onClick={() => setActiveTab('confirmations')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'confirmations' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/50 hover:text-[#304035]')}
        >
          <Package className="h-4 w-4" /> Confirmations fournisseurs
          {confsAttente.length > 0 && <span className="bg-amber-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{confsAttente.length}</span>}
        </button>
      </div>

      {/* ── SEARCH + SORT ── */}
      <div className="sig-search-bar flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded-xl border border-[#304035]/12 bg-white pl-11 pr-10 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 shadow-sm"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-[#304035]/40" /></button>}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#304035]/10 p-1 shadow-sm">
          {[{ key: 'date', label: 'Date' }, { key: 'name', label: 'Nom' }, { key: 'montant', label: 'Montant' }].map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key as typeof sortBy)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${sortBy === opt.key ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/50 hover:text-[#304035]'}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ONGLET COMMANDES ── */}
      {activeTab === 'commandes' && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm px-8 py-16 text-center">
              <FolderCheck className="h-10 w-10 text-emerald-200 mx-auto mb-3" />
              <p className="text-[#304035]/60 text-sm font-medium">
                {search ? `Aucun résultat pour « ${search} »` : 'Aucun dossier signé pour le moment'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div
              className="grid gap-4"
              style={{
                // Grille adaptative auto-fit : chaque card a une largeur minimale
                // de 280px → si l'écran est étroit (sidebar + panel assistant
                // ouverts), on tombe naturellement à 2 voire 1 colonne au lieu
                // de garder 4 cards écrasées et illisibles.
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              }}
            >
              {filtered.map((d, i) => {
                const [c1, c2] = avatarColor(d.name);
                const initials = `${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase();
                // MÊME métrique que la modale Dates butoires (filledCount) : on
                // compte les items 'date' ayant une date NON VIDE (pas les clés
                // brutes du store, qui peuvent diverger → "5/6" alors que 100%).
                const savedDatesGrid = datesButoiresSignes[d.id] ?? {};
                const dateItemsForPro = getModalDateItems(profession).filter(it => it.kind === 'date');
                const totalDates = dateItemsForPro.length;
                const datesCount = dateItemsForPro.filter(it => !!savedDatesGrid[it.label]).length;
                return (
                  <div key={d.id} className="signe-card group" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="relative bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${c1}, ${c2})` }} />
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                              {initials}
                            </div>
                            {/* Badge signé */}
                            <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#304035] text-sm truncate">{d.name} {d.firstName ?? ''}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <BadgeCheck className="h-2.5 w-2.5" /> SIGNÉ
                              </span>
                              {d.terminated && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-green-600 ring-1 ring-emerald-600/20 rounded-full px-2 py-0.5"
                                  title={d.terminatedDate ? `Terminé le ${formatDate(d.terminatedDate)}` : 'Dossier entièrement terminé'}
                                >
                                  <Check className="h-2.5 w-2.5" /> Terminé
                                </span>
                              )}
                              <span className="text-[10px] text-[#304035]/40">{formatDate(d.signedDate)}</span>
                            </div>
                            <p className="text-xs text-[#304035]/45 truncate mt-0.5">{d.address || d.siteAddress || '—'}</p>
                            {/* Vendeur attribué — multi-vendeur 26/05/2026 */}
                            <div className="mt-1.5">
                              <VendeurBadge vendeurName={d.vendeurName} size="xs" />
                            </div>
                          </div>
                          <Link href={`/dossiers/${d.id}`}>
                            <ChevronRight className="card-arrow h-4 w-4 text-[#304035]/25 transition-transform shrink-0 hover:text-[#a67749]" />
                          </Link>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-[#304035]/50">Facturé</p>
                            <p className="text-sm font-black text-emerald-600">{d.montantHT > 0 ? formatMontant(d.montantHT) : '—'}</p>
                          </div>
                        </div>
                        {/* Indicateur confirmations */}
                        {/* Progression dates butoires */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-[#304035]/50 font-semibold">Dates butoires</span>
                            <span className="text-[10px] font-bold text-emerald-600">{datesCount}/{totalDates}</span>
                          </div>
                          <div className="h-1 bg-[#304035]/8 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${totalDates > 0 ? (datesCount / totalDates) * 100 : 0}%` }} />
                          </div>
                        </div>
                        {(d.confirmations?.length ?? 0) > 0 && (
                          <div className="mb-3 flex items-center gap-1.5 text-[10px] text-[#304035]/50">
                            <Package className="h-3 w-3" />
                            <span>{d.confirmations?.filter(c => c.validee && c.type === 'STANDARD').length ?? 0} conf. validée(s)</span>
                          </div>
                        )}
                        {/* Buttons — flex-wrap pour s'empiler quand la card
                            est trop etroite (sidebar + assistant ouverts). */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => { setModalDossierId(d.id); setOpenModalType('dates'); }}
                            style={{ flex: '1 1 120px', minWidth: 0, padding: '0.5rem 0.6rem', borderRadius: '0.75rem', backgroundColor: '#304035', color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.02em', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.9)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#304035')}
                          >
                            DATES BUTOIRES
                          </button>
                          <button
                            onClick={() => { setModalDossierId(d.id); setOpenModalType('tableau'); }}
                            style={{ flex: '1 1 120px', minWidth: 0, padding: '0.5rem 0.6rem', borderRadius: '0.75rem', backgroundColor: 'white', color: '#304035', border: '1px solid rgba(48, 64, 53, 0.2)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.02em', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.05)'; e.currentTarget.style.borderColor = 'rgba(48, 64, 53, 0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = 'rgba(48, 64, 53, 0.2)'; }}
                          >
                            TABLEAU DE BORD
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-transparent" />
              {filtered.map((d, i) => {
                const [c1, c2] = avatarColor(d.name);
                // MÊME métrique que la modale Dates butoires (items 'date' non vides).
                const savedDatesList = datesButoiresSignes[d.id] ?? {};
                const dateItemsForProList = getModalDateItems(profession).filter(it => it.kind === 'date');
                const totalDateslist = dateItemsForProList.length;
                const datesCountList = dateItemsForProList.filter(it => !!savedDatesList[it.label]).length;
                return (
                  <div key={d.id}>
                    <div
                      className={cn('flex items-center gap-4 px-4 py-3 hover:bg-[#f5eee8]/30 transition-colors', i < filtered.length - 1 && 'border-b border-[#304035]/5')}
                    >
                      <div className="relative shrink-0">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                          {`${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 border-2 border-white">
                          <Check className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#304035] text-sm">{d.name} {d.firstName ?? ''}</p>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                            <BadgeCheck className="h-2 w-2" /> SIGNÉ
                          </span>
                          {d.terminated && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-green-600 ring-1 ring-emerald-600/20 rounded-full px-1.5 py-0.5"
                              title={d.terminatedDate ? `Terminé le ${formatDate(d.terminatedDate)}` : 'Dossier entièrement terminé'}
                            >
                              <Check className="h-2 w-2" /> Terminé
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#304035]/40 truncate mt-0.5">{d.address || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#304035]/40">{formatDate(d.signedDate)}</p>
                        <p className="text-sm font-black text-emerald-600">{d.montantHT > 0 ? formatMontant(d.montantHT) : '—'}</p>
                        <span className="text-[10px] text-[#304035]/35">{datesCountList}/{totalDateslist} dates</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(d.confirmations?.length ?? 0) > 0 && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                            {d.confirmations?.filter(c => c.validee && c.type === 'STANDARD').length ?? 0}/{d.confirmations?.length} conf.
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setModalDossierId(d.id);
                            setOpenModalType('dates');
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#304035',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.9)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#304035')}
                        >
                          Dates
                        </button>
                        <button
                          onClick={() => {
                            setModalDossierId(d.id);
                            setOpenModalType('tableau');
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'white',
                            color: '#304035',
                            border: '1px solid rgba(48, 64, 53, 0.2)',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(48, 64, 53, 0.3)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = 'rgba(48, 64, 53, 0.2)';
                          }}
                        >
                          Tableau
                        </button>
                        <Link href={`/dossiers/${d.id}`} className="p-1.5 rounded-lg bg-[#304035]/5 hover:bg-[#304035]/10">
                          <ArrowUpRight className="h-3.5 w-3.5 text-[#304035]" />
                        </Link>
                      </div>
                    </div>
                    {expandedId === d.id && (
                      <div className="px-4 pb-4 border-b border-[#304035]/5 bg-[#f5eee8]/20">
                        <ConfirmationsPanel dossierId={d.id} confirmations={d.confirmations ?? []} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── CONTENU ONGLET COMMANDE FOURNISSEUR ── */}
      {activeTab === 'commande-fournisseur' && (
        <div className="space-y-4">
          {/* État d'attente — la liste par dossier est remplacée par le futur flux
              WinnerFlex : les commandes fournisseurs remonteront ici via l'API. */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <ShoppingCart className="h-7 w-7 text-amber-600" />
            </div>
            <p className="font-bold text-[#304035]">Connexion WinnerFlex à venir</p>
            <p className="text-sm text-[#304035]/55 mt-1.5 max-w-md mx-auto">
              Une fois votre clé API WinnerFlex (ou un autre logiciel) connectée, vos commandes
              fournisseurs apparaîtront ici automatiquement — celles de tous les intervenants qui
              utilisent Winner ou un outil compatible. Vous n'aurez rien à saisir manuellement.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-4 rounded-full bg-[#304035]/5 px-3 py-1.5 text-xs font-semibold text-[#304035]/60">
              Intégration en préparation
            </span>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET CONFIRMATIONS ── */}
      {activeTab === 'confirmations' && (
        <div className="space-y-4">
          {/* Légende */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
            <p className="font-bold mb-1">Logique des confirmations fournisseurs</p>
            <p className="text-xs">Seules les confirmations <strong>validées</strong> de type <strong>Standard</strong> alimentent les statistiques AVRA. Les confirmations "Électro direct client" sont enregistrées mais exclues des stats même si validées.</p>
          </div>

          {/* Vue globale par dossier */}
          {dossiersSignes.filter(d => (d.confirmations?.length ?? 0) > 0).length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#304035]/8 p-12 text-center">
              <Package className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
              <p className="font-semibold text-[#304035]/50">Aucune confirmation enregistrée</p>
              <p className="text-xs text-[#304035]/35 mt-1">Ouvrez la vue liste et cliquez sur un dossier pour ajouter des confirmations</p>
            </div>
          ) : (
            dossiersSignes.filter(d => (d.confirmations?.length ?? 0) > 0).map(d => (
              <div key={d.id} className="rounded-2xl bg-white border border-[#304035]/8 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-[#304035]/8">
                    <FolderCheck className="h-4 w-4 text-[#304035]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#304035]">{d.name} {d.firstName ?? ''}</p>
                    <p className="text-xs text-[#304035]/45">Signé le {formatDate(d.signedDate)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                      {(d.confirmations ?? []).filter(c => c.validee && c.type === 'STANDARD').length} validées
                    </span>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                      {(d.confirmations ?? []).filter(c => !c.validee).length} en attente
                    </span>
                  </div>
                </div>
                <ConfirmationsPanel dossierId={d.id} confirmations={d.confirmations ?? []} />
              </div>
            ))
          )}

          {/* Bouton ajout rapide */}
          <div className="rounded-xl border border-dashed border-[#304035]/15 p-4 text-center text-sm text-[#304035]/40">
            Pour ajouter des confirmations, ouvrez un dossier depuis l'onglet <strong>"Dossier signé"</strong> en vue liste.
          </div>
        </div>
      )}

      {/* Modals */}
      {/* DATES BUTOIRES — on réutilise la grande modale "Validation projet" en
          mode edit-signed : pré-remplie avec les dates déjà saisies, bouton
          final "Enregistrer les dates" (pas de re-signature). Cohérence UX
          avec la signature initiale d'un dossier en cours. */}
      {openModalType === 'dates' && modalDossierId && (() => {
        const sourceDossier = enriched.find(d => d.id === modalDossierId);
        return (
          <DateButoireValidationModal
            open={true}
            mode="edit-signed"
            dossierId={modalDossierId}
            clientName={sourceDossier ? `${sourceDossier.firstName ? sourceDossier.firstName + ' ' : ''}${sourceDossier.name}`.trim() : ''}
            subfolders={sourceDossier?.subfolders}
            profession={profession}
            initialDates={datesButoiresSignes[modalDossierId] ?? {}}
            onConfirm={(dates) => {
              setDatesButoiresSignes(modalDossierId, dates);
              setOpenModalType(null);
              setModalDossierId(null);
            }}
            onCancel={() => { setOpenModalType(null); setModalDossierId(null); }}
          />
        );
      })()}
      {openModalType === 'tableau' && modalDossierId && (
        <SignedDossierDashboardModal
          dossierId={modalDossierId}
          profession={profession}
          onClose={() => { setOpenModalType(null); setModalDossierId(null); }}
        />
      )}
    </div>
  );
}

// ─── SignesDashboardPanel ─────────────────────────────────────────────────

interface SignesDashboardPanelProps {
  enriched: Array<any>;
  datesButoiresSignes: Record<string, Record<string, string>>;
  commandesAccess: Record<string, Record<string, CommandeAccessEntry[]>>;
  echeancesValidees: Record<string, Record<string, boolean>>;
  onClose: () => void;
  onOpenDossier: (id: string) => void;
}

/** Parse une date FR (jj/mm/aaaa) ou ISO (aaaa-mm-jj) en Date LOCALE à minuit. */
function parseLocalDeadline(dateStr: string): Date | null {
  if (!dateStr) return null;
  const fr = dateStr.split('/');
  if (fr.length === 3) {
    const [d, m, y] = fr;
    const dt = new Date(+y, +m - 1, +d);
    if (!isNaN(dt.getTime())) { dt.setHours(0, 0, 0, 0); return dt; }
  }
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const dt = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(dt.getTime())) { dt.setHours(0, 0, 0, 0); return dt; }
  }
  const d2 = new Date(dateStr);
  if (!isNaN(d2.getTime())) { d2.setHours(0, 0, 0, 0); return d2; }
  return null;
}

/** "FICHE DE POSE" → "Fiche de pose". */
function prettyLabel(label: string): string {
  const s = label.toLowerCase().replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type PilotageKind = 'date' | 'commande' | 'livraison' | 'confirmation';
interface PilotageItem {
  dossierId: string; dossierName: string;
  kind: PilotageKind; label: string; detail?: string;
  date: Date; days: number; montant?: number;
}

function SignesDashboardPanel({
  enriched, datesButoiresSignes, commandesAccess, echeancesValidees, onClose, onOpenDossier,
}: SignesDashboardPanelProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysFrom = (d: Date) => Math.round((d.getTime() - now.getTime()) / 86400_000);

  // ── Agrégation de TOUTES les échéances non faites, tous chantiers signés ──
  const items: PilotageItem[] = [];
  for (const dossier of enriched) {
    const dName = `${dossier.name}${dossier.firstName ? ' ' + dossier.firstName : ''}`.trim();

    // 1. Dates butoires — on ignore celles déjà validées (échéance faite).
    const dates = datesButoiresSignes[dossier.id] ?? {};
    const done = echeancesValidees[dossier.id] ?? {};
    for (const [label, dateStr] of Object.entries(dates)) {
      if (!dateStr || done[label]) continue;
      const dt = parseLocalDeadline(dateStr);
      if (!dt) continue;
      items.push({ dossierId: dossier.id, dossierName: dName, kind: 'date', label: prettyLabel(label), date: dt, days: daysFrom(dt) });
    }

    // 2. Commandes / livraisons saisies via les panneaux ACCÉDER — on ignore
    //    les lignes cochées « faite ».
    const cmdMap = commandesAccess[dossier.id] ?? {};
    for (const [groupLabel, entries] of Object.entries(cmdMap)) {
      const isLiv = groupLabel.toUpperCase().includes('LIVRAISON');
      for (const e of (entries ?? [])) {
        if (e.validee || !e.dateButoir) continue;
        const dt = parseLocalDeadline(e.dateButoir);
        if (!dt) continue;
        items.push({
          dossierId: dossier.id, dossierName: dName,
          kind: isLiv ? 'livraison' : 'commande',
          label: e.fournisseur?.trim() || prettyLabel(groupLabel),
          detail: e.produit, date: dt, days: daysFrom(dt), montant: e.montant,
        });
      }
    }

    // 3. Confirmations fournisseurs non validées.
    for (const c of (dossier.confirmations ?? [])) {
      if (c.validee || !c.dateButoir) continue;
      const dt = parseLocalDeadline(c.dateButoir);
      if (!dt) continue;
      items.push({
        dossierId: dossier.id, dossierName: dName, kind: 'confirmation',
        label: c.fournisseur, detail: c.produit, date: dt, days: daysFrom(dt), montant: c.montant,
      });
    }
  }
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const retard = items.filter(i => i.days < 0);
  const aujourdhui = items.filter(i => i.days === 0);
  const semaine = items.filter(i => i.days >= 1 && i.days <= 7);
  const avenir = items.filter(i => i.days >= 8 && i.days <= 30);
  const total = items.length;

  return (
    <>
      <style>{`
        @keyframes sigDashIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .sig-dash-backdrop {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(15,23,18,0.55);
          backdrop-filter: blur(4px);
        }
        .sig-dash-panel {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          z-index: 61;
          width: min(96vw, 1080px);
          max-height: 88vh;
          overflow-y: auto;
          background: linear-gradient(135deg, #f5eee8 0%, #ffffff 100%);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
          animation: sigDashIn 0.3s cubic-bezier(0.34, 1.42, 0.64, 1);
        }
      `}</style>
      <div className="sig-dash-backdrop" onClick={onClose} aria-hidden="true" />
      <aside id="signes-dashboard-panel" className="sig-dash-panel" role="dialog" aria-label="Tableau de bord dossiers signes">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid rgba(48,64,53,0.08)',
          background: 'linear-gradient(135deg, #2a3a30 0%, #3D5449 100%)',
          borderRadius: '22px 22px 0 0',
          color: '#fff',
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: '#cbb98a', textTransform: 'uppercase' }}>
              Centre de pilotage
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0' }}>
              Échéances à suivre — {total}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
              padding: 10, borderRadius: 10, color: '#fff',
            }}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          {/* KPIs opérationnels (le business — CA/panier — reste dans le bandeau
              de la page, ici on ne pilote que les échéances). */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 22 }}>
            <DashKpi label="En retard" value={retard.length} icon={<AlertTriangle size={16} />} tone="red" />
            <DashKpi label="Aujourd'hui" value={aujourdhui.length} icon={<Clock size={16} />} tone="orange" />
            <DashKpi label="7 prochains jours" value={semaine.length} icon={<Calendar size={16} />} tone="amber" />
            <DashKpi label="À venir (30j)" value={avenir.length} icon={<CheckCircle2 size={16} />} tone="emerald" />
          </div>

          {total === 0 ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16,
              padding: '32px 24px', textAlign: 'center',
            }}>
              <CheckCircle2 size={34} style={{ color: '#15803d', margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#14532d', margin: 0 }}>Tout est à jour</p>
              <p style={{ fontSize: 13, color: '#3f6212', margin: '4px 0 0' }}>
                Aucune échéance à piloter sur tes chantiers signés — commandes, livraisons et
                dates butoires sont soit faites, soit sans date.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
              <DashSection title="En retard" count={retard.length} tone="red" empty="Aucune échéance dépassée — bravo.">
                {retard.slice(0, 12).map((it, i) => <PilotageRow key={i} item={it} tone="red" onOpen={onOpenDossier} />)}
              </DashSection>

              <DashSection title="Aujourd'hui" count={aujourdhui.length} tone="orange" empty="Rien à faire aujourd'hui.">
                {aujourdhui.slice(0, 12).map((it, i) => <PilotageRow key={i} item={it} tone="orange" onOpen={onOpenDossier} />)}
              </DashSection>

              <DashSection title="7 prochains jours" count={semaine.length} tone="amber" empty="Rien cette semaine.">
                {semaine.slice(0, 12).map((it, i) => <PilotageRow key={i} item={it} tone="amber" onOpen={onOpenDossier} />)}
              </DashSection>

              <DashSection title="À venir (30 jours)" count={avenir.length} tone="slate" empty="Rien dans le mois à venir.">
                {avenir.slice(0, 12).map((it, i) => <PilotageRow key={i} item={it} tone="slate" onOpen={onOpenDossier} />)}
              </DashSection>
            </div>
          )}

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(48,64,53,0.08)', textAlign: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 22px', background: '#3D5449', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Fermer le tableau de bord
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function DashKpi({ label, value, icon, tone }: {
  label: string; value: string | number; icon: React.ReactNode;
  tone: 'primary' | 'emerald' | 'red' | 'orange' | 'amber';
}) {
  const colors: Record<string, { bg: string; ring: string; iconBg: string; iconFg: string; text: string }> = {
    primary: { bg: '#fff', ring: '#ece7df', iconBg: '#3D5449', iconFg: '#cbb98a', text: '#1a2a1e' },
    emerald: { bg: '#f0fdf4', ring: '#bbf7d0', iconBg: '#15803d', iconFg: '#fff', text: '#14532d' },
    red:     { bg: '#fef2f2', ring: '#fecaca', iconBg: '#b91c1c', iconFg: '#fff', text: '#991b1b' },
    orange:  { bg: '#fff7ed', ring: '#fed7aa', iconBg: '#c2410c', iconFg: '#fff', text: '#7c2d12' },
    amber:   { bg: '#fffbeb', ring: '#fde68a', iconBg: '#92400e', iconFg: '#fff', text: '#78350f' },
  };
  const c = colors[tone];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.ring}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 10,
        background: c.iconBg, color: c.iconFg, marginBottom: 10,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.text, opacity: 0.7, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DashSection({ title, count, tone, empty, children }: {
  title: string; count: number; tone: 'red' | 'orange' | 'amber' | 'slate';
  empty: string; children: React.ReactNode;
}) {
  const tones: Record<string, string> = { red: '#b91c1c', orange: '#c2410c', amber: '#92400e', slate: '#475569' };
  return (
    <div style={{
      background: '#fff', border: '1px solid #ece7df', borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1a2a1e', margin: 0 }}>{title}</h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 999,
          background: tones[tone] + '15', color: tones[tone],
        }}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p style={{ fontSize: 12, color: '#7c6c58', fontStyle: 'italic', margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function dashRowStyle(tone: 'red' | 'orange' | 'amber' | 'slate'): React.CSSProperties {
  const bgs: Record<string, string> = { red: '#fef2f2', orange: '#fff7ed', amber: '#fffbeb', slate: '#f8fafc' };
  const borders: Record<string, string> = { red: '#fecaca', orange: '#fed7aa', amber: '#fde68a', slate: '#e2e8f0' };
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px',
    background: bgs[tone],
    border: `1px solid ${borders[tone]}`,
    borderRadius: 8,
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
  };
}

/** Une ligne d'échéance dans le centre de pilotage (cliquable → ouvre le dossier). */
function PilotageRow({ item, tone, onOpen }: {
  item: PilotageItem;
  tone: 'red' | 'orange' | 'amber' | 'slate';
  onOpen: (id: string) => void;
}) {
  const meta: Record<PilotageKind, { icon: React.ReactNode; tag: string }> = {
    date:         { icon: <Calendar size={13} />,     tag: 'Échéance' },
    commande:     { icon: <ShoppingCart size={13} />, tag: 'Commande' },
    livraison:    { icon: <Package size={13} />,      tag: 'Livraison' },
    confirmation: { icon: <CheckCircle2 size={13} />, tag: 'Confirmation' },
  };
  const badgeColor: Record<string, string> = { red: '#b91c1c', orange: '#c2410c', amber: '#92400e', slate: '#475569' };
  const badge = item.days < 0 ? `-${Math.abs(item.days)}j` : item.days === 0 ? 'Auj.' : `J+${item.days}`;
  const m = meta[item.kind];
  return (
    <button onClick={() => onOpen(item.dossierId)} style={dashRowStyle(tone)}>
      <span style={{ color: badgeColor[tone], display: 'inline-flex', flexShrink: 0 }}>{m.icon}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2a1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}{item.detail ? ` — ${item.detail}` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#7c6c58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.tag} · {item.dossierName}
        </div>
      </div>
      {item.montant ? (
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, flexShrink: 0 }}>{formatMontant(item.montant)}</span>
      ) : null}
      <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor[tone], flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{badge}</span>
    </button>
  );
}
