'use client';

/**
 * ValidationDashboard — Tableau de bord "waouhh" de validation des dossiers.
 *
 * Affiche un récap en temps réel :
 *  - Anneau de progression animé (% de sous-dossiers validés globalement)
 *  - Compteurs ✓ Validés / ⏳ En attente
 *  - Top 3 dossiers qui ont le plus de sous-dossiers non validés
 *  - Bouton "Demander à AVRA" qui ouvre l'assistant avec un prompt contextuel
 *
 * Connecté à :
 *  - useDossierStore (source des données)
 *  - useAssistantStore (ouverture + seed prompt)
 */

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Sparkles, TrendingUp, ArrowUpRight, PartyPopper } from 'lucide-react';
import { useDossierStore } from '@/store';
import { useAssistantStore } from '@/store/useAssistantStore';

function useAnimatedNumber(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = val;
    const delta = target - from;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setVal(Math.round(from + delta * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export function ValidationDashboard() {
  const dossiers = useDossierStore((s) => s.dossiers);
  const openWithPrompt = useAssistantStore((s) => s.openWithPrompt);

  const stats = useMemo(() => {
    let total = 0;
    let validated = 0;
    const perDossier: { id: string; name: string; firstName?: string; total: number; pending: number; validated: number; status: string }[] = [];

    for (const d of dossiers) {
      const subs = d.subfolders ?? [];
      const tTotal = subs.length;
      const tValid = subs.filter((s) => s.validated).length;
      total += tTotal;
      validated += tValid;
      perDossier.push({
        id: d.id,
        name: d.name,
        firstName: d.firstName,
        total: tTotal,
        pending: tTotal - tValid,
        validated: tValid,
        status: d.status,
      });
    }

    const pending = total - validated;
    const pct = total === 0 ? 0 : Math.round((validated / total) * 100);
    const topPending = [...perDossier]
      .filter((d) => d.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 3);

    const dossiersFullyValidated = perDossier.filter((d) => d.total > 0 && d.pending === 0).length;

    return { total, validated, pending, pct, topPending, dossiersFullyValidated };
  }, [dossiers]);

  const animPct = useAnimatedNumber(stats.pct);
  const animValid = useAnimatedNumber(stats.validated);
  const animPending = useAnimatedNumber(stats.pending);

  // Géométrie anneau SVG
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (CIRC * animPct) / 100;

  const isPerfect = stats.pct === 100 && stats.total > 0;

  const handleAskAvra = () => {
    const ctx = stats.pending === 0
      ? `Tous mes sous-dossiers sont validés (${stats.validated}/${stats.total}). Donne-moi un récap de l'état global et les prochaines étapes à anticiper.`
      : `Analyse mes ${stats.pending} sous-dossiers non validés sur ${stats.total} au total. Voici les dossiers les plus en retard : ${stats.topPending
          .map((d) => `${d.name}${d.firstName ? ' ' + d.firstName : ''} (${d.pending} en attente)`)
          .join(', ')}. Propose-moi un plan d'action priorisé.`;
    openWithPrompt(ctx);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white shadow-lg"
      style={{
        background:
          'linear-gradient(135deg, #2d4a34 0%, #304035 40%, #3a5a42 100%)',
        boxShadow: '0 10px 40px rgba(48,64,53,0.25), 0 2px 8px rgba(48,64,53,0.15)',
      }}
    >
      {/* Glow décoratifs */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(166,119,73,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(74,163,80,0.25) 0%, transparent 70%)' }}
      />

      {/* Pulse vert si 100% */}
      {isPerfect && (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{ boxShadow: 'inset 0 0 60px rgba(74,222,128,0.3)' }}
        />
      )}

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#d9b38a]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">Tableau de bord</h3>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Validation en temps réel</p>
            </div>
          </div>
          {isPerfect && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30">
              <PartyPopper className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] font-bold text-emerald-200">PARFAIT</span>
            </div>
          )}
        </div>

        {/* Ring + Numbers */}
        <div className="flex items-center gap-5 mb-5">
          <div className="relative shrink-0">
            <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d9b38a" />
                  <stop offset="100%" stopColor="#a67749" />
                </linearGradient>
                <linearGradient id="ringGradOk" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#86efac" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="52" cy="52" r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
              {/* Progress */}
              <circle
                cx="52"
                cy="52"
                r={R}
                stroke={isPerfect ? 'url(#ringGradOk)' : 'url(#ringGrad)'}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-none">{animPct}%</span>
              <span className="text-[9px] uppercase tracking-wider text-white/50 mt-0.5">Validé</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-400/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <span className="text-[11px] font-semibold text-white/80">Validés</span>
              </div>
              <span className="text-lg font-bold tabular-nums">{animValid}</span>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-400/20">
                  <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <span className="text-[11px] font-semibold text-white/80">En attente</span>
              </div>
              <span className="text-lg font-bold tabular-nums">{animPending}</span>
            </div>
          </div>
        </div>

        {/* Top pending list */}
        {stats.topPending.length > 0 ? (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3 text-[#d9b38a]" />
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">À traiter en priorité</span>
            </div>
            <div className="space-y-1.5">
              {stats.topPending.map((d) => {
                const pct = d.total === 0 ? 0 : Math.round((d.validated / d.total) * 100);
                return (
                  <Link
                    key={d.id}
                    href={`/dossiers/${d.id}`}
                    className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/8 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {d.name}
                        {d.firstName ? ` ${d.firstName}` : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #d9b38a, #a67749)',
                              transition: 'width 0.8s ease',
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-white/50 tabular-nums shrink-0">
                          {d.validated}/{d.total}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-[10px] font-bold text-amber-200 tabular-nums">
                      {d.pending}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : stats.total > 0 ? (
          <div className="mb-4 px-3 py-3 rounded-xl bg-emerald-400/10 border border-emerald-300/20 text-center">
            <p className="text-xs font-semibold text-emerald-200">🎉 Tous les sous-dossiers sont validés !</p>
          </div>
        ) : (
          <div className="mb-4 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-[11px] text-white/50">Aucun sous-dossier pour l&apos;instant</p>
          </div>
        )}

        {/* Footer stats + AVRA button */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
          <div className="text-[10px] text-white/60">
            <span className="font-bold text-white">{stats.dossiersFullyValidated}</span>
            <span className="text-white/50"> dossier{stats.dossiersFullyValidated > 1 ? 's' : ''} complet{stats.dossiersFullyValidated > 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={handleAskAvra}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#304035] bg-gradient-to-r from-[#d9b38a] to-[#a67749] hover:from-[#e5c5a0] hover:to-[#b88a5e] shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <Sparkles className="h-3 w-3 group-hover:rotate-12 transition-transform" />
            Demander à AVRA
          </button>
        </div>
      </div>
    </div>
  );
}
