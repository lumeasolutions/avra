'use client';

import { useState } from 'react';
import { CreditCard, Lock, Check, Clock, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFacturationStore, type PaymentStatus } from '@/store';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  'ENCAISSÉ': { label: 'Encaissé', color: 'bg-emerald-100 text-emerald-700' },
  'EN ATTENTE': { label: 'En attente', color: 'bg-blue-100 text-blue-700' },
  'RETARD': { label: 'En retard', color: 'bg-red-100 text-red-700' },
};

const METHODS = ['CB', 'Virement', 'Chèque', '3x sans frais', 'Espèces'];

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function EpaiementPage() {
  const payments = useFacturationStore(s => s.payments);
  const updatePaymentStatus = useFacturationStore(s => s.updatePaymentStatus);
  const addPayment = useFacturationStore(s => s.addPayment);
  const invoices = useFacturationStore(s => s.invoices);

  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'TOUS'>('TOUS');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client: '', type: 'Acompte 30%', amount: '', method: 'CB', date: new Date().toLocaleDateString('fr-FR') });

  const filtered = filterStatus === 'TOUS' ? payments : payments.filter(p => p.statut === filterStatus);

  const totalEncaisse = payments.filter(p => p.statut === 'ENCAISSÉ').reduce((s, p) => s + p.amount, 0);
  const totalAttente = payments.filter(p => p.statut === 'EN ATTENTE').reduce((s, p) => s + p.amount, 0);
  const totalRetard = payments.filter(p => p.statut === 'RETARD').reduce((s, p) => s + p.amount, 0);

  const NEXT_STATUS: Record<PaymentStatus, PaymentStatus | null> = {
    'EN ATTENTE': 'ENCAISSÉ', 'RETARD': 'ENCAISSÉ', 'ENCAISSÉ': null,
  };

  const handleAdd = () => {
    if (!form.client || !form.amount) return;
    addPayment({ client: form.client, type: form.type, amount: parseFloat(form.amount), method: form.method, date: form.date, statut: 'EN ATTENTE' });
    setForm({ client: '', type: 'Acompte 30%', amount: '', method: 'CB', date: new Date().toLocaleDateString('fr-FR') });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="h-7 w-7" />}
        title="E-Paiement"
        subtitle={payments.length + ' paiement(s)'}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nouveau paiement
          </button>
        }
      />

      {/* Bandeau sécurité */}
      <div className="flex items-center gap-3 rounded-2xl bg-purple-50 border border-purple-200 px-5 py-3">
        <Lock className="h-4 w-4 text-purple-600 shrink-0" />
        <p className="text-sm text-purple-700">Paiements sécurisés — chiffrement SSL &amp; authentification 3D Secure</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Encaissé</p>
          <p className="text-xl font-bold text-emerald-700">{fmt(totalEncaisse)}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">En attente</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalAttente)}</p>
        </div>
        <div className={cn('rounded-2xl border p-5', totalRetard > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#304035]/8')}>
          <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1', totalRetard > 0 ? 'text-red-600' : 'text-[#304035]/50')}>En retard</p>
          <p className={cn('text-xl font-bold', totalRetard > 0 ? 'text-red-700' : 'text-[#304035]')}>{fmt(totalRetard)}</p>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/10 p-6 space-y-4">
          <h2 className="font-bold text-[#304035]">Nouveau paiement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#304035]/60 mb-1 block">Client *</label>
              <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Nom du client" className="w-full rounded-xl border border-[#304035]/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#304035]/60 mb-1 block">Montant (€) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-[#304035]/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#304035]/60 mb-1 block">Type</label>
              <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Acompte 30%..." className="w-full rounded-xl border border-[#304035]/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#304035]/60 mb-1 block">Moyen de paiement</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="w-full rounded-xl border border-[#304035]/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20">
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={!form.client || !form.amount} className="rounded-xl bg-[#304035] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#304035]/80 transition-all disabled:opacity-40">Enregistrer</button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-[#304035]/15 px-6 py-2.5 text-sm font-semibold text-[#304035]/70 hover:bg-[#304035]/5 transition-all">Annuler</button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {(['TOUS', 'ENCAISSÉ', 'EN ATTENTE', 'RETARD'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('rounded-full px-4 py-1.5 text-xs font-bold transition-all', filterStatus === s ? 'bg-[#304035] text-white shadow-md' : 'bg-white border border-[#304035]/15 text-[#304035]/70 hover:border-[#304035]/30')}>
            {s === 'TOUS' ? `Tous (${payments.length})` : `${s} (${payments.filter(p => p.statut === s).length})`}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-7 py-16 text-center">
            <CreditCard className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" />
            <p className="text-[#304035]/40 text-sm">Aucun paiement</p>
          </div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {filtered.map(p => {
              const cfg = STATUS_CONFIG[p.statut];
              const next = NEXT_STATUS[p.statut];
              return (
                <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#f5eee8]/30 transition-all group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 shrink-0">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#304035]">{p.client}</p>
                        <span className={cn('inline-block px-2 py-0.5 text-[10px] font-bold rounded-full', cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-[#304035]/50 mt-0.5">{p.type} · {p.method} · {p.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <p className="font-bold text-[#304035]">{fmt(p.amount)}</p>
                    {next && (
                      <button onClick={() => updatePaymentStatus(p.id, next)} title="Marquer comme encaissé"
                        className="rounded-lg p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors opacity-0 group-hover:opacity-100">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
