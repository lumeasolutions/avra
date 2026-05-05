'use client';

/**
 * /e-paiement — Suivi des liens de paiement (acomptes, soldes).
 *
 * Module de paiement par lien (Stripe / GoCardless prévus). Pour l'instant
 * placeholder qui affiche l'UI cible et explique l'intégration à venir.
 * Cohérent avec la stratégie "page disponible mais inactive" pendant la
 * bêta : pas de bouton "configurer" actif, pas de risque de fuite de
 * données financières.
 */

import { CreditCard, Send, CheckCircle, Clock, XCircle, Plus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function EPaiementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="h-7 w-7" />}
        title="E Paiement"
        subtitle="Liens de paiement · Acomptes · Soldes"
      />

      {/* Bandeau "à venir" */}
      <div className="rounded-2xl bg-gradient-to-br from-[#a67749]/10 to-[#a67749]/5 border border-[#a67749]/20 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-[#a67749]/15 p-3 shrink-0">
            <Sparkles className="h-6 w-6 text-[#a67749]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#304035] mb-1">
              Bientôt disponible
            </h2>
            <p className="text-sm text-[#304035]/65 leading-relaxed">
              Envoyez à vos clients un lien de paiement sécurisé pour
              encaisser les <strong>acomptes</strong> (30 % à la signature),
              les <strong>échéances intermédiaires</strong> et les{' '}
              <strong>soldes</strong> directement depuis AVRA.
              Intégration prévue avec <strong>Stripe</strong> et{' '}
              <strong>GoCardless</strong> (SEPA).
            </p>
            <p className="text-xs text-[#304035]/45 mt-3">
              Bêta privée — feature shippée pour la GA juillet 2026.
            </p>
          </div>
        </div>
      </div>

      {/* Stats placeholder */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total demandes', val: 0, color: 'text-[#304035]' },
          { label: 'Envoyés',        val: 0, color: 'text-blue-500',    icon: Send },
          { label: 'Payés',          val: 0, color: 'text-emerald-500', icon: CheckCircle },
          { label: 'En attente',     val: 0, color: 'text-amber-500',   icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-5">
            <p className={`text-xs font-semibold ${s.color} mb-1`}>{s.label}</p>
            <p className="text-3xl font-bold text-[#304035]">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Aperçu fonctionnalités */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
        <h3 className="font-bold text-[#304035] mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#a67749]" />
          Ce que vous pourrez faire
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Plus,         title: 'Créer un lien de paiement',    desc: 'Saisir un montant + dossier → lien généré en 1 clic.' },
            { icon: Send,         title: 'Envoyer par email',            desc: 'Le client reçoit un email avec le lien Stripe sécurisé.' },
            { icon: CheckCircle,  title: 'Suivi temps réel',             desc: 'Notification instantanée à la réception du paiement.' },
            { icon: XCircle,      title: 'Relances automatiques',        desc: 'Si pas payé sous 7j, relance automatique programmée.' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-[#304035]/8 bg-[#f5eee8]/30 p-4">
              <div className="rounded-lg bg-white p-2 shrink-0 border border-[#304035]/8">
                <f.icon className="h-4 w-4 text-[#a67749]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#304035]">{f.title}</p>
                <p className="text-xs text-[#304035]/55 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder tableau */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#304035]/8 flex items-center justify-between">
          <p className="font-bold text-[#304035]">Demandes de paiement</p>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#304035] text-white text-xs font-semibold opacity-40 cursor-not-allowed"
            title="Fonctionnalité activée à la GA juillet 2026"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau lien
          </button>
        </div>
        <div className="px-6 py-16 text-center">
          <CreditCard className="h-10 w-10 text-[#304035]/15 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#304035]/45">Aucun paiement pour l'instant</p>
          <p className="text-xs text-[#304035]/35 mt-1">
            Les liens créés et leur statut apparaîtront ici.
          </p>
        </div>
      </div>
    </div>
  );
}
