'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

const STATUS_COLORS: Record<string, string> = {
  'PENDING': 'bg-yellow-100 text-yellow-700',
  'CONFIRMED': 'bg-blue-100 text-blue-700',
  'DELIVERED': 'bg-emerald-100 text-emerald-700',
  'CANCELLED': 'bg-red-100 text-red-700',
};

export default function CommandesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<any>('/orders?page=1&pageSize=100')
      .then(res => { if (!cancelled) setOrders(res.data ?? []); })
      .catch(e => { if (!cancelled) { console.error(e); setOrders([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-[#304035]/50">Chargement des commandes...</div>;
  }

  const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShoppingCart className="h-7 w-7" />}
        title="Commandes"
        subtitle={orders.length + ' commande(s)'}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-5 w-5 text-[#a67749]" />
            <p className="text-sm font-semibold text-[#304035]/70">Total commandes</p>
          </div>
          <p className="text-2xl font-bold text-[#304035]">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalAmount)}
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <p className="text-sm font-semibold text-[#304035]/70">Panier moyen</p>
          </div>
          <p className="text-2xl font-bold text-[#304035]">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
              orders.length > 0 ? totalAmount / orders.length : 0
            )}
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
            {orders.map(o => (
              <div key={o.id} className="px-6 py-4 hover:bg-[#f5eee8]/30 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#304035] group-hover:text-[#a67749]">
                      Commande {o.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[#304035]/50 mt-1">
                      {new Date(o.createdAt).toLocaleDateString('fr-FR')} • {
                        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(o.totalAmount ?? 0)
                      }
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
