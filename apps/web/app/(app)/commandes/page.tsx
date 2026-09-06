'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, TrendingUp, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useVisibleDossiers, useVisibleDossiersSignes } from '@/store/useDossierStore';
import {
  listOrders, createOrder, deleteOrder, orderTotal,
  type OrderApi, type OrderLineInput,
} from '@/lib/orders-api';
import { clientDisplayName } from '@/lib/dossier-name';

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

type LineDraft = { description: string; quantity: string; unitPrice: string };

export default function CommandesPage() {
  const [orders, setOrders] = useState<OrderApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const dossiers = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const allDossiers = useMemo(
    () => [...dossiers, ...dossiersSignes],
    [dossiers, dossiersSignes],
  );

  const [form, setForm] = useState({ projectId: '', fournisseur: '', reference: '', notes: '' });
  const [lines, setLines] = useState<LineDraft[]>([{ description: '', quantity: '1', unitPrice: '' }]);

  async function reload() {
    setLoading(true);
    try {
      const res = await listOrders();
      setOrders(res.data ?? []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  const totalAmount = orders.reduce((s, o) => s + orderTotal(o), 0);

  const resetForm = () => {
    setForm({ projectId: '', fournisseur: '', reference: '', notes: '' });
    setLines([{ description: '', quantity: '1', unitPrice: '' }]);
    setErr(null);
  };

  const draftTotal = lines.reduce(
    (s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0),
    0,
  );

  const handleCreate = async () => {
    if (!form.projectId) { setErr('Choisissez un dossier.'); return; }
    const cleanLines: OrderLineInput[] = lines
      .filter(l => l.description.trim())
      .map(l => ({
        description: l.description.trim(),
        quantity: Math.max(0, Number(l.quantity) || 0),
        unitPrice: Math.max(0, Number(l.unitPrice) || 0),
      }));
    const ref = [form.fournisseur.trim(), form.reference.trim()].filter(Boolean).join(' · ');
    setBusy(true); setErr(null);
    try {
      await createOrder({
        projectId: form.projectId,
        reference: ref || undefined,
        notes: form.notes.trim() || undefined,
        lines: cleanLines,
      });
      setShowCreate(false);
      resetForm();
      await reload();
    } catch (e: any) {
      setErr(e?.message || 'Création impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try { await deleteOrder(id); setDeleteId(null); await reload(); }
    catch (e: any) { setErr(e?.message || 'Suppression impossible'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return <div className="text-center py-12 text-[#304035]/50">Chargement des commandes...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShoppingCart className="h-7 w-7" />}
        title="Commandes fournisseurs"
        subtitle={orders.length + ' commande(s)'}
        actions={
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-[#304035] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#304035]/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouvelle commande
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-5 w-5 text-[#a67749]" />
            <p className="text-sm font-semibold text-[#304035]/70">Total commandes</p>
          </div>
          <p className="text-2xl font-bold text-[#304035]">{fmtEUR(totalAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <p className="text-sm font-semibold text-[#304035]/70">Panier moyen</p>
          </div>
          <p className="text-2xl font-bold text-[#304035]">
            {fmtEUR(orders.length > 0 ? totalAmount / orders.length : 0)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-7 py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" />
            <p className="text-[#304035]/40 text-sm">Aucune commande</p>
          </div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {orders.map(o => {
              const total = orderTotal(o);
              const nbLignes = o._count?.lines ?? o.lines?.length ?? 0;
              return (
                <div key={o.id} className="px-6 py-4 hover:bg-[#f5eee8]/30 transition-all group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#304035] truncate">
                        {o.reference?.trim() || o.supplier?.name || `Commande ${o.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-[#304035]/50 mt-1 truncate">
                        {o.project?.name ? `Dossier ${o.project.name} • ` : ''}
                        {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                        {nbLignes > 0 ? ` • ${nbLignes} ligne(s)` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-[#304035]">{fmtEUR(total)}</span>
                      {deleteId === o.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => handleDelete(o.id)} disabled={busy}
                            className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50">Supprimer</button>
                          <button onClick={() => setDeleteId(null)}
                            className="rounded-lg border border-[#304035]/15 px-2.5 py-1 text-xs text-[#304035]/60">Annuler</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteId(o.id)}
                          title="Supprimer la commande"
                          className="rounded-lg p-1.5 bg-red-50 text-red-400 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création commande */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-[#304035]/10">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-bold text-[#304035]">Nouvelle commande fournisseur</h4>
              <button onClick={() => setShowCreate(false)} className="text-[#304035]/40 hover:text-[#304035]"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Dossier *</label>
                <select value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20">
                  <option value="">— Choisir un dossier —</option>
                  {allDossiers.map(d => (
                    <option key={d.id} value={d.id}>{clientDisplayName(d)}</option>
                  ))}
                </select>
                {allDossiers.length === 0 && (
                  <p className="mt-1 text-[11px] text-[#304035]/45">Aucun dossier disponible — créez d'abord un dossier.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Fournisseur</label>
                  <input value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))}
                    placeholder="Ex. Schmidt"
                    className="mt-1 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Référence</label>
                  <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="N° BC"
                    className="mt-1 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                </div>
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Lignes</label>
                  <button onClick={() => setLines(l => [...l, { description: '', quantity: '1', unitPrice: '' }])}
                    className="flex items-center gap-1 text-xs font-bold text-[#a67749] hover:underline">
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                </div>
                <div className="mt-1 space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={l.description} onChange={e => setLines(arr => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                        placeholder="Désignation"
                        className="flex-1 rounded-lg border border-[#304035]/15 bg-[#f5eee8]/40 px-2.5 py-2 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                      <input value={l.quantity} onChange={e => setLines(arr => arr.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                        type="number" min="0" placeholder="Qté"
                        className="w-16 rounded-lg border border-[#304035]/15 bg-[#f5eee8]/40 px-2 py-2 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                      <input value={l.unitPrice} onChange={e => setLines(arr => arr.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))}
                        type="number" min="0" step="0.01" placeholder="PU €"
                        className="w-20 rounded-lg border border-[#304035]/15 bg-[#f5eee8]/40 px-2 py-2 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                      <button onClick={() => setLines(arr => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr)}
                        className="rounded-lg p-1.5 text-[#304035]/30 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-right text-sm font-bold text-[#304035]">Total : {fmtEUR(draftTotal)}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Optionnel"
                  className="mt-1 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
              </div>

              {err && <p className="text-xs text-red-600">{err}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={busy || !form.projectId}
                className="flex-1 rounded-xl bg-[#304035] py-2.5 font-bold text-sm text-white hover:bg-[#304035]/90 disabled:opacity-40">
                {busy ? 'Création…' : 'Créer la commande'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-[#304035]/20 py-2.5 text-sm text-[#304035]">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
