'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen, FileText, ImageIcon, Ruler, CheckCircle, ArrowLeft,
  GitCompare, AlertTriangle, Plus, ChevronRight, Tag, Phone, Mail,
  MapPin, Calendar, Receipt, FileCheck, StickyNote, Pencil, X,
  Clock, Circle, TrendingUp, Zap
} from 'lucide-react';
import { useDossierStore, useFacturationStore } from '@/store';

/* ── CONFIG STATUT ── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow: string; dot: string; Icon: React.ElementType }> = {
  'URGENT':    { label: 'URGENT',    bg: '#ef4444', text: 'white', border: '#fca5a5', glow: 'rgba(239,68,68,0.3)',    dot: '#ef4444', Icon: AlertTriangle },
  'EN COURS':  { label: 'EN COURS',  bg: '#f97316', text: 'white', border: '#fdba74', glow: 'rgba(249,115,22,0.3)',   dot: '#f97316', Icon: Clock },
  'FINITION':  { label: 'FINITION',  bg: '#10b981', text: 'white', border: '#6ee7b7', glow: 'rgba(16,185,129,0.3)',   dot: '#10b981', Icon: CheckCircle },
  'A VALIDER': { label: 'À VALIDER', bg: '#4ade80', text: 'white', border: '#bbf7d0', glow: 'rgba(74,222,128,0.3)',   dot: '#4ade80', Icon: Circle },
};
const STATUS_ORDER = ['URGENT', 'EN COURS', 'FINITION', 'A VALIDER'];
const PROGRESS_MAP: Record<string, number> = { 'URGENT': 15, 'EN COURS': 50, 'FINITION': 80, 'A VALIDER': 95 };

/* ── ÉTAPES PROGRESSION ── */
const STEPS = [
  { key: 'renseignement', label: 'Renseignement', statuses: ['URGENT'] },
  { key: 'en_cours',      label: 'En cours',       statuses: ['EN COURS'] },
  { key: 'finition',      label: 'Finition',        statuses: ['FINITION'] },
  { key: 'validation',    label: 'Validation',      statuses: ['A VALIDER'] },
];

