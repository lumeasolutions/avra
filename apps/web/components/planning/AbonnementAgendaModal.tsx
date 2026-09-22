'use client';
/**
 * Abonnement agenda : les RDV du planning AVRA apparaissent automatiquement
 * dans Google Agenda, Outlook ou l'agenda de l'iPhone (flux .ics personnel).
 */
import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Loader2, RefreshCw, CalendarPlus, ExternalLink } from 'lucide-react';
import { lienAbonnementAgenda, liensAjoutAgenda } from '@/lib/events-api';
import { backdropClose } from '@/lib/backdropClose';

export function AbonnementAgendaModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [gestion, setGestion] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    lienAbonnementAgenda()
      .then((u) => { if (alive) setUrl(u); })
      .catch((e) => { if (alive) setErr(e?.message || 'Lien indisponible.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, []);

  const flux = url ? `${url}${gestion ? '?gestion=1' : ''}` : '';
  const liens = flux ? liensAjoutAgenda(flux) : null;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(flux);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Copie refusée par le navigateur : sélectionnez le lien et copiez-le.');
    }
  };

  const regenerer = async () => {
    if (!confirm('Générer un nouveau lien ?\n\nL\'ancien lien cessera de fonctionner : il faudra réabonner vos agendas (et le lien agenda de votre portail intervenant, s\'il existe, change aussi).')) return;
    setBusy(true); setErr('');
    try { setUrl(await lienAbonnementAgenda(true)); } catch (e: any) { setErr(e?.message || 'Échec.'); } finally { setBusy(false); }
  };

  const Btn = ({ href, label, sub }: { href: string; label: string; sub: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-2xl border border-[#304035]/12 px-3.5 py-2.5 hover:bg-[#f5eee8]/60 transition-colors"
    >
      <span>
        <span className="block text-sm font-bold text-[#304035]">{label}</span>
        <span className="block text-[10px] text-[#304035]/50">{sub}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 text-[#304035]/40 shrink-0" />
    </a>
  );

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto p-3"
      style={{ background: 'rgba(30,30,30,0.45)', backdropFilter: 'blur(4px)' }}
      {...backdropClose(onClose)}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200"><CalendarPlus className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <h3 className="text-base font-bold text-[#304035]">Voir le planning dans mon agenda</h3>
              <p className="text-xs text-[#304035]/50 mt-0.5">Google Agenda, Outlook, iPhone — une seule fois, puis automatique.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#304035]/5 text-[#304035]/40" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {busy && !url ? (
            <p className="flex items-center gap-2 text-sm text-[#304035]/60 py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Préparation du lien…</p>
          ) : liens ? (
            <>
              <label className="flex items-center gap-2 text-xs text-[#304035]/70 cursor-pointer select-none">
                <input type="checkbox" checked={gestion} onChange={(e) => setGestion(e.target.checked)} className="accent-[#304035]" />
                Inclure aussi le planning gestion (interventions)
              </label>
              <div className="space-y-2">
                <Btn href={liens.google} label="Google Agenda" sub="Ouvre Google Agenda, confirmez « Ajouter »" />
                <Btn href={liens.webcal} label="iPhone / Mac (Apple Calendrier)" sub="Ouvre Calendrier, confirmez « S'abonner »" />
                <Btn href={liens.outlook} label="Outlook.com / Hotmail" sub="Compte Outlook personnel" />
                <Btn href={liens.outlookPro} label="Outlook Microsoft 365" sub="Compte professionnel" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#304035]/50 uppercase tracking-wider mb-1.5">Autre agenda : copier le lien</p>
                <div className="flex gap-2">
                  <input readOnly value={flux} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2 text-[11px] text-[#304035]" />
                  <button type="button" onClick={copier} className="flex items-center gap-1 rounded-xl border border-[#304035]/15 px-3 text-xs font-bold text-[#304035] hover:bg-[#f5eee8]">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copié' : 'Copier'}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-[11px] text-amber-900 leading-relaxed">
                <b>À savoir :</b> les agendas relisent ce lien eux-mêmes — Google toutes les quelques heures (jusqu'à 24 h), Apple et Outlook plus souvent.
                Un RDV tout juste créé peut donc mettre un moment à apparaître. Ce lien est personnel : ne le partagez pas.
              </div>
              <button type="button" onClick={regenerer} disabled={busy} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#304035]/50 hover:text-[#304035]">
                <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> Lien partagé par erreur ? Générer un nouveau lien
              </button>
            </>
          ) : null}
          {err && <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        </div>
      </div>
    </div>
  );
}
