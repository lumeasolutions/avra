'use client';

import { useState, useEffect } from 'react';
import { PenTool, CheckCircle, Clock, XCircle, AlertCircle, ExternalLink, Send, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'En attente',
    color: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
  },
  SENT: {
    label: 'Envoyé',
    color: 'bg-blue-100 text-blue-700 border border-blue-200',
    icon: <Send className="h-4 w-4 text-blue-500" />,
  },
  SIGNED: {
    label: 'Signé',
    color: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  },
  REFUSED: {
    label: 'Refusé',
    color: 'bg-red-100 text-red-700 border border-red-200',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  EXPIRED: {
    label: 'Expiré',
    color: 'bg-gray-100 text-gray-600 border border-gray-200',
    icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'bg-gray-100 text-gray-600 border border-gray-200',
    icon: <XCircle className="h-4 w-4 text-gray-500" />,
  },
};

export default function SignaturePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<any>('/signature?page=1&pageSize=100')
      .then(res => { if (!cancelled) setDocuments(res.data ?? []); })
      .catch(e => { if (!cancelled) { console.error(e); setDocuments([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <PenTool className="h-8 w-8 text-[#304035]/20 mx-auto mb-3 animate-pulse" />
          <p className="text-[#304035]/40 text-sm">Chargement des signatures...</p>
        </div>
      </div>
    );
  }

  const signed = documents.filter(d => d.status === 'SIGNED').length;
  const sent = documents.filter(d => d.status === 'SENT').length;
  const pending = documents.filter(d => d.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <style>{`
        @media (max-width: 768px) {
          .sig-table-wrap { overflow-x: auto; }
          .sig-table-inner { min-width: 600px; }
        }
      `}</style>
      <PageHeader
        icon={<PenTool className="h-7 w-7" />}
        title="Signatures électroniques"
        subtitle={`${documents.length} demande${documents.length !== 1 ? 's' : ''} · Intégration YouSign`}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-5">
          <p className="text-xs font-semibold text-[#304035]/50 mb-1">Total</p>
          <p className="text-3xl font-bold text-[#304035]">{documents.length}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-5">
          <p className="text-xs font-semibold text-blue-500 mb-1">Envoyés</p>
          <p className="text-3xl font-bold text-blue-600">{sent}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-5">
          <p className="text-xs font-semibold text-emerald-600 mb-1">Signés</p>
          <p className="text-3xl font-bold text-emerald-600">{signed}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-5">
          <p className="text-xs font-semibold text-yellow-500 mb-1">En attente</p>
          <p className="text-3xl font-bold text-yellow-500">{pending}</p>
        </div>
      </div>

      {/* Document list */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 overflow-hidden">
        {documents.length === 0 ? (
          <div className="px-7 py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <PenTool className="h-7 w-7 text-violet-300" />
            </div>
            <p className="font-semibold text-[#304035]/50 text-sm mb-1">Aucun document à signer</p>
            <p className="text-xs text-[#304035]/30">Envoyez un devis pour signature depuis la page Facturation</p>
          </div>
        ) : (
          <div className="sig-table-wrap">
          <div className="sig-table-inner divide-y divide-[#304035]/5">
            {/* Table header */}
            <div className="px-6 py-3 bg-[#304035]/3 grid grid-cols-12 gap-4 text-xs font-semibold text-[#304035]/40 uppercase tracking-wide">
              <span className="col-span-3">Document</span>
              <span className="col-span-2">Signataire</span>
              <span className="col-span-2">Dossier</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-1">Lien</span>
            </div>

            {documents.map(d => {
              const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;
              return (
                <div key={d.id} className="px-6 py-4 hover:bg-[#f5eee8]/20 transition-all grid grid-cols-12 gap-4 items-center">
                  {/* Document */}
                  <div className="col-span-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#304035] truncate">
                        {d.documentTitle || `Document ${d.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-[#304035]/40 truncate">{d.provider || 'yousign'}</p>
                    </div>
                  </div>

                  {/* Signataire */}
                  <div className="col-span-2">
                    <p className="text-sm text-[#304035] truncate">{d.signerName || '—'}</p>
                    <p className="text-xs text-[#304035]/40 truncate">{d.signerEmail || ''}</p>
                  </div>

                  {/* Dossier */}
                  <div className="col-span-2">
                    <p className="text-sm text-[#304035] truncate">{d.project?.name || '—'}</p>
                    <p className="text-xs text-[#304035]/40 truncate">{d.project?.reference || ''}</p>
                  </div>

                  {/* Date */}
                  <div className="col-span-2">
                    <p className="text-sm text-[#304035]">
                      {d.signedAt
                        ? new Date(d.signedAt).toLocaleDateString('fr-FR')
                        : new Date(d.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-[#304035]/40">
                      {d.signedAt ? 'Signé le' : 'Créé le'}
                    </p>
                  </div>

                  {/* Statut */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Lien de signature */}
                  <div className="col-span-1">
                    {d.signingUrl ? (
                      <a
                        href={d.signingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 text-xs font-bold transition-colors"
                        title="Ouvrir le lien de signature"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[#304035]/20 text-xs">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