function avatarColor(name: string) {
  const palettes = [
    ['#2d5a30', '#4aa350'], ['#7c3a1e', '#c08a5a'],
    ['#1e3a5f', '#4a7ec0'], ['#5a2d5a', '#c04aa3'],
    ['#3a4a1e', '#7ec04a'], ['#1a4a4a', '#4ac0c0'],
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

const getIconForType = (type?: string) => {
  switch (type) {
    case 'photo':    return <ImageIcon className="h-4 w-4" />;
    case 'measure':  return <Ruler className="h-4 w-4" />;
    case 'project':  return <FileText className="h-4 w-4" />;
    case 'approval': return <CheckCircle className="h-4 w-4" />;
    default:         return <FileText className="h-4 w-4" />;
  }
};

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const dossiers          = useDossierStore(s => s.dossiers);
  const dossiersSignes    = useDossierStore(s => s.dossiersSignes);
  const allInvoices       = useFacturationStore(s => s.invoices);
  const dossier           = [...dossiers, ...dossiersSignes].find(d => d.id === id);
  const invoices          = allInvoices.filter(i => i.dossierId === id);
  const signerDossier     = useDossierStore(s => s.signerDossier);
  const updateDossierStatus = useDossierStore(s => s.updateDossierStatus);
  const addSubfolder      = useDossierStore(s => s.addSubfolder);
  const addInvoice        = useFacturationStore(s => s.addInvoice);

  const [showDevis,     setShowDevis]     = useState(false);
  const [showStatus,    setShowStatus]    = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderLabel, setNewFolderLabel] = useState('');
  const [devisObjet,    setDevisObjet]    = useState('');
  const [devisMontant,  setDevisMontant]  = useState('');
  const [devisTva,      setDevisTva]      = useState('20');
  const [notes,         setNotes]         = useState('');
  const [editingNotes,  setEditingNotes]  = useState(false);

  if (!dossier) {
    return (
      <div className="space-y-6 w-full">
        <Link href="/dossiers" className="inline-flex items-center gap-2 text-sm font-medium text-[#304035]/60 hover:text-[#304035] transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux dossiers
        </Link>
        <div className="rounded-2xl bg-white p-12 text-center shadow-md border border-[#304035]/8 w-full" style={{ minHeight: 300 }}>
          <FolderOpen className="h-16 w-16 text-[#304035]/20 mx-auto mb-4" />
          <p className="text-[#304035]/60 font-medium">Dossier introuvable</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[dossier.status] ?? STATUS_CONFIG['EN COURS'];
  const StatusIcon = cfg.Icon;
  const progress = PROGRESS_MAP[dossier.status] ?? 50;
  const [c1, c2] = avatarColor(dossier.name);
  const initials = `${dossier.name.charAt(0)}${dossier.firstName ? dossier.firstName.charAt(0) : ''}`.toUpperCase();
  const stepIdx = STATUS_ORDER.indexOf(dossier.status);
  const totalHT = invoices.reduce((s, i) => s + (i.montantHT > 0 ? i.montantHT : 0), 0);

  const handleSigner = () => { signerDossier(id); router.push('/dossiers-signes'); };
  const handleAddFolder = () => {
    if (!newFolderLabel.trim()) return;
    addSubfolder(id, newFolderLabel.trim());
    setNewFolderLabel(''); setShowAddFolder(false);
  };

  return (
    <div className="w-full space-y-0">
      <style>{`
        @media (max-width: 768px) {
          .dos-detail-grid { grid-template-columns: 1fr !important; }
          .dos-detail-grid > .col-span-2,
          .dos-detail-grid > .col-span-1 { grid-column: span 1 !important; }
          .dos-sub-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HEADER WAHOU — fond texturé vert
      ══════════════════════════════════════════ */}
      <div className="dossier-header relative rounded-2xl overflow-hidden mb-5" style={{ minHeight: 200 }}>
        {/* SVG background identique à la sidebar */}
        <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <defs>
            <linearGradient id="dhGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#567060"/>
              <stop offset="50%"  stopColor="#4A6358"/>
              <stop offset="100%" stopColor="#334840"/>
            </linearGradient>
            <filter id="dhGrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
              <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
              <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended"/>
              <feComposite in="blended" in2="SourceGraphic" operator="in"/>
            </filter>
          </defs>
          <rect width="1200" height="200" fill="#304035"/>
          {/* Motif cercles décoratifs */}
          <circle cx="950" cy="100" r="180" fill="white" fillOpacity="0.03"/>
          <circle cx="1100" cy="20"  r="120" fill="white" fillOpacity="0.04"/>
          <circle cx="80"   cy="160" r="100" fill="white" fillOpacity="0.03"/>
        </svg>

        {/* Contenu du header */}
        <div className="relative z-10 flex items-center gap-6 px-8 py-6">
          {/* Avatar grand format */}
          <div className="dossier-avatar relative shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl select-none shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.15)` }}>
              {initials}
            </div>
            {/* Badge statut sur l'avatar */}
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-lg"
              style={{ background: cfg.bg, color: cfg.text, boxShadow: `0 0 0 2px white` }}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </div>
          </div>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">
              {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {dossier.createdAt && (
                <span className="flex items-center gap-1.5 text-white/55 text-xs">
                  <Calendar className="h-3 w-3" /> Créé le {dossier.createdAt}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-white/55 text-xs">
                <FolderOpen className="h-3 w-3" /> {dossier.subfolders.length} éléments
              </span>
              {dossier.postalCode && (
                <span className="flex items-center gap-1.5 text-white/55 text-xs">
                  <MapPin className="h-3 w-3" /> {dossier.postalCode}
                </span>
              )}
            </div>

            {/* Barre de progression par étapes */}
            <div className="mt-4 flex items-center gap-0">
              {STEPS.map((step, i) => {
                const done    = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`step-done w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-md transition-all`}
                        style={{
                          animationDelay: `${0.3 + i * 0.08}s`,
                          background: done ? 'white' : 'rgba(255,255,255,0.15)',
                          color: done ? c1 : 'rgba(255,255,255,0.4)',
                          boxShadow: current ? `0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2)` : 'none',
                          transform: current ? 'scale(1.15)' : 'scale(1)',
                        }}>
                        {done && i < stepIdx ? '✓' : i + 1}
                      </div>
                      <span className="text-[9px] font-semibold mt-1 whitespace-nowrap"
                        style={{ color: done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 rounded-full"
                        style={{ background: i < stepIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions header */}
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setShowStatus(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              <Tag className="h-3.5 w-3.5" />
              Changer statut
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
              <GitCompare className="h-3.5 w-3.5" />
              Comparer
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LAYOUT 2 COLONNES
      ══════════════════════════════════════════ */}
      <div className="dos-detail-grid grid grid-cols-3 gap-4">

        {/* ── COLONNE GAUCHE (2/3) — dossiers & fichiers ── */}
        <div className="col-span-2 col-left space-y-4">

          {/* Section fichiers */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#304035]/5 rounded-xl">
                  <FolderOpen className="h-4 w-4 text-[#304035]" />
                </div>
                <h2 className="text-sm font-bold text-[#304035]">Dossiers & fichiers</h2>
              </div>
              <button
                onClick={() => setShowAddFolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a67749]/10 text-[#a67749] text-xs font-bold hover:bg-[#a67749]/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>
            <div className="divide-y divide-[#304035]/5">
              {dossier.subfolders.map((sf, i) => (
                <button key={i}
                  className="subfolder-row flex w-full items-center gap-4 px-5 py-4 text-left transition-all border-l-4 border-l-transparent hover:border-l-[#a67749]"
                >
                  <div className="p-2 bg-[#304035]/5 rounded-xl text-[#a67749]/70 shrink-0">
                    {getIconForType(sf.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[#304035] text-sm block truncate">{sf.label}</span>
                    {sf.date && <span className="text-xs text-[#304035]/40 mt-0.5 block">{sf.date}</span>}
                  </div>
                  {sf.alert && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-orange-600">Alerte</span>
                    </div>
                  )}
                  <ChevronRight className="sf-arrow h-4 w-4 text-[#304035]/25 shrink-0" />
                </button>
              ))}
              {dossier.subfolders.length === 0 && (
                <div className="px-5 py-10 text-center text-[#304035]/40 text-sm">
                  Aucun fichier — commencez par créer un devis
                </div>
              )}
            </div>
          </div>

          {/* Section factures liées */}
          {invoices.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-bold text-[#304035]">Factures liées</h2>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT)} HT
                </span>
              </div>
              <div className="divide-y divide-[#304035]/5">
                {invoices.map(inv => {
                  const statutColors: Record<string, string> = {
                    'PAYÉE': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'EN ATTENTE': 'bg-orange-50 text-orange-700 border-orange-200',
                    'RETARD': 'bg-red-50 text-red-700 border-red-200',
                    'ACOMPTE': 'bg-blue-50 text-blue-700 border-blue-200',
                    'AVOIR': 'bg-purple-50 text-purple-700 border-purple-200',
                  };
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#304035]">{inv.ref ?? inv.type}</p>
                        <p className="text-xs text-[#304035]/40">{inv.date}</p>
                      </div>
                      <span className="text-sm font-bold text-[#304035]">
                        {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(inv.montantHT)} HT
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statutColors[inv.statut] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {inv.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions principales */}
          <div className="dos-sub-grid-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDevis(true)}
              className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              <Plus className="h-4 w-4" />
              Créer un devis
            </button>
            <button
              onClick={handleSigner}
              className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'linear-gradient(135deg, #304035, #4a6358)', boxShadow: '0 4px 16px rgba(48,64,53,0.3)' }}
            >
              <FileCheck className="h-4 w-4" />
              Faire valider le projet
            </button>
          </div>
        </div>

        {/* ── COLONNE DROITE (1/3) — fiche client + actions ── */}
        <div className="col-span-1 col-right space-y-4">

          {/* Fiche client */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
            <div className="px-5 py-4 border-b border-[#304035]/5">
              <h2 className="text-sm font-bold text-[#304035]">Fiche client</h2>
            </div>
            <div className="p-5 space-y-3">
              {dossier.phone && (
                <a href={`tel:${dossier.phone}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3 hover:bg-[#304035]/8 transition-all group">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg">
                    <Phone className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035] font-medium group-hover:text-[#a67749] transition-colors">{dossier.phone}</span>
                </a>
              )}
              {dossier.email && (
                <a href={`mailto:${dossier.email}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3 hover:bg-[#304035]/8 transition-all group">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg">
                    <Mail className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035] font-medium truncate group-hover:text-[#a67749] transition-colors">{dossier.email}</span>
                </a>
              )}
              {dossier.address && (
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[#304035]/3">
                  <div className="p-1.5 bg-[#304035]/8 rounded-lg mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-[#304035]" />
                  </div>
                  <span className="text-sm text-[#304035]/70 leading-snug">{dossier.address}{dossier.postalCode ? `, ${dossier.postalCode}` : ''}</span>
                </div>
              )}
              {!dossier.phone && !dossier.email && !dossier.address && (
                <p className="text-xs text-[#304035]/30 text-center py-2">Aucune info de contact</p>
              )}
            </div>
          </div>

          {/* Progression */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#304035]">Progression</h2>
                <span className="text-sm font-black" style={{ color: cfg.bg }}>{progress}%</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="h-2 bg-[#304035]/8 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.bg }} />
                <span className="text-xs font-semibold" style={{ color: cfg.bg }}>{cfg.label}</span>
                <span className="text-xs text-[#304035]/40 ml-auto">{dossier.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Résumé financier */}
          {totalHT > 0 && (
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #304035, #4a6358)' }}>
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-white/70" />
                <h2 className="text-sm font-bold text-white">Finances</h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Montant HT</span>
                  <span className="text-base font-black text-white">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">TVA ({parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20}%)</span>
                  <span className="text-sm font-bold text-white/70">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT * ((parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20) / 100))}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Total TTC</span>
                  <span className="text-base font-black text-emerald-400">
                    {new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(totalHT * (1 + (parseFloat(String(dossier.tva ?? '20').replace(/[^0-9.]/g, '')) || 20) / 100))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes rapides */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#304035]/5">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-[#a67749]" />
                <h2 className="text-sm font-bold text-[#304035]">Notes</h2>
              </div>
              <button onClick={() => setEditingNotes(v => !v)}
                className="p-1.5 rounded-lg hover:bg-[#304035]/5 transition-all text-[#304035]/40 hover:text-[#304035]">
                {editingNotes ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="p-4">
              {editingNotes ? (
                <textarea
                  autoFocus
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ajouter une note sur ce dossier…"
                  rows={4}
                  className="w-full text-sm text-[#304035] placeholder:text-[#304035]/30 bg-[#304035]/3 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
                />
              ) : (
                <p className="text-sm text-[#304035]/50 min-h-[60px] leading-relaxed">
                  {notes || <span className="italic text-[#304035]/25">Aucune note — cliquez sur le crayon pour en ajouter</span>}
                </p>
              )}
            </div>
          </div>

          {/* Action rapide */}
          <button
            onClick={() => setShowDevis(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white text-sm transition-all hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #a67749, #c08a5a)', boxShadow: '0 4px 16px rgba(166,119,73,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            Action rapide
          </button>
        </div>
      </div>

      {/* ══ MODAL : Changement de Statut ══ */}
      {showStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10">
            <div className="flex items-center gap-3 mb-6">
              <Tag className="h-5 w-5 text-[#304035]" />
              <h3 className="text-xl font-bold text-[#304035]">Changer le statut</h3>
            </div>
            <div className="space-y-2">
              {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[string]][]).map(([s, c]) => {
                const Icon = c.Icon;
                const isActive = dossier.status === s;
                return (
                  <button key={s}
                    onClick={() => { updateDossierStatus(id, s as any); setShowStatus(false); }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-left transition-all"
                    style={isActive
                      ? { background: c.bg, color: c.text, boxShadow: `0 4px 12px ${c.glow}` }
                      : { background: '#f9f7f5', color: '#304035' }}>
                    <Icon className="h-4 w-4" style={{ color: isActive ? c.text : c.bg }} />
                    {isActive ? `✓ ${c.label} (actuel)` : c.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowStatus(false)}
              className="mt-5 w-full rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL : Ajout dossier ══ */}
      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10">
            <h3 className="text-xl font-bold text-[#304035] mb-5">Nouveau dossier</h3>
            <input autoFocus value={newFolderLabel}
              onChange={e => setNewFolderLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
              placeholder="RELEVE DE MESURES, PROJET VERSION 1..."
              className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-4 py-3 text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 mb-5" />
            <div className="flex gap-3">
              <button onClick={handleAddFolder} className="flex-1 rounded-xl bg-[#304035] py-3 font-bold text-white hover:bg-[#304035]/90 transition-colors">Ajouter</button>
              <button onClick={() => setShowAddFolder(false)} className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Créer un devis ══ */}
      {showDevis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-[#304035]/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>{initials}</div>
              <div>
                <h3 className="text-xl font-bold text-[#304035]">Créer un devis</h3>
                <p className="text-xs text-[#304035]/50">Pour {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}</p>
              </div>
            </div>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">Objet du devis</label>
                <input value={devisObjet} onChange={e => setDevisObjet(e.target.value)}
                  className="w-full rounded-xl border border-[#304035]/15 px-4 py-3 text-sm text-[#304035] placeholder-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  placeholder="Cuisine complète, salle de bain..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">Montant HT (€)</label>
                  <input type="number" value={devisMontant} onChange={e => setDevisMontant(e.target.value)}
                    className="w-full rounded-xl border border-[#304035]/15 px-4 py-3 text-sm text-[#304035] placeholder-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                    placeholder="15 000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#304035]/60 uppercase tracking-wider mb-1.5">TVA (%)</label>
                  <div className="flex gap-1">
                    {['5.5','10','20'].map(t => (
                      <button key={t} type="button" onClick={() => setDevisTva(t)}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${devisTva === t ? 'bg-[#304035] text-white border-[#304035]' : 'bg-white text-[#304035]/60 border-[#304035]/12'}`}>
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {devisMontant && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-600">Total TTC</span>
                  <span className="text-base font-black text-emerald-700">
                    {new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(parseFloat(devisMontant) * (1 + parseFloat(devisTva)/100))}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  if (devisObjet) {
                    addSubfolder(id, `DEVIS — ${devisObjet}`);
                    if (devisMontant) addInvoice({ dossierId: id, client: dossier.name, date: new Date().toLocaleDateString('fr-FR'), montantHT: parseFloat(devisMontant), tva: parseFloat(devisTva) || 20, statut: 'EN ATTENTE', type: 'Facture' });
                  }
                  setShowDevis(false); setDevisObjet(''); setDevisMontant(''); setDevisTva('20');
                }}
                className="flex-1 rounded-xl py-3 font-bold text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #304035, #4a6358)' }}>
                Créer le devis
              </button>
              <button onClick={() => setShowDevis(false)}
                className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-medium text-[#304035] hover:bg-[#f5eee8] transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
