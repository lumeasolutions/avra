'use client';

/**
 * HistoryPanel — Panneau latéral d'historique IA pour /ia-studio.
 *
 * Affiche les générations persistées en DB (table IaJob), filtrées par module
 * (coloriste / rendu réaliste) et triées par date décroissante. Cliquer une
 * carte expose le job complet via `onSelect`, ce qui permet à la page parente
 * de l'afficher dans la zone de résultat ou de pré-remplir un nouveau formulaire.
 *
 * Stratégie de rafraîchissement :
 *   - chargement initial à l'ouverture du panneau
 *   - re-fetch quand `refreshTrigger` change (la page parente bump ce nombre
 *     après chaque génération réussie)
 *   - bouton manuel "Rafraîchir" pour les cas où plusieurs users génèrent
 *     en parallèle dans le même workspace.
 *
 * Les URLs Supabase signées dans `resultImageUrls.signedUrls` sont valables
 * 30 jours. Si une image ne charge pas (URL expirée), on tombe sur le
 * fallback "image indisponible".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Calendar,
  User as UserIcon,
} from 'lucide-react';

type JobType   = 'COLOR_VARIATION' | 'PHOTOREALISM_ENHANCE';
type JobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface IaJobRow {
  id:              string;
  type:            JobType;
  status:          JobStatus;
  prompt:          string | null;
  errorMessage:    string | null;
  durationMs:      number | null;
  costEUR:         number | null;
  modelsUsed:      string[];
  completedAt:     string | null;
  createdAt:       string;
  projectId:       string | null;
  resultImageUrls: { signedUrls?: string[]; paths?: string[]; falRaw?: string[] } | null;
  inputImageUrls:  { source?: string; facade?: string | null; poignee?: string | null; plan?: string | null } | null;
  params:          Record<string, unknown> | null;
  project:         { id: string; name: string } | null;
  createdBy:       { id: string; email: string; firstName: string; lastName: string } | null;
}

interface Props {
  /** Filtre obligatoire : un seul module visible à la fois (coherent avec l'UI tabs). */
  filterType:      JobType;
  /** Callback quand l'user clique une vignette. */
  onSelect?:       (job: IaJobRow) => void;
  /** Bump ce nombre après une génération réussie pour forcer le re-fetch. */
  refreshTrigger?: number;
  /** Couleur d'accent (or pour coloriste, bleu pour rendu). */
  accent:          string;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, { bg: string; fg: string; label: string; icon: typeof Clock }> = {
    QUEUED:     { bg: '#9ca3af20', fg: '#6b7280', label: 'En attente',  icon: Clock },
    PROCESSING: { bg: '#3b82f620', fg: '#2563eb', label: 'En cours',    icon: Loader2 },
    DONE:       { bg: '#10b98120', fg: '#059669', label: 'Terminé',     icon: CheckCircle2 },
    FAILED:     { bg: '#ef444420', fg: '#dc2626', label: 'Échec',       icon: XCircle },
  };
  const s = styles[status];
  const Icon = s.icon;
  return (
    <span
      style={{ background: s.bg, color: s.fg }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
    >
      <Icon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'à l\'instant';
  if (mins < 60)  return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `il y a ${days} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function HistoryPanel({ filterType, onSelect, refreshTrigger, accent }: Props) {
  const [jobs,    setJobs]    = useState<IaJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/ia/jobs', window.location.origin);
      url.searchParams.set('type',     filterType);
      url.searchParams.set('pageSize', '30');
      // Cache-bust : evite que le navigateur ressorte la reponse d'un fetch
      // precedent (Next.js peut emettre des cache headers sur les /api routes).
      url.searchParams.set('_t', String(Date.now()));
      const res = await fetch(url.toString(), {
        credentials: 'include',
        cache:       'no-store',
      });
      if (res.status === 401) {
        setError('Session expirée. Reconnectez-vous.');
        setJobs([]);
        return;
      }
      if (!res.ok) {
        setError(`Erreur ${res.status}`);
        setJobs([]);
        return;
      }
      const data = (await res.json()) as { jobs: IaJobRow[] };
      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Re-fetch quand le filtre change OU quand la page parente bump refreshTrigger.
  // Apres une generation, on declenche un fetch immediat + un retry a 1.5s pour
  // couvrir le cas ou la 1ere requete arrive avant que la transaction Prisma DONE
  // soit visible sur le pooler Supabase (latence sub-seconde mais observable).
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    void load();
    if (refreshTrigger && refreshTrigger > 0) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => { void load(); }, 1500);
    }
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [load, refreshTrigger]);

  return (
    <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#304035]/8 bg-gradient-to-b from-[#f9f6f0] to-white">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" style={{ color: accent }} />
          <p className="font-bold text-[#304035] text-sm">Historique</p>
          {!loading && jobs.length > 0 && (
            <span className="text-[10px] font-bold text-[#304035]/45 bg-[#304035]/5 px-1.5 py-0.5 rounded-full">
              {jobs.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Rafraîchir"
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#304035]/5 text-[#304035]/50 hover:text-[#304035] transition-colors disabled:opacity-30"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px] max-h-[calc(100vh-200px)]">
        {/* Loading state */}
        {loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#304035]/40 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs">Chargement…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#304035]/40 gap-2 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#304035]/5">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-[#304035]/60">Aucune génération</p>
            <p className="text-[11px] leading-relaxed">
              Vos rendus apparaîtront ici dès la première génération.
            </p>
          </div>
        )}

        {/* Job cards */}
        {jobs.map(job => {
          const thumb = job.resultImageUrls?.signedUrls?.[0] ?? null;
          const variantCount = job.resultImageUrls?.signedUrls?.length ?? 0;
          const clickable = job.status === 'DONE' && !!thumb;
          return (
            <button
              key={job.id}
              onClick={() => clickable && onSelect?.(job)}
              disabled={!clickable}
              className={`w-full text-left rounded-xl border bg-white hover:shadow-md transition-all overflow-hidden group ${
                clickable
                  ? 'border-[#304035]/10 cursor-pointer hover:border-[var(--accent)]'
                  : 'border-[#304035]/8 cursor-default opacity-90'
              }`}
              style={{ ['--accent' as string]: accent } as React.CSSProperties}
            >
              {/* Thumbnail or placeholder */}
              <div className="relative w-full aspect-video bg-[#304035]/5">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={job.prompt ?? 'Rendu IA'}
                    fill
                    sizes="380px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {job.status === 'PROCESSING' || job.status === 'QUEUED' ? (
                      <Loader2 className="h-5 w-5 text-[#304035]/30 animate-spin" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-300" />
                    )}
                  </div>
                )}
                {variantCount > 1 && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5">
                    {variantCount} variantes
                  </span>
                )}
                <div className="absolute bottom-2 left-2">
                  <StatusBadge status={job.status} />
                </div>
              </div>

              {/* Metadata */}
              <div className="p-3 space-y-1.5">
                {job.prompt && job.status === 'DONE' && (
                  <p className="text-[11px] text-[#304035]/70 line-clamp-2 leading-relaxed">
                    {job.prompt.slice(0, 110)}{job.prompt.length > 110 ? '…' : ''}
                  </p>
                )}
                {job.errorMessage && job.status === 'FAILED' && (
                  <p className="text-[11px] text-red-600 line-clamp-2 leading-relaxed">
                    {job.errorMessage}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-[#304035]/45">
                  <Calendar className="h-3 w-3" />
                  <span>{formatRelativeDate(job.createdAt)}</span>
                  {job.createdBy && (
                    <>
                      <span>·</span>
                      <UserIcon className="h-3 w-3" />
                      <span>{job.createdBy.firstName}</span>
                    </>
                  )}
                  {job.costEUR != null && (
                    <>
                      <span>·</span>
                      <span>{job.costEUR.toFixed(2).replace('.', ',')} €</span>
                    </>
                  )}
                </div>
                {job.project && (
                  <p className="text-[10px] font-semibold text-[#304035]/60 truncate">
                    📁 {job.project.name}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
