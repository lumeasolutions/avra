'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FilePlus, Plus, User, Phone, MapPin, Receipt, ChevronRight, Check, AlertTriangle, Clock, CheckCircle2, Circle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDossierStore } from '@/store';

const STATUS_OPTIONS = [
  { value: 'URGENT',    label: 'Urgent',    icon: AlertTriangle,  color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { value: 'EN COURS',  label: 'En cours',  icon: Clock,          color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  { value: 'FINITION',  label: 'Finition',  icon: CheckCircle2,   color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'A VALIDER', label: 'À valider', icon: Circle,         color: '#4ade80', bg: '#f0fdf4', border: '#bbf7d0' },
];

const TVA_RATES = [
  { value: 'FR_20', label: 'France 20%', rate: 20 },
  { value: 'FR_10', label: 'France 10%', rate: 10 },
  { value: 'FR_5_5', label: 'France 5.5%', rate: 5.5 },
  { value: 'LUX_17', label: 'Luxembourg 17%', rate: 17 },
  { value: 'CH_8_1', label: 'Suisse 8.1%', rate: 8.1 },
  { value: 'BE_21', label: 'Belgique 21%', rate: 21 },
  { value: 'AUTRE', label: 'Autre', rate: null },
];

export default function NouveauDossierPage() {
  const router = useRouter();
  const addDossier = useDossierStore(s => s.addDossier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sameAddress, setSameAddress] = useState(false);
  const [showCustomTVA, setShowCustomTVA] = useState(false);
  const [customTVAValue, setCustomTVAValue] = useState('');
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    address: '',
    siteAddress: '',
    postalCode: '',
    tva: 'FR_20',
    tauxTVA: 20,
    delaiChantier: '',
    delaiChantierUnit: 'days',
    status: 'EN COURS',
    notes: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName.trim()) { setError('Le nom du client est requis'); return; }
    setError('');
    setLoading(true);
    const newId = addDossier({
      lastName: form.lastName,
      firstName: form.firstName || undefined,
      address: form.address || undefined,
      siteAddress: sameAddress ? form.address : (form.siteAddress || undefined),
      postalCode: form.postalCode || undefined,
      tva: form.tva || undefined,
      tauxTVA: form.tauxTVA || undefined,
      delaiChantier: form.delaiChantier ? parseInt(form.delaiChantier) : undefined,
      delaiChantierUnit: form.delaiChantier ? (form.delaiChantierUnit as 'days' | 'weeks') : undefined,
    });
    router.push(`/dossiers/${newId}`);
  };

  const inputCls = "w-full rounded-xl border border-[#304035]/12 bg-white px-4 py-3 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/25 focus:border-[#304035]/30 transition-all";
  const labelCls = "block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5";

  const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ') || '—';
  const selectedStatus = STATUS_OPTIONS.find(s => s.value === form.status) ?? STATUS_OPTIONS[1];
  const StatusIcon = selectedStatus.icon;

  return (
    <div className="w-full">

      {/* ── HEADER ── */}
      <PageHeader
        icon={<FilePlus className="h-7 w-7" />}
        title="Nouveau dossier"
        subtitle="Renseignez les informations du client"
        actions={
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Link href="/dossiers" className="hover:text-white transition-colors">Dossiers</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80 font-medium">Nouveau</span>
          </div>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-5">

          {/* ── COL GAUCHE + CENTRE (2/3) ── */}
          <div className="col-span-2 space-y-4">

            {/* Section : Client */}
            <div className="form-section bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ animationDelay: '0ms' }}>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#304035]/5 bg-[#304035]/2">
                <div className="p-2 bg-[#304035]/8 rounded-xl">
                  <User className="h-4 w-4 text-[#304035]" />
                </div>
                <h2 className="text-sm font-bold text-[#304035]">Informations client</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className={labelCls}>Nom <span className="text-red-400 normal-case tracking-normal">*</span></label>
                  <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Dupont" className={inputCls} autoFocus />
                </div>
                <div className="col-span-1">
                  <label className={labelCls}>Prénom</label>
                  <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="Jean" className={inputCls} />
                </div>
                <div className="col-span-1">
                  <label className={labelCls}>Téléphone</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="06 12 34 56 78" className={inputCls} />
                </div>
                <div className="col-span-1">
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="jean@exemple.fr" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Section : Adresses */}
            <div className="form-section bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#304035]/5">
                <div className="p-2 bg-[#304035]/8 rounded-xl">
                  <MapPin className="h-4 w-4 text-[#304035]" />
                </div>
                <h2 className="text-sm font-bold text-[#304035]">Adresses</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Adresse du client</label>
                    <input type="text" value={form.address} onChange={set('address')} placeholder="12 rue de la Paix" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Code postal</label>
                    <input type="text" value={form.postalCode} onChange={set('postalCode')} placeholder="75011" className={inputCls} />
                  </div>
                </div>

                {/* Toggle même adresse */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSameAddress(v => !v)}
                    className={`w-10 h-5 rounded-full transition-all relative ${sameAddress ? 'bg-[#304035]' : 'bg-[#304035]/15'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${sameAddress ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-xs text-[#304035]/60 font-medium">Adresse chantier = adresse client</span>
                </div>

                {!sameAddress && (
                  <div>
                    <label className={labelCls}>Adresse du chantier</label>
                    <input type="text" value={form.siteAddress} onChange={set('siteAddress')} placeholder="Si différente de l'adresse client" className={inputCls} />
                  </div>
                )}
              </div>
            </div>

            {/* Section : Facturation */}
            <div className="form-section bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#304035]/5">
                <div className="p-2 bg-[#304035]/8 rounded-xl">
                  <Receipt className="h-4 w-4 text-[#304035]" />
                </div>
                <h2 className="text-sm font-bold text-[#304035]">Facturation & Chantier</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Taux de TVA */}
                <div>
                  <label className={labelCls}>Taux de TVA</label>
                  <select
                    value={form.tva}
                    onChange={(e) => {
                      const selected = TVA_RATES.find(t => t.value === e.target.value);
                      setForm(f => ({
                        ...f,
                        tva: e.target.value,
                        tauxTVA: selected?.rate || 0,
                      }));
                      setShowCustomTVA(e.target.value === 'AUTRE');
                    }}
                    className={inputCls}
                  >
                    {TVA_RATES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom TVA Input */}
                {showCustomTVA && (
                  <div>
                    <label className={labelCls}>Taux personnalisé (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={customTVAValue}
                      onChange={(e) => {
                        setCustomTVAValue(e.target.value);
                        const val = parseFloat(e.target.value) || 0;
                        setForm(f => ({ ...f, tauxTVA: val }));
                      }}
                      placeholder="20"
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Délais chantier */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className={labelCls}>Délai chantier</label>
                    <input
                      type="number"
                      min="0"
                      value={form.delaiChantier}
                      onChange={(e) => setForm(f => ({ ...f, delaiChantier: e.target.value }))}
                      placeholder="10"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className={labelCls}>Unité</label>
                    <select
                      value={form.delaiChantierUnit}
                      onChange={(e) => setForm(f => ({ ...f, delaiChantierUnit: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="days">Jours</option>
                      <option value="weeks">Semaines</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── COL DROITE (1/3) ── */}
          <div className="col-span-1 space-y-4">

            {/* Statut */}
            <div className="form-section bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ animationDelay: '40ms' }}>
              <div className="px-5 py-4 border-b border-[#304035]/5">
                <h2 className="text-sm font-bold text-[#304035]">Statut du dossier</h2>
              </div>
              <div className="p-4 space-y-2">
                {STATUS_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = form.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className="status-opt w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left"
                      style={{
                        background: isSelected ? opt.bg : 'white',
                        borderColor: isSelected ? opt.border : 'rgba(48,64,53,0.08)',
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: opt.color }} />
                      <span className="text-sm font-semibold text-[#304035]">{opt.label}</span>
                      {isSelected && (
                        <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: opt.color }}>
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="form-section bg-[#304035] rounded-2xl overflow-hidden shadow-lg" style={{ animationDelay: '80ms' }}>
              <div className="px-5 py-4 border-b border-white/10">
                <h2 className="text-sm font-bold text-white/80">Récapitulatif</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-white/40 text-xs mb-0.5">Client</p>
                  <p className="text-white font-bold text-base">{fullName}</p>
                </div>
                {form.phone && (
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Téléphone</p>
                    <p className="text-white/80 text-sm">{form.phone}</p>
                  </div>
                )}
                {form.address && (
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Adresse</p>
                    <p className="text-white/80 text-sm">{form.address}{form.postalCode ? `, ${form.postalCode}` : ''}</p>
                  </div>
                )}
                <div className="pt-1 border-t border-white/10">
                  <p className="text-white/40 text-xs mb-1.5">Statut</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: selectedStatus.bg }}>
                    <StatusIcon className="h-3.5 w-3.5" style={{ color: selectedStatus.color }} />
                    <span className="text-xs font-bold" style={{ color: selectedStatus.color }}>{selectedStatus.label}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/10">
                  <p className="text-white/40 text-xs mb-0.5">Taux TVA</p>
                  <p className="text-white/80 text-sm font-bold">{form.tauxTVA}%</p>
                </div>
                {form.delaiChantier && (
                  <div className="pt-1 border-t border-white/10">
                    <p className="text-white/40 text-xs mb-0.5">Délai chantier</p>
                    <p className="text-white/80 text-sm font-bold">{form.delaiChantier} {form.delaiChantierUnit === 'weeks' ? 'semaine(s)' : 'jour(s)'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="form-section space-y-2" style={{ animationDelay: '120ms' }}>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#a67749] px-6 py-3.5 font-bold text-white hover:bg-[#c08a5a] disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="h-4 w-4" />
                {loading ? 'Création en cours…' : 'Créer le dossier'}
              </button>
              <Link
                href="/dossiers"
                className="w-full flex items-center justify-center rounded-xl border border-[#304035]/15 px-6 py-3 text-sm font-semibold text-[#304035]/60 hover:bg-[#304035]/5 transition-all"
              >
                Annuler
              </Link>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
