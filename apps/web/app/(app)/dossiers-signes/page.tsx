'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderCheck, Search, X, ChevronRight, TrendingUp, BadgeCheck,
  Calendar, LayoutGrid, List, ArrowUpRight, Package, CheckCircle2,
  Clock, AlertTriangle, Plus, Trash2, Check, BarChart3, Target,
} from 'lucide-react';
import Link from 'next/link';
import { useDossierStore, useFacturationStore, type ConfirmationFournisseur, type CommandeType } from '@/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return dateStr;
}

function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── Sous-composant : Modal dates butoires ──────────────────────────────────

type DateButoiresData = {
  [key: string]: string;
};

const DATES_BUTOIRES_ITEMS = [
  { id: 'suivi-chantier', label: 'SUIVI DE CHANTIER', showDate: true },
  { id: 'releve-mesures', label: 'RELEVE DE MESURES', showDate: true },
  { id: 'plan-technique', label: 'PLAN TECHNIQUE', showDate: true },
  { id: 'commandes', label: 'COMMANDES', showDate: false, isAccess: true },
  { id: 'livraison', label: 'LIVRAISON', showDate: false, isAccess: true },
  { id: 'fiche-pose', label: 'FICHE DE POSE', showDate: true },
  { id: 'permis-construire', label: 'PERMIS DE CONSTRUIRE', showDate: true },
  { id: 'sav', label: 'SAV', showDate: true },
];

