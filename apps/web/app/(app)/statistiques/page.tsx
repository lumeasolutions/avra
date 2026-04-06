'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, TrendingUp, TrendingDown, Euro, FolderOpen,
  Users, Package, AlertTriangle, CheckCircle2,
  Activity, ChevronRight, Calendar, BarChart2, Zap,
  CreditCard, X, Plus
} from 'lucide-react';
import { useDossierStore, useFacturationStore, useIntervenantStore, useStockStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n > 0 ? '+' : ''}${n}%`;

type PeriodKey = 'mois' | 'trimestre' | 'annee' | 'tout';

function isInPeriod(dateStr: string, period: PeriodKey): boolean {
  if (period === 'tout') return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === 'mois') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3);
    const dq = Math.floor(d.getMonth() / 3);
    return dq === q && d.getFullYear() === now.getFullYear();
  }
  if (period === 'annee') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

// ─── Score santé ────────────────────────────────────────────────────────────

function getHealthScore(tauxConv: number, tauxPaie: number, caRetard: number, caTTC: number, hasData: boolean) {
  if (!hasData) return null;
  let score = 0;
  if (tauxConv >= 50) score += 2; else if (tauxConv >= 30) score += 1;
  if (tauxPaie >= 70) score += 2; else if (tauxPaie >= 50) score += 1;
  if (caRetard === 0) score += 2; else if (caRetard < caTTC * 0.1) score += 1;
  if (score >= 5) return { label: 'Excellente', color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', pct: Math.round((score / 6) * 100) };
  if (score >= 3) return { label: 'Bonne', color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', pct: Math.round((score / 6) * 100) };
  if (score >= 1) return { label: 'À surveiller', color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', pct: Math.round((score / 6) * 100) };
  return { label: 'Critique', color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', pct: Math.round((score / 6) * 100) };
}

// ─── Missing Stats Detection ─────────────────────────────────────────────

interface DossierWithMissing {
  id: string;
  name: string;
  prixAchat?: number;
  prixVente?: number;
  hasMissing: boolean;
}

function DetectMissingStats({ dossiers, confirmations }: { dossiers: any[]; confirmations: any[] }): DossierWithMissing[] {
  return dossiers.map(d => {
    const confirms = confirmations.filter((c: any) => c.dossierId === d.id && c.validee);
    const hasMissing = confirms.some((c: any) => !c.montant);
    return {
      id: d.id,
      name: d.name || `Dossier ${d.id.slice(0, 8)}`,
      prixAchat: confirms.reduce((s: number, c: any) => s + (c.montant || 0), 0),
      prixVente: undefined,
      hasMissing
    };
  });
}

// ─── Popup Components ────────────────────────────────────────────────────

interface MissingStatsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  missing: DossierWithMissing[];
  onComplete: (dossierId: string) => void;
}

function MissingStatsPopup({ isOpen, onClose, missing, onComplete }: MissingStatsPopupProps) {
  if (!isOpen || missing.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#304035]/8 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h3 className="font-bold text-[#304035] text-lg">STATISTIQUES MANQUANTS</h3>
            <p className="text-xs text-[#304035]/50 mt-0.5">{missing.length} dossier(s) à compléter</p>
          </div>
          <button onClick={onClose} className="text-[#304035]/40 hover:text-[#304035]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {missing.map(item => (
            <div key={item.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#304035]">{item.name}</p>
                <p className="text-xs text-[#304035]/50 mt-1">
                  {!item.prixAchat && 'Prix achat'}
                  {!item.prixAchat && !item.prixVente ? ' / ' : ''}
                  {!item.prixVente && 'Prix vente'}
                  {' manquant(s)'}
                </p>
              </div>
              <button
                onClick={() => onComplete(item.id)}
                className="ml-3 shrink-0 bg-[#304035] text-white rounded-lg p-2 hover:bg-[#304035]/90 transition-colors"
                title="Compléter les infos"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DossierDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: any;
  beforeVentes: any[];
  confirmations: any[];
}

function DossierDetailPopup({ isOpen, onClose, dossier, beforeVentes, confirmations }: DossierDetailPopupProps) {
  if (!isOpen || !dossier) return null;

  const avant = beforeVentes.filter((d: any) => d.dossierId === dossier.id);
  const confirms = confirmations.filter((c: any) => c.dossierId === dossier.id && c.validee);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#304035]/8 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-[#304035] text-lg">{dossier.name}</h3>
            <p className="text-xs text-[#304035]/50 mt-0.5">Détails complets</p>
          </div>
          <button onClick={onClose} className="text-[#304035]/40 hover:text-[#304035]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* DOSSIER AVANT VENTE */}
          <div>
            <h4 className="font-bold text-[#304035] text-sm uppercase mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#304035]" />
              Dossier Avant Vente
            </h4>
            {avant.length === 0 ? (
              <p className="text-sm text-[#304035]/40 py-3">Aucun devis</p>
            ) : (
              <div className="space-y-2">
                {avant.map((a, i) => (
                  <div key={i} className="bg-[#304035]/5 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#304035]">{a.name || `Devis ${i + 1}`}</span>
                      <span className="font-bold text-[#304035]">{fmt(a.montant || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONFIRMATIONS VALIDEES */}
          <div>
            <h4 className="font-bold text-[#304035] text-sm uppercase mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-emerald-600" />
              Confirmations Validées
            </h4>
            {confirms.length === 0 ? (
              <p className="text-sm text-[#304035]/40 py-3">Aucune confirmation validée</p>
            ) : (
              <div className="space-y-2">
                {confirms.map((c, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-[#304035]">{c.fournisseur || `Fournisseur ${i + 1}`}</span>
                      <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-1 rounded">VALIDÉE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[#304035]/50">Produit</p>
                        <p className="font-bold text-[#304035]">{c.produit || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#304035]/50">Montant</p>
                        <p className="font-bold text-[#304035]">{fmt(c.montant || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pie Chart CSS Component ─────────────────────────────────────────────

function PieChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-[#304035]/40 text-center py-4">Aucune donnée</p>;

  let cumulAngle = 0;
  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const angle = (pct / 100) * 360;
    const start = cumulAngle;
    const end = cumulAngle + angle;
    cumulAngle = end;
    return { ...d, pct, start, end };
  });

  const svgSegments = segments.map((s, i) => {
    const angle = (s.pct / 100) * 360;
    const largeArc = angle > 180 ? 1 : 0;
    const startRad = (s.start * Math.PI) / 180;
    const endRad = (s.end * Math.PI) / 180;
    const r = 45;
    const cx = 50, cy = 50;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={i} d={path} fill={s.color} />;
  });

  return (
    <div>
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 100 100" className="w-40 h-40">
          {svgSegments}
          <circle cx="50" cy="50" r="20" fill="white" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <div className="text-xs">
              <p className="font-medium text-[#304035]">{s.label}</p>
              <p className="text-[#304035]/50">{s.pct.toFixed(0)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── StatCard ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
  href?: string;
  alert?: boolean;
}

function StatCard({ label, value, sub, trend, icon, color, href, alert }: StatCardProps) {
  const router = useRouter();
  const isClickable = !!href;
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm border p-4 flex flex-col gap-3 transition-all duration-200
        ${alert ? 'border-red-300 shadow-red-100' : 'border-[#304035]/8'}
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[#304035]/20 active:scale-[0.99]' : ''}
      `}
      onClick={() => href && router.push(href)}
    >
      {/* Icône + label */}
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-2 shrink-0 ${color}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {pct(trend)}
          </span>
        )}
      </div>
      {/* Valeur + sous-titre */}
      <div>
        <p className="text-[10px] font-semibold text-[#304035]/50 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#304035] leading-none">{value}</p>
        {sub && <p className="text-xs text-[#304035]/50 mt-1.5 leading-snug">{sub}</p>}
      </div>
      {isClickable && (
        <div className="flex items-center gap-0.5 text-xs text-[#304035]/30 mt-auto pt-1 border-t border-[#304035]/5">
          <span>Voir détail</span><ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

// ─── ProgressBar avec tooltip ────────────────────────────────────────────────

function ProgressRow({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const [hovered, setHovered] = useState(false);
  const width = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-[#304035]/80">{label}</span>
        <span className="font-bold text-[#304035]">{count}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#304035]/8 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
      {hovered && (
        <div className="absolute right-0 top-0 -translate-y-full mt-[-4px] bg-[#304035] text-white text-xs px-2 py-1 rounded-lg shadow-lg z-10 whitespace-nowrap">
          {width}% du total
        </div>
      )}
    </div>
  );
}

// ─── Graphique CA mensuel SVG natif ─────────────────────────────────────────

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function CaChart({ data }: { data: { mois: string; ca: number }[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; val: number; label: string } | null>(null);
  const W = 640; const H = 180; const PAD = { t: 16, r: 16, b: 30, l: 52 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.ca), 1);
  const barW = Math.floor(plotW / data.length) - 6;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD.t + plotH * (1 - f);
          const val = maxVal * f;
          return (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#304035" strokeOpacity={0.07} strokeDasharray="4 3" />
              {f > 0 && (
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#304035" fillOpacity={0.4}>
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
                </text>
              )}
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.l + i * (plotW / data.length) + (plotW / data.length - barW) / 2;
          const barH = maxVal > 0 ? Math.max((d.ca / maxVal) * plotH, d.ca > 0 ? 3 : 0) : 0;
          const y = PAD.t + plotH - barH;
          const isHovered = tooltip?.label === d.mois;
          return (
            <g key={d.mois}>
              <rect
                x={x} y={y} width={barW} height={barH}
                rx={4}
                fill={isHovered ? '#a67749' : '#304035'}
                fillOpacity={d.ca > 0 ? (isHovered ? 1 : 0.7) : 0.15}
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                onMouseEnter={e => {
                  const svg = (e.target as SVGElement).closest('svg');
                  const rect = svg?.getBoundingClientRect();
                  if (!rect) return;
                  const svgX = (x + barW / 2) / W * rect.width + rect.left;
                  const svgY = y / H * rect.height + rect.top;
                  setTooltip({ x: svgX, y: svgY, val: d.ca, label: d.mois });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* x label */}
              <text
                x={x + barW / 2} y={H - 6}
                textAnchor="middle" fontSize={9} fill="#304035" fillOpacity={0.45}
              >
                {d.mois}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#304035] text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 40, transform: 'translateX(-50%)' }}
        >
          <span className="font-bold">{tooltip.label}</span> — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tooltip.val)}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<PeriodKey>('tout');
  const [showMissingPopup, setShowMissingPopup] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const payments = useFacturationStore(s => s.payments);
  const intervenants = useIntervenantStore(s => s.intervenants);
  const stockItems = useStockStore(s => s.stockItems);
  // Confirmations are nested inside dossiersSignes, flatten them
  const confirmations = useMemo(
    () => dossiersSignes.flatMap(d => (d.confirmations ?? []).map(c => ({ ...c, dossierId: d.id }))),
    [dossiersSignes]
  );
  // beforeVentes = devis linked to dossiers
  const devis = useFacturationStore(s => s.devis);
  const beforeVentes = useMemo(
    () => devis.filter(d => d.dossierId),
    [devis]
  );

  // ── Filtrage par période ──────────────────────────────────────────────────
  const filteredInvoices = useMemo(
    () => invoices.filter(i => isInPeriod(i.date, period)),
    [invoices, period]
  );
  const filteredPayments = useMemo(
    () => payments.filter(p => isInPeriod(p.date, period)),
    [payments, period]
  );
  const filteredDossiers = useMemo(
    () => dossiers.filter(d => isInPeriod(d.createdAt, period)),
    [dossiers, period]
  );
  const filteredSignes = useMemo(
    () => dossiersSignes.filter(d => isInPeriod(d.signedDate, period)),
    [dossiersSignes, period]
  );

  // ── CA ────────────────────────────────────────────────────────────────────
  const caTTC = filteredInvoices
    .filter(i => i.statut === 'PAYÉE' && i.montantHT > 0)
    .reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);
  const caHT = filteredInvoices
    .filter(i => i.statut === 'PAYÉE' && i.montantHT > 0)
    .reduce((s, i) => s + i.montantHT, 0);
  const caRetard = filteredInvoices
    .filter(i => i.statut === 'RETARD')
    .reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);

  // ── Dossiers ──────────────────────────────────────────────────────────────
  const totalDossiers = filteredDossiers.length + filteredSignes.length;
  const urgents = filteredDossiers.filter(d => d.status === 'URGENT').length;
  const tauxConv = totalDossiers > 0 ? Math.round((filteredSignes.length / totalDossiers) * 100) : 0;

  // ── Factures ──────────────────────────────────────────────────────────────
  const factures = filteredInvoices.length;
  const facturesPayees = filteredInvoices.filter(i => i.statut === 'PAYÉE').length;
  const tauxPaie = factures > 0 ? Math.round((facturesPayees / factures) * 100) : 0;

  // ── Stock ─────────────────────────────────────────────────────────────────
  const stockRupture = stockItems.filter(i => i.dot === 'red').length;
  const stockDispo = stockItems.filter(i => i.dot === 'green').length;

  // ── Paiements ─────────────────────────────────────────────────────────────
  const enAttente = filteredPayments
    .filter(p => p.statut === 'EN ATTENTE')
    .reduce((s, p) => s + p.amount, 0);

  // ── Répartition statuts dossiers ──────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  filteredDossiers.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1; });

  // ── Catégories stock ──────────────────────────────────────────────────────
  const catCounts: Record<string, number> = {};
  stockItems.forEach(i => { catCounts[i.category] = (catCounts[i.category] ?? 0) + 1; });
  const totalStock = stockItems.length || 1;

  // ── Top clients ───────────────────────────────────────────────────────────
  const clientCA: Record<string, number> = {};
  filteredInvoices
    .filter(i => i.statut === 'PAYÉE')
    .forEach(i => { clientCA[i.client] = (clientCA[i.client] ?? 0) + i.montantHT * (1 + i.tva / 100); });
  const topClients = Object.entries(clientCA)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // ── Graphique CA mensuel ──────────────────────────────────────────────────
  const caParMois = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const data = MOIS.map((mois, idx) => {
      const ca = invoices
        .filter(i => {
          const d = new Date(i.date);
          return d.getFullYear() === year && d.getMonth() === idx && i.statut === 'PAYÉE';
        })
        .reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);
      return { mois, ca: Math.round(ca) };
    });
    return data;
  }, [invoices]);

  // ── Score santé ───────────────────────────────────────────────────────────
  const health = getHealthScore(tauxConv, tauxPaie, caRetard, caTTC, filteredInvoices.length > 0);

  // ── Trend calculé réel ────────────────────────────────────────────────────
  // Comparaison avec la période précédente (approximative)
  const prevInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter(i => {
      const d = new Date(i.date);
      if (period === 'mois') {
        const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === pm && d.getFullYear() === py;
      }
      if (period === 'annee') return d.getFullYear() === now.getFullYear() - 1;
      return false;
    });
  }, [invoices, period]);

  const prevCA = prevInvoices
    .filter(i => i.statut === 'PAYÉE')
    .reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);

  const caTrend = period !== 'tout' && prevCA > 0
    ? Math.round(((caTTC - prevCA) / prevCA) * 100)
    : undefined;

  // ── État vide ─────────────────────────────────────────────────────────────
  const isEmpty = invoices.length === 0 && dossiers.length === 0;

  // ── Détection des statistiques manquants ────────────────────────────────
  const missingStats = useMemo(
    () => DetectMissingStats({ dossiers: [...dossiers, ...dossiersSignes], confirmations }).filter(m => m.hasMissing),
    [dossiers, dossiersSignes, confirmations]
  );

  // ── Stats par statut (VENDU/EN COURS/PERDU) ─────────────────────────────
  const statsByStatus = useMemo(() => {
    const stats: Record<string, { count: number; achatHT: number; venteHT: number }> = {
      'VENDU': { count: 0, achatHT: 0, venteHT: 0 },
      'EN COURS': { count: 0, achatHT: 0, venteHT: 0 },
      'PERDU': { count: 0, achatHT: 0, venteHT: 0 }
    };

    // Compter les dossiers signés comme "VENDU"
    stats['VENDU'].count = dossiersSignes.length;
    dossiersSignes.forEach(d => {
      const confirms = (d.confirmations ?? []).filter(c => c.validee);
      confirms.forEach(c => {
        stats['VENDU'].achatHT += c.montant || 0;
      });
    });

    // Compter les dossiers actifs comme "EN COURS"
    stats['EN COURS'].count = filteredDossiers.length;

    return stats;
  }, [dossiers, dossiersSignes, filteredDossiers, confirmations]);

  // ─────────────────────────────────────────────────────────────────────────

  const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
    { key: 'mois', label: 'Ce mois' },
    { key: 'trimestre', label: 'Trimestre' },
    { key: 'annee', label: 'Cette année' },
    { key: 'tout', label: 'Tout' },
  ];

  const DOSSIER_COLORS: Record<string, string> = {
    URGENT: 'bg-red-500',
    'EN COURS': 'bg-blue-500',
    FINITION: 'bg-amber-500',
    'A VALIDER': 'bg-emerald-500',
  };

  const FACTURE_COLORS: Record<string, string> = {
    PAYÉE: 'bg-emerald-500',
    'EN ATTENTE': 'bg-blue-500',
    ACOMPTE: 'bg-amber-500',
    RETARD: 'bg-red-500',
    AVOIR: 'bg-purple-500',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Popups ──────────────────────────────────────────────────────── */}
      <MissingStatsPopup
        isOpen={showMissingPopup}
        onClose={() => setShowMissingPopup(false)}
        missing={missingStats}
        onComplete={(dossierId) => {
          // Navigate to dossier detail to complete stats
          window.location.href = `/dossiers/${dossierId}`;
        }}
      />
      <DossierDetailPopup
        isOpen={showDetailPopup}
        onClose={() => setShowDetailPopup(false)}
        dossier={selectedDossier}
        beforeVentes={beforeVentes}
        confirmations={confirmations}
      />

      {/* ── Header + filtres ────────────────────────────────────────────── */}
      <PageHeader
        icon={<BarChart3 className="h-7 w-7" />}
        title="Statistiques"
        subtitle="Vue d'ensemble de l'activité"
        actions={
          <div className="flex items-center gap-1 bg-white/15 border border-white/20 rounded-xl p-1 shadow-sm">
            <Calendar className="h-4 w-4 text-white/40 ml-2" />
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${period === opt.key
                    ? 'bg-white/25 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Alerte ruptures de stock ─────────────────────────────────────── */}
      {stockRupture > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700">
            {stockRupture} article{stockRupture > 1 ? 's' : ''} en rupture de stock —{' '}
            <a href="/stock" className="underline underline-offset-2">Voir le stock</a>
          </p>
        </div>
      )}

      {/* ── Alerte statistiques manquants ────────────────────────────────── */}
      {missingStats.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              {missingStats.length} dossier{missingStats.length > 1 ? 's' : ''} avec statistiques manquantes
            </p>
          </div>
          <button
            onClick={() => setShowMissingPopup(true)}
            className="px-3 py-1.5 bg-[#304035] text-white text-xs font-medium rounded-lg hover:bg-[#304035]/90 transition-colors"
          >
            Compléter
          </button>
        </div>
      )}

      {/* ── Score santé business ─────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${health ? health.bg : 'bg-white'} border-[#304035]/8`}>
        {!health ? (
          <div className="flex items-center gap-3">
            <div className="bg-[#304035]/5 rounded-xl p-2.5">
              <Activity className="h-6 w-6 text-[#304035]/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#304035]/50 uppercase tracking-wide">Santé de l'activité</p>
              <p className="text-sm text-[#304035]/40 mt-0.5">Aucune donnée sur cette période</p>
            </div>
          </div>
        ) : (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white/60 rounded-xl p-2.5">
              <Activity className={`h-6 w-6 ${health.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#304035]/50 uppercase tracking-wide">Santé de l'activité</p>
              <p className={`text-xl font-bold ${health.color}`}>{health.label}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs text-[#304035]/50 mb-1">
              <span>Score global</span>
              <span className="font-bold">{health.pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/50 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${health.bar}`} style={{ width: `${health.pct}%` }} />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className={`font-bold ${health.color}`}>{tauxConv}%</p>
              <p className="text-[#304035]/50 text-xs">Conversion</p>
            </div>
            <div className="text-center">
              <p className={`font-bold ${tauxPaie >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{tauxPaie}%</p>
              <p className="text-[#304035]/50 text-xs">Paiement</p>
            </div>
            <div className="text-center">
              <p className={`font-bold ${caRetard === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(caRetard)}</p>
              <p className="text-[#304035]/50 text-xs">Retard</p>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ── État vide ────────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="rounded-2xl bg-white border border-[#304035]/8 p-10 text-center shadow-sm">
          <BarChart2 className="h-12 w-12 text-[#304035]/20 mx-auto mb-3" />
          <h3 className="font-bold text-[#304035] text-lg">Aucune donnée pour l'instant</h3>
          <p className="text-sm text-[#304035]/50 mt-1 max-w-sm mx-auto">
            Commencez par créer vos premiers dossiers et factures pour voir vos statistiques apparaître ici.
          </p>
          <button
            onClick={() => window.location.href = '/dossiers'}
            className="mt-4 px-5 py-2 bg-[#304035] text-white rounded-xl text-sm font-medium hover:bg-[#304035]/90 transition-colors"
          >
            Créer mon premier dossier
          </button>
        </div>
      )}

      {/* ── KPIs ligne 1 ────────────────────────────────────────────────── */}
      {!isEmpty && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="CA TTC encaissé"
              value={fmt(caTTC)}
              sub={`${fmt(caHT)} HT`}
              icon={<Euro className="h-5 w-5 text-emerald-600" />}
              color="bg-emerald-50"
              trend={caTrend}
              href="/facturation"
            />
            <StatCard
              label="Dossiers actifs"
              value={String(filteredDossiers.length)}
              sub={`${urgents} urgent(s)`}
              icon={<FolderOpen className="h-5 w-5 text-blue-600" />}
              color="bg-blue-50"
              href="/dossiers"
            />
            <StatCard
              label="Taux de conversion"
              value={`${tauxConv}%`}
              sub={`${filteredSignes.length} signés / ${totalDossiers} total`}
              icon={<TrendingUp className="h-5 w-5 text-violet-600" />}
              color="bg-violet-50"
              href="/dossiers-signes"
            />
            <StatCard
              label="Paiements en attente"
              value={fmt(enAttente)}
              sub={caRetard > 0 ? `${fmt(caRetard)} en retard` : 'Aucun retard'}
              icon={<CreditCard className="h-5 w-5 text-orange-600" />}
              color={caRetard > 0 ? 'bg-red-50' : 'bg-orange-50'}
              alert={caRetard > 0}
              href="/facturation"
            />
          </div>

          {/* ── KPIs ligne 2 ── */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Intervenants"
              value={String(intervenants.length)}
              sub="Sous-traitants actifs"
              icon={<Users className="h-5 w-5 text-teal-600" />}
              color="bg-teal-50"
              href="/intervenants"
            />
            <StatCard
              label="Articles en stock"
              value={String(stockItems.length)}
              sub={`${stockDispo} dispo · ${stockRupture} rupture(s)`}
              icon={<Package className="h-5 w-5 text-indigo-600" />}
              color={stockRupture > 0 ? 'bg-red-50' : 'bg-indigo-50'}
              alert={stockRupture > 0}
              href="/stock"
            />
            <StatCard
              label="Taux de paiement"
              value={`${tauxPaie}%`}
              sub={`${facturesPayees} / ${factures} factures payées`}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              color="bg-emerald-50"
              href="/facturation"
            />
            <StatCard
              label="Dossiers signés"
              value={String(filteredSignes.length)}
              sub={`sur ${totalDossiers} total`}
              icon={<Zap className="h-5 w-5 text-amber-600" />}
              color="bg-amber-50"
              href="/dossiers-signes"
            />
          </div>

          {/* ── Graphique CA mensuel ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#304035]">Évolution du CA mensuel</h2>
                <p className="text-xs text-[#304035]/50 mt-0.5">Chiffre d'affaires TTC encaissé — {new Date().getFullYear()}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>CA annuel</span>
              </div>
            </div>
            <CaChart data={caParMois} />
          </div>

          {/* ── Tableau statistiques par statut ──────────────────────────── */}
          <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
            <h2 className="text-base font-bold text-[#304035] mb-5">Synthèse par statut</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#304035]/10">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Doss.</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Achat HT</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Vente HT</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Marge HT</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#304035]/60 uppercase">Marge %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsByStatus).map(([status, data]) => {
                    const margeHT = data.venteHT - data.achatHT;
                    const margePct = data.venteHT > 0 ? Math.round((margeHT / data.venteHT) * 100) : 0;
                    const statusColor = status === 'VENDU' ? 'text-emerald-600' : status === 'EN COURS' ? 'text-blue-600' : 'text-red-600';

                    return (
                      <tr key={status} className="border-b border-[#304035]/5 hover:bg-[#304035]/3 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[#304035]">
                          <span className={`inline-flex items-center gap-2 ${statusColor}`}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status === 'VENDU' ? '#059669' : status === 'EN COURS' ? '#2563eb' : '#dc2626' }} />
                            {status}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-sm font-bold text-[#304035]">{data.count}</td>
                        <td className="text-right px-4 py-3 text-sm text-[#304035]/70">{fmt(data.achatHT)}</td>
                        <td className="text-right px-4 py-3 text-sm text-[#304035]/70">{fmt(data.venteHT)}</td>
                        <td className="text-right px-4 py-3 text-sm font-bold" style={{ color: margeHT >= 0 ? '#059669' : '#dc2626' }}>{fmt(margeHT)}</td>
                        <td className="text-right px-4 py-3 text-sm font-bold" style={{ color: margePct >= 0 ? '#059669' : '#dc2626' }}>{margePct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Distribution pie chart ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#304035]">Distribution des dossiers</h2>
                <p className="text-xs text-[#304035]/40 mt-0.5">Par statut</p>
              </div>
            </div>
            <PieChart
              data={[
                { label: 'Vendus', value: statsByStatus['VENDU'].count, color: '#059669' },
                { label: 'En cours', value: statsByStatus['EN COURS'].count, color: '#2563eb' },
                { label: 'Perdus', value: statsByStatus['PERDU'].count, color: '#dc2626' }
              ]}
            />
          </div>

          {/* ── Répartitions ────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
              <h2 className="text-base font-bold text-[#304035] mb-1">Répartition des dossiers</h2>
              <p className="text-xs text-[#304035]/40 mb-4">{filteredDossiers.length} dossier(s) actif(s)</p>
              <div className="space-y-4">
                {Object.keys(DOSSIER_COLORS).map(status => {
                  const count = statusCounts[status] ?? 0;
                  return (
                    <ProgressRow
                      key={status}
                      label={status}
                      count={count}
                      total={filteredDossiers.length}
                      colorClass={DOSSIER_COLORS[status]}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
              <h2 className="text-base font-bold text-[#304035] mb-1">Répartition des factures</h2>
              <p className="text-xs text-[#304035]/40 mb-4">{factures} facture(s) au total</p>
              <div className="space-y-4">
                {(Object.keys(FACTURE_COLORS) as Array<keyof typeof FACTURE_COLORS>).map(s => {
                  const count = filteredInvoices.filter(i => i.statut === s).length;
                  return (
                    <ProgressRow
                      key={s}
                      label={s}
                      count={count}
                      total={factures}
                      colorClass={FACTURE_COLORS[s]}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Top clients + Stock ──────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Top 3 clients */}
            <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
              <h2 className="text-base font-bold text-[#304035] mb-1">Top clients</h2>
              <p className="text-xs text-[#304035]/40 mb-4">Par CA TTC encaissé</p>
              {topClients.length === 0 ? (
                <p className="text-sm text-[#304035]/40 text-center py-6">Aucune facture payée sur cette période</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map(([client, ca], idx) => (
                    <div key={client} className="flex items-center gap-3">
                      <div className={`rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0
                        ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#304035] truncate">{client}</p>
                        <div className="h-1.5 rounded-full bg-[#304035]/8 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : 'bg-orange-300'}`}
                            style={{ width: `${topClients[0][1] > 0 ? Math.round((ca / topClients[0][1]) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#304035] shrink-0">{fmt(ca)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock par catégorie */}
            <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 p-6">
              <h2 className="text-base font-bold text-[#304035] mb-1">Stock par catégorie</h2>
              <p className="text-xs text-[#304035]/40 mb-4">{stockItems.length} article(s) au total</p>
              <div className="space-y-3">
                {Object.entries(catCounts).map(([cat, count]) => (
                  <ProgressRow
                    key={cat}
                    label={cat}
                    count={count}
                    total={totalStock}
                    colorClass="bg-indigo-500"
                  />
                ))}
              </div>
              {Object.keys(catCounts).length === 0 && (
                <p className="text-sm text-[#304035]/40 text-center py-4">Aucun article en stock</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
