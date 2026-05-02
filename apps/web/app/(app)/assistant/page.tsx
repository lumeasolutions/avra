'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, Lightbulb, RefreshCw, TrendingUp, FolderOpen, AlertCircle, Users, CheckSquare, Pen, FileText, Package } from 'lucide-react';
import { useDossierStore, useFacturationStore, useHistoryStore, useIntervenantStore, useStockStore, useUIStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  time: string;
}

const timeStr = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function AssistantPage() {
  const dossiers       = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices       = useFacturationStore(s => s.invoices);
  const payments       = useFacturationStore(s => s.payments);
  const alerts         = useUIStore(s => s.alerts);
  const intervenants   = useIntervenantStore(s => s.intervenants);
  const stockItems     = useStockStore(s => s.stockItems);
  const historyLogs    = useHistoryStore(s => s.historyLogs);
  const devis          = useFacturationStore(s => s.devis);
  const apporteurs     = useFacturationStore(s => s.apporteurs) ?? [];

  // Données en temps réel
  const urgents = dossiers.filter(d => d.status === 'URGENT');
  const retardInvoices = invoices.filter(i => i.statut === 'RETARD');
  const retardPayments = payments.filter(p => p.statut === 'RETARD');
  const pendingAlerts  = alerts.filter(a => !a.dismissed);
  const stockRupture   = stockItems.filter(s => s.dot === 'red');
  const totalCA        = invoices.filter(i => i.montantHT > 0 && i.statut === 'PAYÉE').reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);

  const getResponse = (msg: string): string => {
    const q = msg.toLowerCase();

    // Urgents / prioritaires
    if (q.includes('urgent') || q.includes('priorité') || q.includes('prioritaire')) {
      if (urgents.length === 0) return '✅ Bonne nouvelle ! Aucun dossier n\'est actuellement marqué URGENT. Tous vos dossiers avancent normalement.';
      return `🚨 Vous avez **${urgents.length} dossier(s) URGENT(s)** :\n${urgents.map(d => `• **${d.name}** — créé le ${d.createdAt}`).join('\n')}\n\nJe vous recommande de traiter ces dossiers en priorité absolue.`;
    }

    // Retards / impayés
    if (q.includes('retard') || q.includes('impayé') || q.includes('relance') || q.includes('paiement')) {
      const lines = [];
      if (retardInvoices.length > 0) {
        lines.push(`📋 **${retardInvoices.length} facture(s) en retard :**`);
        retardInvoices.forEach(i => lines.push(`  • ${i.client} — ${fmt(i.montantHT * (1 + i.tva / 100))}`));
      }
      if (retardPayments.length > 0) {
        lines.push(`💳 **${retardPayments.length} paiement(s) en retard :**`);
        retardPayments.forEach(p => lines.push(`  • ${p.client} — ${fmt(p.amount)}`));
      }
      if (lines.length === 0) return '✅ Aucun retard de paiement en ce moment. Tous vos règlements sont à jour !';
      lines.push('\nVoulez-vous que je prépare des lettres de relance pour ces clients ?');
      return lines.join('\n');
    }

    // Dossiers
    if (q.includes('dossier') && !q.includes('signé') && !q.includes('signe')) {
      const enCours = dossiers.filter(d => d.status === 'EN COURS').length;
      const finition = dossiers.filter(d => d.status === 'FINITION').length;
      return `📁 Voici un résumé de vos **${dossiers.length} dossiers en cours** :\n• 🔴 ${urgents.length} URGENT(s)\n• 🟠 ${enCours} EN COURS\n• 🟢 ${finition} EN FINITION\n\nDossiers les plus récents : ${dossiers.slice(0, 3).map(d => d.name).join(', ')}.\n\nVoulez-vous plus de détails sur un dossier spécifique ?`;
    }

    // Signés
    if (q.includes('signé') || q.includes('signe') || q.includes('signature')) {
      return `✅ Vous avez **${dossiersSignes.length} dossier(s) signé(s)** :\n${dossiersSignes.map(d => `• **${d.name}** — signé le ${d.signedDate}`).join('\n')}\n\nCes dossiers sont en cours de réalisation.`;
    }

    // Facturation / CA
    if (q.includes('facture') || q.includes('facturation') || q.includes('ca') || q.includes("chiffre d'affaires") || q.includes('revenu')) {
      const attenteCA = invoices.filter(i => i.statut === 'EN ATTENTE' || i.statut === 'ACOMPTE').reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);
      return `💶 **Tableau de bord financier :**\n• CA encaissé (TTC) : **${fmt(totalCA)}**\n• En attente : **${fmt(attenteCA)}**\n• En retard : **${fmt(retardInvoices.reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0))}**\n\nNombre de factures : ${invoices.length} au total (${retardInvoices.length} en retard)`;
    }

    // Alertes
    if (q.includes('alerte') || q.includes('notification') || q.includes('attention')) {
      if (pendingAlerts.length === 0) return '✅ Aucune alerte active en ce moment. Tout est sous contrôle !';
      return `🔔 Vous avez **${pendingAlerts.length} alerte(s) active(s)** :\n${pendingAlerts.slice(0, 4).map(a => `• ${a.text}`).join('\n')}`;
    }

    // Stock
    if (q.includes('stock') || q.includes('rupture') || q.includes('article')) {
      if (stockRupture.length === 0) return `📦 Votre stock est en bonne santé. ${stockItems.length} articles enregistrés, aucune rupture détectée.`;
      return `⚠️ **${stockRupture.length} article(s) en rupture de stock :**\n${stockRupture.map(s => `• ${s.supplier} — ${s.model}`).join('\n')}\n\nJe vous recommande de passer commande rapidement pour éviter tout retard de livraison.`;
    }

    // Intervenants
    if (q.includes('intervenant') || q.includes('poseur') || q.includes('équipe') || q.includes('artisan')) {
      return `👷 Vous avez **${intervenants.length} intervenant(s)** enregistré(s) :\n${intervenants.slice(0, 4).map(i => `• **${i.name}** (${i.type}) — ${i.dossiers.length} dossier(s)`).join('\n')}`;
    }

    // Planning
    if (q.includes('planning') || q.includes('rendez-vous') || q.includes('rdv') || q.includes('semaine')) {
      return '📅 Votre planning de la semaine est disponible dans la section **Planning**. Je peux vous aider à ajouter de nouveaux rendez-vous ou à consulter vos interventions prévues. Que souhaitez-vous planifier ?';
    }

    // Activité récente
    if (q.includes('récent') || q.includes('activité') || q.includes('historique') || q.includes('dernière')) {
      if (historyLogs.length === 0) return 'Aucune activité récente enregistrée.';
      return `📊 **Dernières activités :**\n${historyLogs.slice(0, 5).map(l => `${l.icon} **${l.user}** — ${l.action} (${l.target}) · ${l.time}`).join('\n')}`;
    }

    // Devis
    if (q.includes('devis') && !q.includes('signature') && !q.includes('signé')) {
      const enAttente = devis.filter(d => d.statut === 'ENVOYÉ').length;
      const acceptes = devis.filter(d => d.statut === 'ACCEPTÉ').length;
      const brouillons = devis.filter(d => d.statut === 'BROUILLON').length;
      const totalTTC = devis.filter(d => d.statut === 'ENVOYÉ').reduce((s, d) => s + d.totalTTC, 0);
      const tauxTransfo = devis.length > 0 ? Math.round(devis.filter(d => d.statut === 'ACCEPTÉ').length / devis.length * 100) : 0;
      return `📋 **Résumé de vos devis :**\n• ${brouillons} en brouillon\n• ${enAttente} envoyé(s) — **${fmt(totalTTC)}** en attente de réponse\n• ${acceptes} accepté(s)\n• Taux de transformation : **${tauxTransfo}%**\n\nConsultez la section Facturation pour gérer vos devis ou envoyer pour signature électronique.`;
    }

    // Signature électronique
    if (q.includes('signature') || q.includes('signer') || q.includes('signé electronique')) {
      const enAttenteSign = devis.filter(d => d.signatureStatus === 'EN_ATTENTE_SIGNATURE');
      const signes = devis.filter(d => d.signatureStatus === 'SIGNÉ');
      if (enAttenteSign.length === 0 && signes.length === 0) return '✍️ Aucun devis en cours de signature électronique. Vous pouvez envoyer n\'importe quel devis pour signature depuis la section Facturation > Devis (bouton "Signature").';
      const lines = ['✍️ **Signatures électroniques :**'];
      if (enAttenteSign.length > 0) {
        lines.push(`\n⏳ **En attente de signature (${enAttenteSign.length}) :**`);
        enAttenteSign.forEach(d => lines.push(`  • ${d.ref} — ${d.client} (envoyé à ${d.signatureEmail})`));
      }
      if (signes.length > 0) {
        lines.push(`\n✅ **Signés (${signes.length}) :**`);
        signes.forEach(d => lines.push(`  • ${d.ref} — ${d.client} (signé le ${d.signatureDate})`));
      }
      return lines.join('\n');
    }

    // Actions à faire / todo
    if (q.includes('action') || q.includes('à faire') || q.includes('todo') || q.includes('tâche') || q.includes('que faire')) {
      const lines = ['📋 **Vos actions prioritaires en ce moment :**'];
      if (urgents.length > 0) lines.push(`• 🔴 ${urgents.length} dossier(s) URGENT(s)`);
      if (retardInvoices.length > 0) lines.push(`• 💸 ${retardInvoices.length} facture(s) en retard`);
      const devisSignature = devis.filter(d => d.signatureStatus === 'EN_ATTENTE_SIGNATURE');
      if (devisSignature.length > 0) lines.push(`• ✍️ ${devisSignature.length} devis en attente de signature`);
      const confirmsPending = dossiersSignes.reduce((s, d) => s + (d.confirmations ?? []).filter(c => !c.validee).length, 0);
      if (confirmsPending > 0) lines.push(`• 📦 ${confirmsPending} confirmation(s) fournisseur en attente`);
      const stockRuptureCount = stockItems.filter(s => s.dot === 'red').length;
      if (stockRuptureCount > 0) lines.push(`• ⚠️ ${stockRuptureCount} article(s) en rupture de stock`);
      if (lines.length === 1) return '✅ Aucune action urgente en ce moment ! Tout est sous contrôle.';
      lines.push('\nLe tableau de bord affiche aussi la liste détaillée de toutes vos actions à faire.');
      return lines.join('\n');
    }

    // Commissions / apporteurs
    if (q.includes('commission') || q.includes('apporteur') || q.includes('parrain') || q.includes('réseau')) {
      if (apporteurs.length === 0) return '🤝 Aucun apporteur d\'affaires enregistré. Ajoutez vos apporteurs dans Paramètres > Apporteurs & Commissions pour calculer les commissions automatiquement.';
      const actifs = apporteurs.filter(a => a.actif);
      const totalCA = dossiersSignes.reduce((s, d) => s + (d.montant ?? 0), 0);
      const commTotal = actifs.reduce((s, a) => s + totalCA * a.tauxCommission / 100, 0);
      return `🤝 **Apporteurs d'affaires :**\n• ${actifs.length} actif(s) sur ${apporteurs.length} au total\n• Taux moyen : ${actifs.length > 0 ? (actifs.reduce((s,a) => s+a.tauxCommission, 0)/actifs.length).toFixed(1) : 0}%\n• Commission estimée totale : **${fmt(commTotal / actifs.length || 0)}**\n\nDétail dans Paramètres > Apporteurs & Commissions.`;
    }

    // Rédiger une relance email
    if (q.includes('relance') || q.includes('email') || q.includes('mail') || q.includes('rédige') || q.includes('lettre')) {
      if (retardInvoices.length === 0) return '✅ Aucune facture en retard, pas besoin de lettre de relance pour le moment !';
      const inv = retardInvoices[0];
      return `📧 **Voici un modèle de relance pour ${inv.client} :**\n\n---\nObjet : Rappel de paiement — Facture ${inv.ref}\n\nBonjour,\n\nNous vous rappelons que la facture ${inv.ref} d'un montant de **${fmt(inv.montantHT * (1 + inv.tva / 100))} TTC** est actuellement en attente de règlement.\n\nNous vous serions reconnaissants de bien vouloir procéder au paiement dans les meilleurs délais.\n\nCordialement,\nL'équipe AVRA\n---\n\nVoulez-vous que je génère un modèle pour une autre facture ?`;
    }

    // Confirmations fournisseurs
    if (q.includes('confirmation') || q.includes('fournisseur') || q.includes('commande')) {
      const pending = dossiersSignes.reduce((s, d) => s + (d.confirmations ?? []).filter(c => !c.validee).length, 0);
      const validated = dossiersSignes.reduce((s, d) => s + (d.confirmations ?? []).filter(c => c.validee).length, 0);
      return `📦 **Confirmations fournisseurs :**\n• ${validated} validée(s)\n• ${pending} en attente\n\nGérez vos confirmations dans la section Dossiers Signés.`;
    }

    // Bonjour / aide
    if (q.includes('bonjour') || q.includes('salut') || q.includes('aide') || q.includes('help') || q.includes('que') || q.includes('quoi') || q.length < 10) {
      return `Bonjour ! Je suis votre assistant AVRA. Voici ce que je peux faire pour vous :\n\n📁 **Dossiers** — urgents, signés, recherche client\n💶 **Facturation & Devis** — CA, impayés, relances, signatures\n✍️ **Signatures électroniques** — devis en attente\n📋 **Actions à faire** — votre todo liste prioritaire\n🤝 **Apporteurs** — commissions, réseau\n📦 **Stock** — ruptures, articles\n👷 **Intervenants** — équipe, disponibilités\n📅 **Planning** — semaine en cours\n\nActuellement : **${urgents.length} urgent(s)**, **${retardInvoices.length} facture(s) en retard**, **${pendingAlerts.length} alerte(s)**. Comment puis-je vous aider ?`;
    }

    // Fallback
    return `Je comprends votre question sur "${msg}". Pour une réponse précise, consultez le module correspondant dans la navigation. N'hésitez pas à reformuler ou à me poser une question sur les dossiers, la facturation, le stock ou les intervenants !`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Bonjour ! Je suis votre assistant AVRA 🤖\n\nActuellement, vous avez **${urgents.length} dossier(s) urgent(s)**, **${retardInvoices.length} facture(s) en retard** et **${pendingAlerts.length} alerte(s)** active(s).\n\nComment puis-je vous aider ?`,
      time: timeStr(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    const userMsg: Message = { role: 'user', text: msg, time: timeStr() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => {
      const response = getResponse(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: response, time: timeStr() }]);
    }, 600);
  };

  const QUICK_ACTIONS = [
    { label: 'Dossiers urgents', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    { label: 'CA et facturation', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Actions à faire', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Signatures devis', icon: Pen, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { label: 'Mes dossiers', icon: FolderOpen, color: 'text-[#304035] bg-[#f5eee8] border-[#a67749]/30' },
    { label: 'Rédiger une relance', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Stock et ruptures', icon: Package, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'Apporteurs & Commissions', icon: Users, color: 'text-emerald-600 bg-teal-50 border-teal-200' },
  ];

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Handle bold with **
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={line.startsWith('•') ? 'ml-2' : ''}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] assistant-root">
      <style>{`
        @media (max-width: 768px) {
          .assistant-root { height: calc(100vh - 140px) !important; }
        }
      `}</style>
      {/* Header */}
      <div className="shrink-0 mb-4">
        <PageHeader
          icon={<Bot className="h-7 w-7" />}
          title="Assistant AVRA"
          subtitle="Connecté en temps réel à vos données"
          actions={
            <div className="flex gap-2">
              {urgents.length > 0 && (
                <span className="rounded-full bg-red-500/20 border border-red-400/30 px-3 py-1 text-xs font-bold text-white">
                  {urgents.length} urgent(s)
                </span>
              )}
              {retardInvoices.length > 0 && (
                <span className="rounded-full bg-orange-400/20 border border-orange-300/30 px-3 py-1 text-xs font-bold text-white">
                  {retardInvoices.length} retard(s)
                </span>
              )}
              {pendingAlerts.length > 0 && (
                <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold text-white">
                  {pendingAlerts.length} alerte(s)
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Chat container */}
      <div className="flex-1 rounded-2xl bg-white shadow-md border border-[#304035]/8 flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a67749] to-[#304035] mt-1 shadow-sm">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[78%] space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-0.5 ${m.role === 'user' ? 'bg-[#304035] text-white rounded-tr-none' : 'bg-[#f5eee8] text-[#304035] rounded-tl-none'}`}>
                  {formatMessage(m.text)}
                </div>
                <span className="text-[10px] text-[#304035]/30 px-1">{m.time}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        <div className="px-4 pb-3 border-t border-[#304035]/5 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => send(action.label)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm ${action.color}`}
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-[#304035]/10 p-3 flex gap-2">
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#304035]/15 text-[#304035]/50 hover:text-[#304035] hover:bg-[#f5eee8] transition-colors">
            <Mic className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Posez votre question à AVRA…"
            className="flex-1 rounded-xl border border-[#304035]/15 px-4 py-2 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 bg-[#f5eee8]/30"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#304035] text-white hover:bg-[#304035]/90 disabled:opacity-50 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
