'use client';

import Link from 'next/link';
import { useDossierStore } from '@/store';
import { useProjectActions } from '@/hooks/useProjectActions';
import { ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';

/**
 * Dossiers perdus — dossiers non signes que l'utilisateur a ecartes.
 * Affiche la raison + date, et permet de RESTAURER (repasse en "En cours").
 */
export default function DossiersPerdusPage() {
  const dossiersPerdus = useDossierStore((s) => s.dossiersPerdus);
  const { restoreLostProject } = useProjectActions();

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dossiers"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#304035]/70 hover:text-[#304035] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Dossiers en cours
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-11 w-11 rounded-2xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#304035]">Dossiers perdus</h1>
          <p className="text-sm text-[#304035]/55">
            {dossiersPerdus.length} dossier{dossiersPerdus.length > 1 ? 's' : ''} non signe{dossiersPerdus.length > 1 ? 's' : ''} — restaurables a tout moment
          </p>
        </div>
      </div>

      {dossiersPerdus.length === 0 ? (
        <div className="rounded-2xl border border-[#304035]/10 bg-white px-6 py-16 text-center">
          <p className="text-[#304035]/50 text-sm">Aucun dossier perdu pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dossiersPerdus.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 rounded-2xl border border-[#304035]/10 bg-white px-5 py-4 hover:border-red-200 transition-all"
            >
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-[#304035] truncate">{d.name}</span>
                <span className="block text-xs text-[#304035]/55 mt-0.5">
                  {d.reason ? `Raison : ${d.reason}` : 'Sans raison precisee'}
                  {d.lostDate ? ` · perdu le ${d.lostDate}` : ''}
                  {d.vendeurName ? ` · ${d.vendeurName}` : ''}
                </span>
              </div>
              {typeof d.montantEstime === 'number' && d.montantEstime > 0 && (
                <span className="shrink-0 text-sm font-bold text-red-500/80">
                  {d.montantEstime.toLocaleString('fr-FR')} €
                </span>
              )}
              <button
                onClick={() => restoreLostProject(d.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#304035] px-4 py-2 text-xs font-bold text-white hover:bg-[#a67749] transition-all"
                title="Restaurer ce dossier dans « En cours »"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