function DateButoiresModal({ dossierId, onClose }: { dossierId: string; onClose: () => void }) {
  const [dates, setDates] = useState<DateButoiresData>({});

  const handleDateChange = (id: string, value: string) => {
    setDates(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(48, 64, 53, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Target style={{ width: '1.25rem', height: '1.25rem', color: '#304035' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#304035' }}>DATES BUTOIRES</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(48, 64, 53, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.4)')}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {DATES_BUTOIRES_ITEMS.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '1rem',
                border: '1px solid rgba(48, 64, 53, 0.1)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#304035',
                flex: 1,
              }}>
                {item.label}
              </label>
              {item.isAccess ? (
                <button
                  style={{
                    padding: '0.5rem 1rem',
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
                  ACCEDER
                </button>
              ) : item.showDate ? (
                <input
                  type="date"
                  value={dates[item.id] || ''}
                  onChange={e => handleDateChange(item.id, e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid rgba(48, 64, 53, 0.15)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#304035',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(48, 64, 53, 0.1)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid rgba(48, 64, 53, 0.15)',
              color: 'rgba(48, 64, 53, 0.6)',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.05)';
              e.currentTarget.style.color = '#304035';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(48, 64, 53, 0.6)';
            }}
          >
            Annuler
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#304035',
              color: 'white',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.9)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#304035')}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composant : Modal tableau de bord ──────────────────────────────────

function TableauDeBordModal({ dossierId, onClose }: { dossierId: string; onClose: () => void }) {
  const [completion] = useState<{ [key: string]: boolean }>({
    'suivi-chantier': Math.random() > 0.5,
    'releve-mesures': Math.random() > 0.5,
    'plan-technique': Math.random() > 0.5,
    'commandes': Math.random() > 0.5,
    'livraison': Math.random() > 0.5,
    'fiche-pose': Math.random() > 0.5,
    'permis-construire': Math.random() > 0.5,
    'sav': Math.random() > 0.5,
  });

  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalCount = Object.keys(completion).length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(48, 64, 53, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: '#304035' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#304035' }}>TABLEAU DE BORD</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(48, 64, 53, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.4)')}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#304035' }}>Progression</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#2d9d78' }}>
                {completedCount}/{totalCount}
              </span>
            </div>
            <div style={{
              height: '0.5rem',
              backgroundColor: 'rgba(48, 64, 53, 0.1)',
              borderRadius: '0.25rem',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#2d9d78',
                width: `${(completedCount / totalCount) * 100}%`,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Status Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DATES_BUTOIRES_ITEMS.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem',
                  border: '1px solid rgba(48, 64, 53, 0.1)',
                  borderRadius: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  ...(completion[item.id]
                    ? {
                        backgroundColor: '#2d9d78',
                      }
                    : {
                        backgroundColor: '#ec4444',
                      }),
                }}>
                  {completion[item.id] ? (
                    <Check style={{ width: '1rem', height: '1rem', color: 'white' }} />
                  ) : (
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                    }} />
                  )}
                </div>
                <span style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: '#304035',
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(48, 64, 53, 0.1)',
          textAlign: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#304035',
              color: 'white',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.9)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#304035')}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
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
      <div className="grid grid-cols-3 gap-2">
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
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'montant'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'commandes' | 'confirmations'>('commandes');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openModalType, setOpenModalType] = useState<'dates' | 'tableau' | null>(null);
  const [modalDossierId, setModalDossierId] = useState<string | null>(null);

  // Associer les montants des factures aux dossiers signés
  const enriched = useMemo(() => {
    return dossiersSignes.map(d => {
      const inv = invoices.filter(i => i.dossierId === d.id);
      const montantHT = inv.reduce((sum, i) => sum + (i.montantHT > 0 ? i.montantHT : 0), 0);
      return { ...d, montantHT, invoiceCount: inv.length };
    });
  }, [dossiersSignes, invoices]);

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
      

      {/* ── HEADER ── */}
      <PageHeader
        icon={<FolderCheck className="h-7 w-7" />}
        title="Dossiers signés"
        subtitle={`${dossiersSignes.length} dossier${dossiersSignes.length > 1 ? 's' : ''} validé${dossiersSignes.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center bg-white/15 rounded-xl border border-white/20 p-1 shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/25 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/25 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-4 gap-3">
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
          <div className="text-xl font-bold text-[#304035]">{dossiersSignes.length}</div>
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
      <div className="flex items-center gap-1 bg-white rounded-xl border border-[#304035]/10 p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('commandes')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all', activeTab === 'commandes' ? 'bg-[#304035] text-white shadow-sm' : 'text-[#304035]/50 hover:text-[#304035]')}
        >
          <FolderCheck className="h-4 w-4" /> Dossier Commandes
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
      <div className="flex gap-3 items-center">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((d, i) => {
                const [c1, c2] = avatarColor(d.name);
                const initials = `${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase();
                return (
                  <div key={d.id} className="signe-card group" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="relative bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${c1}, ${c2})` }} />
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#304035] text-sm truncate">{d.name} {d.firstName ?? ''}</p>
                            <p className="text-xs text-emerald-600 font-bold">SIGNÉ LE {formatDate(d.signedDate).toUpperCase()}</p>
                            <p className="text-xs text-[#304035]/45 truncate mt-0.5">{d.address || d.siteAddress || '—'}</p>
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
                        {(d.confirmations?.length ?? 0) > 0 && (
                          <div className="mb-3 flex items-center gap-1.5 text-[10px] text-[#304035]/50">
                            <Package className="h-3 w-3" />
                            <span>{d.confirmations?.filter(c => c.validee && c.type === 'STANDARD').length ?? 0} conf. validée(s)</span>
                          </div>
                        )}
                        {/* Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setModalDossierId(d.id);
                              setOpenModalType('dates');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.75rem',
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
                            DATES BUTOIRES
                          </button>
                          <button
                            onClick={() => {
                              setModalDossierId(d.id);
                              setOpenModalType('tableau');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.75rem',
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
                return (
                  <div key={d.id}>
                    <div
                      className={cn('flex items-center gap-4 px-4 py-3 hover:bg-[#f5eee8]/30 transition-colors', i < filtered.length - 1 && 'border-b border-[#304035]/5')}
                    >
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                        {`${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                        <p className="font-bold text-[#304035] text-sm">{d.name} {d.firstName ?? ''}</p>
                        <p className="text-xs text-emerald-600 font-bold">SIGNÉ LE {formatDate(d.signedDate).toUpperCase()}</p>
                        <p className="text-xs text-[#304035]/40 truncate mt-0.5">{d.address || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#304035]/40">{formatDate(d.signedDate)}</p>
                        <p className="text-sm font-black text-emerald-600">{d.montantHT > 0 ? formatMontant(d.montantHT) : '—'}</p>
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
            Pour ajouter des confirmations, ouvrez un dossier depuis l'onglet <strong>"Dossier Commandes"</strong> en vue liste.
          </div>
        </div>
      )}

      {/* Modals */}
      {openModalType === 'dates' && modalDossierId && (
        <DateButoiresModal
          dossierId={modalDossierId}
          onClose={() => {
            setOpenModalType(null);
            setModalDossierId(null);
          }}
        />
      )}
      {openModalType === 'tableau' && modalDossierId && (
        <TableauDeBordModal
          dossierId={modalDossierId}
          onClose={() => {
            setOpenModalType(null);
            setModalDossierId(null);
          }}
        />
      )}
    </div>
  );
}
