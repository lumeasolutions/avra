'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Settings, Building2, Package, FileText, FolderX, Bell,
  ChevronRight, Save, Plus, Trash2, X, Crown, Eye, EyeOff, Check,
  Hash, Banknote, SlidersHorizontal, RefreshCw, Download, Upload,
  AlertTriangle, Shield, Percent, UserCheck, Users, TrendingUp, Sparkles,
  Bot, Brain, Mic, MessageSquare, Database, Zap,
} from 'lucide-react';
import type { Apporteur } from '@/store';
import { useConfigStore, useDossierStore, useFacturationStore, useHistoryStore, useStockStore } from '@/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Config sections ──────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'societe',        icon: Building2,         label: 'Coordonnées Société',      desc: 'Nom, adresse, SIRET, contact' },
  { id: 'facturation',    icon: Banknote,           label: 'Facturation & Paiement',   desc: 'IBAN, mentions légales, conditions' },
  { id: 'numerotation',   icon: Hash,               label: 'Numérotation',             desc: 'Préfixes factures, devis, avoirs' },
  { id: 'preferences',    icon: SlidersHorizontal,  label: 'Préférences',              desc: 'TVA, langue, format, affichage' },
  { id: 'commissions',    icon: Percent,            label: 'Apporteurs & Commissions', desc: 'Apporteurs d\'affaires, taux, calcul auto' },
  { id: 'equipe',         icon: Shield,             label: 'Équipe & Accès',           desc: 'Membres, rôles, invitations' },
  { id: 'relances',       icon: Bell,               label: 'Relances automatiques',    desc: 'Délais, fréquences et modèles SMS/email' },
  { id: 'notifications',  icon: Bell,               label: 'Notifications',            desc: 'Activer/désactiver chaque alerte' },
  { id: 'trames',         icon: FileText,           label: 'Trames & Documents',       desc: 'Modèles de documents personnalisés' },
  { id: 'produits',       icon: Package,            label: 'Catalogue Produits',       desc: 'Aperçu du catalogue (gérer dans Stock)' },
  { id: 'perdus',         icon: FolderX,            label: 'Dossiers perdus',          desc: 'Archive des dossiers non signés' },
  { id: 'export',         icon: Download,           label: 'Import / Export',          desc: 'Exporter vos données en CSV/JSON' },
  { id: 'ia',            icon: Sparkles,           label: 'Intelligence Artificielle', desc: 'Configurer l\'assistant et les modules IA' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-[#304035] text-white',
  VENDEUR: 'bg-[#a67749] text-white',
  POSEUR:  'bg-[#5b9bd5] text-white',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
        checked ? 'bg-[#304035]' : 'bg-[#304035]/20'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

// ─── Champ de formulaire ──────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', className = '', span2 = false, placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; className?: string; span2?: boolean; placeholder?: string;
}) {
  return (
    <div className={span2 ? 'lg:col-span-2' : ''}>
      <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 transition-shadow',
          className
        )}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 transition-shadow resize-none"
      />
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold text-white text-sm transition-all',
        saved ? 'bg-emerald-500' : 'bg-[#304035] hover:bg-[#304035]/90'
      )}
    >
      {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {saved ? 'Enregistré !' : 'Enregistrer'}
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ParametresPage() {
  // Store
  const societe             = useConfigStore(s => s.societe);
  const updateSociete       = useConfigStore(s => s.updateSociete);
  const relanceConfig       = useConfigStore(s => s.relanceConfig);
  const updateRelanceConfig = useConfigStore(s => s.updateRelanceConfig);
  const members             = useConfigStore(s => s.members);
  const addMember           = useConfigStore(s => s.addMember);
  const toggleMemberActive  = useConfigStore(s => s.toggleMemberActive);
  const removeMember        = useConfigStore(s => s.removeMember);
  const updateMemberRole    = useConfigStore(s => s.updateMemberRole);
  const dossiersPerdus      = useDossierStore(s => s.dossiersPerdus);
  const stockItems          = useStockStore(s => s.stockItems);
  const preferences         = useConfigStore(s => s.preferences) ?? { langue: 'fr', devise: 'EUR', tvaDefaut: 20, formatDate: 'dd/mm/yyyy', fuseauHoraire: 'Europe/Paris', modeCompact: false };
  const updatePreferences   = useConfigStore(s => s.updatePreferences);
  const numerotation        = useConfigStore(s => s.numerotation) ?? { prefixeFacture: 'F', prefixeDevis: 'D', prefixeAvoir: 'AV', prochainNumeroFacture: 1, prochainNumeroDevis: 1, anneeAutomatique: true };
  const updateNumerotation  = useConfigStore(s => s.updateNumerotation);
  const facturationConfig   = useConfigStore(s => s.facturationConfig) ?? { iban: '', bic: '', nomBanque: '', conditionsPaiement: '', mentionsLegales: '', penalitesRetard: '', escompte: '', tauxAcompte: 30 };
  const updateFacturationConfig = useConfigStore(s => s.updateFacturationConfig);
  const notifConfig         = useConfigStore(s => s.notifConfig) ?? { factureRetard: true, devisExpire: true, commandeAttente: true, planningRappel: true, nouveauDossier: false, paiementRecu: true, emailNotif: true, smsNotif: false };
  const updateNotifConfig   = useConfigStore(s => s.updateNotifConfig);
  const iaConfig            = useConfigStore(s => s.iaConfig);
  const updateIAConfig      = useConfigStore(s => s.updateIAConfig);
  const apporteurs          = useFacturationStore(s => s.apporteurs) ?? [];
  const addApporteur        = useFacturationStore(s => s.addApporteur);
  const updateApporteur     = useFacturationStore(s => s.updateApporteur);
  const deleteApporteur     = useFacturationStore(s => s.deleteApporteur);
  const toggleApporteurActif = useFacturationStore(s => s.toggleApporteurActif);
  const dossiers            = useDossierStore(s => s.dossiers);
  const dossiersSignes      = useDossierStore(s => s.dossiersSignes);
  const invoices            = useFacturationStore(s => s.invoices);
  const devis               = useFacturationStore(s => s.devis);

  // UI state
  const [active, setActive] = useState<string | null>(null);
  const [societeForm, setSocieteForm] = useState(societe);
  const [relanceForm, setRelanceForm] = useState(relanceConfig);
  const [prefForm, setPrefForm] = useState(preferences);
  const [numForm, setNumForm] = useState(numerotation);
  const [factForm, setFactForm] = useState(facturationConfig);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'VENDEUR' as 'ADMIN' | 'VENDEUR' | 'POSEUR', active: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Commissions state
  const [showAddApporteur, setShowAddApporteur] = useState(false);
  const [newApporteur, setNewApporteur] = useState<Omit<Apporteur, 'id' | 'dateAjout'>>({ nom: '', email: '', phone: '', tauxCommission: 5, actif: true, notes: '' });
  const [editApporteurId, setEditApporteurId] = useState<string | null>(null);
  const [iaForm, setIAForm] = useState(iaConfig);

  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le panneau ouvert
  useEffect(() => {
    if (active && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [active]);

  const flash = (key: string) => {
    setSavedMap(m => ({ ...m, [key]: true }));
    setTimeout(() => setSavedMap(m => ({ ...m, [key]: false })), 2000);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <PageHeader
        icon={<Settings className="h-7 w-7" />}
        title="Paramètres"
        subtitle="Configuration complète de votre espace AVRA"
      />

      {/* ── Grille des sections ── */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(active === s.id ? null : s.id)}
            className={cn(
              'flex items-center justify-between rounded-2xl p-4 text-left transition-all border',
              active === s.id
                ? 'bg-[#304035] border-[#304035] shadow-lg'
                : 'bg-white border-[#304035]/8 hover:border-[#304035]/25 hover:shadow-md shadow-sm'
            )}
          >
            <div className="flex items-center gap-3.5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active === s.id ? 'bg-white/20' : 'bg-[#304035]/8')}>
                <s.icon className={cn('h-5 w-5', active === s.id ? 'text-white' : 'text-[#304035]')} />
              </div>
              <div>
                <p className={cn('font-bold text-sm', active === s.id ? 'text-white' : 'text-[#304035]')}>{s.label}</p>
                <p className={cn('text-xs mt-0.5', active === s.id ? 'text-white/65' : 'text-[#304035]/45')}>{s.desc}</p>
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 transition-transform shrink-0', active === s.id ? 'text-white rotate-90' : 'text-[#304035]/25')} />
          </button>
        ))}
      </div>

      {/* Ref pour auto-scroll */}
      <div ref={panelRef} />

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : COORDONNÉES SOCIÉTÉ
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'societe' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-5">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Coordonnées Société
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Nom de la société"           span2 value={societeForm.nom}        onChange={v => setSocieteForm(p => ({ ...p, nom: v }))} />
            <Field label="Téléphone"                         value={societeForm.phone}      onChange={v => setSocieteForm(p => ({ ...p, phone: v }))} />
            <Field label="Email de contact"                  value={societeForm.email}      onChange={v => setSocieteForm(p => ({ ...p, email: v }))} type="email" />
            <Field label="Site web"                          value={societeForm.siteWeb}    onChange={v => setSocieteForm(p => ({ ...p, siteWeb: v }))} />
            <Field label="Adresse"                     span2 value={societeForm.adresse}    onChange={v => setSocieteForm(p => ({ ...p, adresse: v }))} />
            <Field label="Code postal"                       value={societeForm.codePostal} onChange={v => setSocieteForm(p => ({ ...p, codePostal: v }))} />
            <Field label="Ville"                             value={societeForm.ville}      onChange={v => setSocieteForm(p => ({ ...p, ville: v }))} />
            <Field label="SIRET"                             value={societeForm.siret}      onChange={v => setSocieteForm(p => ({ ...p, siret: v }))} />
            <Field label="N° TVA intracommunautaire"   span2 value={societeForm.tva}        onChange={v => setSocieteForm(p => ({ ...p, tva: v }))} />
          </div>
          {/* Logo upload */}
          <div>
            <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Logo société</label>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-[#304035]/8 flex items-center justify-center text-xs text-[#304035]/40 font-bold">
                {societeForm.nom.slice(0, 2).toUpperCase()}
              </div>
              <button className="flex items-center gap-2 rounded-xl border border-[#304035]/20 bg-white px-4 py-2 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors">
                <Upload className="h-3.5 w-3.5" /> Importer un logo
              </button>
              <span className="text-xs text-[#304035]/40">PNG ou SVG, max 1 Mo</span>
            </div>
          </div>
          <SaveButton saved={!!savedMap['societe']} onClick={() => { updateSociete(societeForm); flash('societe'); }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : FACTURATION & PAIEMENT
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'facturation' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Facturation & Paiement
          </h3>

          {/* RIB / IBAN */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Coordonnées bancaires</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="IBAN"      span2 value={factForm.iban}      onChange={v => setFactForm(p => ({ ...p, iban: v }))} />
              <Field label="BIC / SWIFT"    value={factForm.bic}       onChange={v => setFactForm(p => ({ ...p, bic: v }))} />
              <Field label="Nom de la banque" value={factForm.nomBanque} onChange={v => setFactForm(p => ({ ...p, nomBanque: v }))} />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Conditions & Termes</p>
            <div className="space-y-4">
              <Textarea label="Conditions de paiement par défaut"
                value={factForm.conditionsPaiement}
                onChange={v => setFactForm(p => ({ ...p, conditionsPaiement: v }))} rows={2} />
              <Textarea label="Mentions légales (apparaissent sur chaque document)"
                value={factForm.mentionsLegales}
                onChange={v => setFactForm(p => ({ ...p, mentionsLegales: v }))} rows={3} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="Pénalités de retard" value={factForm.penalitesRetard}
                  onChange={v => setFactForm(p => ({ ...p, penalitesRetard: v }))} />
                <Field label="Clause d'escompte"   value={factForm.escompte}
                  onChange={v => setFactForm(p => ({ ...p, escompte: v }))} />
              </div>
            </div>
          </div>

          {/* Taux acompte */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Taux acompte par défaut</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 w-40">
                <input
                  type="number" min={0} max={100}
                  value={factForm.tauxAcompte}
                  onChange={e => setFactForm(p => ({ ...p, tauxAcompte: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-transparent text-sm text-[#304035] focus:outline-none"
                />
                <span className="text-xs text-[#304035]/50 shrink-0">%</span>
              </div>
              <span className="text-xs text-[#304035]/50">Appliqué automatiquement à la création des devis</span>
            </div>
          </div>

          {/* ─── Facturation électronique Chorus Pro ──────────────────────────── */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Facturation électronique — Chorus Pro</p>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 mb-4 flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-xs font-bold text-blue-700 mb-0.5">Obligation légale à partir de 2026</p>
                <p className="text-xs text-blue-600 leading-relaxed">La facturation électronique (e-facture) devient obligatoire pour les entreprises assujetties à la TVA. Chorus Pro est la plateforme publique pour les factures avec les clients du secteur public.</p>
                <a href="https://www.chorus-pro.gouv.fr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline mt-1.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Accéder à Chorus Pro
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="SIRET (14 chiffres)" value={societeForm?.siret ?? ''} onChange={v => setSocieteForm(p => ({ ...p, siret: v }))} placeholder="00000000000000" />
                <Field label="N° TVA intracommunautaire" value={societeForm?.tva ?? ''} onChange={v => setSocieteForm(p => ({ ...p, tva: v }))} placeholder="FR00 000000000" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Statut conformité e-facture</label>
                  <div className="flex items-center gap-3 rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span className="text-sm text-[#304035]">En cours de mise en conformité</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Identifiant Chorus Pro</label>
                  <input
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                    placeholder="Numéro de service / structure"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Format de transmission</label>
                <div className="flex flex-wrap gap-2">
                  {['UBL 2.1', 'CII 2016B', 'Factur-X', 'PDF/A-3'].map(fmt => (
                    <label key={fmt} className="flex items-center gap-2 rounded-xl border border-[#304035]/15 bg-white px-3 py-2 cursor-pointer hover:border-[#304035]/30">
                      <input type="radio" name="efacture_format" defaultChecked={fmt === 'Factur-X'} className="accent-[#304035]" />
                      <span className="text-xs font-medium text-[#304035]">{fmt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-[#304035]/40 mt-2">Factur-X est recommandé — PDF enrichi d'un fichier XML structuré, compatible avec la plupart des PDP</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
                <svg className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-xs font-bold text-emerald-700 mb-0.5">Données légales détectées</p>
                  <p className="text-xs text-emerald-600">SIRET et N° TVA renseignés dans les Coordonnées Société. Vos factures incluent automatiquement ces informations.</p>
                </div>
              </div>
            </div>
          </div>

          <SaveButton saved={!!savedMap['facturation']} onClick={() => { updateFacturationConfig(factForm); flash('facturation'); }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : NUMÉROTATION
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'numerotation' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Hash className="h-5 w-5" /> Numérotation des documents
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Field label="Préfixe factures" value={numForm.prefixeFacture}
              onChange={v => setNumForm(p => ({ ...p, prefixeFacture: v }))} />
            <Field label="Préfixe devis"    value={numForm.prefixeDevis}
              onChange={v => setNumForm(p => ({ ...p, prefixeDevis: v }))} />
            <Field label="Préfixe avoirs"   value={numForm.prefixeAvoir}
              onChange={v => setNumForm(p => ({ ...p, prefixeAvoir: v }))} />
            <Field label="Prochain n° facture" value={numForm.prochainNumeroFacture} type="number"
              onChange={v => setNumForm(p => ({ ...p, prochainNumeroFacture: parseInt(v) || 1 }))} />
            <Field label="Prochain n° devis"   value={numForm.prochainNumeroDevis} type="number"
              onChange={v => setNumForm(p => ({ ...p, prochainNumeroDevis: parseInt(v) || 1 }))} />
          </div>

          {/* Aperçu */}
          <div className="rounded-xl bg-[#f5eee8]/60 border border-[#304035]/10 p-4">
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Aperçu de la numérotation</p>
            <div className="flex gap-6 flex-wrap">
              {[
                { label: 'Facture', ref: `${numForm.prefixeFacture}-${numForm.anneeAutomatique ? new Date().getFullYear() : '2026'}-${String(numForm.prochainNumeroFacture).padStart(3, '0')}` },
                { label: 'Devis',   ref: `${numForm.prefixeDevis}-${numForm.anneeAutomatique ? new Date().getFullYear() : '2026'}-${String(numForm.prochainNumeroDevis).padStart(3, '0')}` },
                { label: 'Avoir',   ref: `${numForm.prefixeAvoir}-${numForm.anneeAutomatique ? new Date().getFullYear() : '2026'}-001` },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px] text-[#304035]/50 mb-1">{item.label}</p>
                  <p className="font-mono font-bold text-[#304035] text-sm bg-white rounded-lg px-3 py-1.5 border border-[#304035]/10">{item.ref}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Année auto */}
          <div className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-3">
            <div>
              <p className="font-semibold text-[#304035] text-sm">Intégrer l'année automatiquement</p>
              <p className="text-xs text-[#304035]/50 mt-0.5">Ex : F-2026-043</p>
            </div>
            <Toggle checked={numForm.anneeAutomatique} onChange={v => setNumForm(p => ({ ...p, anneeAutomatique: v }))} />
          </div>

          <SaveButton saved={!!savedMap['numerotation']} onClick={() => { updateNumerotation(numForm); flash('numerotation'); }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : PRÉFÉRENCES
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'preferences' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" /> Préférences générales
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Langue */}
            <div>
              <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Langue</label>
              <select
                value={prefForm.langue}
                onChange={e => setPrefForm(p => ({ ...p, langue: e.target.value }))}
                className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Español</option>
              </select>
            </div>
            {/* Devise */}
            <div>
              <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Devise</label>
              <select
                value={prefForm.devise}
                onChange={e => setPrefForm(p => ({ ...p, devise: e.target.value }))}
                className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              >
                <option value="EUR">€ Euro (EUR)</option>
                <option value="CHF">₣ Franc suisse (CHF)</option>
                <option value="GBP">£ Livre sterling (GBP)</option>
                <option value="USD">$ Dollar US (USD)</option>
              </select>
            </div>
            {/* TVA par défaut */}
            <div>
              <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">TVA par défaut</label>
              <select
                value={prefForm.tvaDefaut}
                onChange={e => setPrefForm(p => ({ ...p, tvaDefaut: parseInt(e.target.value) }))}
                className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              >
                <option value={20}>20% — Taux normal</option>
                <option value={10}>10% — Taux intermédiaire</option>
                <option value={5.5}>5,5% — Taux réduit</option>
                <option value={0}>0% — Exonéré</option>
              </select>
            </div>
            {/* Format date */}
            <div>
              <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Format de date</label>
              <select
                value={prefForm.formatDate}
                onChange={e => setPrefForm(p => ({ ...p, formatDate: e.target.value }))}
                className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              >
                <option value="dd/mm/yyyy">JJ/MM/AAAA (27/03/2026)</option>
                <option value="mm/dd/yyyy">MM/JJ/AAAA (03/27/2026)</option>
                <option value="yyyy-mm-dd">AAAA-MM-JJ (2026-03-27)</option>
              </select>
            </div>
            {/* Fuseau horaire */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Fuseau horaire</label>
              <select
                value={prefForm.fuseauHoraire}
                onChange={e => setPrefForm(p => ({ ...p, fuseauHoraire: e.target.value }))}
                className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              >
                <option value="Europe/Paris">Europe/Paris (UTC+1 / UTC+2)</option>
                <option value="Europe/London">Europe/London (UTC+0 / UTC+1)</option>
                <option value="America/New_York">America/New_York (UTC-5 / UTC-4)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              </select>
            </div>
          </div>

          {/* Mode compact */}
          <div className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-3">
            <div>
              <p className="font-semibold text-[#304035] text-sm">Mode compact</p>
              <p className="text-xs text-[#304035]/50 mt-0.5">Réduire l'espacement dans les listes et tableaux</p>
            </div>
            <Toggle checked={prefForm.modeCompact} onChange={v => setPrefForm(p => ({ ...p, modeCompact: v }))} />
          </div>

          <SaveButton saved={!!savedMap['preferences']} onClick={() => { updatePreferences(prefForm); flash('preferences'); }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : APPORTEURS & COMMISSIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'commissions' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Percent className="h-5 w-5" /> Apporteurs d'affaires & Commissions
          </h3>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#304035]/4 border border-[#304035]/8 px-4 py-3">
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-1">Apporteurs actifs</p>
              <p className="text-2xl font-bold text-[#304035]">{apporteurs.filter(a => a.actif).length}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Taux moyen</p>
              <p className="text-2xl font-bold text-emerald-700">
                {apporteurs.length > 0 ? (apporteurs.reduce((s, a) => s + a.tauxCommission, 0) / apporteurs.length).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">CA signé (dossiers liés)</p>
              <p className="text-2xl font-bold text-amber-700">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
                  dossiersSignes.reduce((s, d) => s + (d.montant ?? 0), 0)
                )}
              </p>
            </div>
          </div>

          {/* Liste apporteurs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Liste des apporteurs</p>
              <button onClick={() => { setShowAddApporteur(true); setNewApporteur({ nom: '', email: '', phone: '', tauxCommission: 5, actif: true, notes: '' }); }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#a67749] hover:text-[#a67749]/80 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>

            {apporteurs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#304035]/20 py-8 text-center">
                <Users className="h-8 w-8 text-[#304035]/15 mx-auto mb-2" />
                <p className="text-sm text-[#304035]/40">Aucun apporteur d'affaires</p>
                <p className="text-xs text-[#304035]/25 mt-1">Ajoutez vos apporteurs pour calculer automatiquement les commissions</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#304035]/8 overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 px-4 py-2 bg-[#304035]/3 text-[10px] font-bold text-[#304035]/40 uppercase tracking-wider">
                  <span>Apporteur</span><span className="text-center">Taux</span><span className="text-center">Statut</span><span className="text-center">Commission*</span><span></span>
                </div>
                {apporteurs.map(a => {
                  const commEstimee = dossiersSignes.reduce((s, d) => s + (d.montant ?? 0), 0) * a.tauxCommission / 100 / apporteurs.filter(x => x.actif).length;
                  return (
                    <div key={a.id} className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 items-center px-4 py-3 border-t border-[#304035]/5 hover:bg-[#f5eee8]/30">
                      <div>
                        <p className="text-sm font-semibold text-[#304035]">{a.nom}</p>
                        {a.email && <p className="text-xs text-[#304035]/40">{a.email}</p>}
                        {a.notes && <p className="text-[10px] text-[#304035]/30 italic">{a.notes}</p>}
                      </div>
                      <div className="text-center">
                        {editApporteurId === a.id ? (
                          <input
                            type="number" min={0} max={100} step={0.5}
                            value={a.tauxCommission}
                            onChange={e => updateApporteur(a.id, { tauxCommission: parseFloat(e.target.value) || 0 })}
                            onBlur={() => setEditApporteurId(null)}
                            className="w-14 text-center rounded-lg border border-[#304035]/15 px-1 py-1 text-xs focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button onClick={() => setEditApporteurId(a.id)}
                            className="inline-flex items-center gap-0.5 text-sm font-bold text-[#304035] hover:text-[#a67749] transition-colors">
                            {a.tauxCommission}%
                          </button>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <button onClick={() => toggleApporteurActif(a.id)}
                          className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors', a.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                          {a.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                      <div className="text-center text-xs font-semibold text-[#a67749]">
                        {a.actif ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(commEstimee) : '—'}
                      </div>
                      <button onClick={() => deleteApporteur(a.id)}
                        className="rounded-lg p-1 hover:bg-red-50 text-[#304035]/20 hover:text-red-500 transition-colors justify-self-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-[#304035]/30 mt-2">* Estimation proportionnelle basée sur le CA total des dossiers signés</p>
          </div>

          {/* Formulaire ajout */}
          {showAddApporteur && (
            <div className="rounded-xl border border-[#a67749]/30 bg-[#a67749]/5 p-4 space-y-3">
              <p className="text-xs font-bold text-[#304035]/70">Nouvel apporteur d'affaires</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom / Société *" value={newApporteur.nom} onChange={v => setNewApporteur(p => ({ ...p, nom: v }))} />
                <Field label="Email" value={newApporteur.email ?? ''} onChange={v => setNewApporteur(p => ({ ...p, email: v }))} />
                <Field label="Téléphone" value={newApporteur.phone ?? ''} onChange={v => setNewApporteur(p => ({ ...p, phone: v }))} />
                <div>
                  <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Taux commission (%)</label>
                  <input type="number" min={0} max={100} step={0.5}
                    value={newApporteur.tauxCommission}
                    onChange={e => setNewApporteur(p => ({ ...p, tauxCommission: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  />
                </div>
                <div className="col-span-2">
                  <Field label="Notes (réseau, spécialité…)" value={newApporteur.notes ?? ''} onChange={v => setNewApporteur(p => ({ ...p, notes: v }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  if (newApporteur.nom.trim()) {
                    addApporteur(newApporteur);
                    setShowAddApporteur(false);
                  }
                }}
                  disabled={!newApporteur.nom.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#304035] text-white hover:bg-[#304035]/90 transition-colors disabled:opacity-40">
                  <UserCheck className="h-4 w-4" /> Ajouter
                </button>
                <button onClick={() => setShowAddApporteur(false)}
                  className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Tableau de calcul commissions par dossier */}
          {dossiersSignes.length > 0 && apporteurs.filter(a => a.actif).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Simulation de commissions — Dossiers signés
              </p>
              <div className="rounded-xl border border-[#304035]/8 overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_80px_100px] gap-2 px-4 py-2 bg-[#304035]/3 text-[10px] font-bold text-[#304035]/40 uppercase tracking-wider">
                  <span>Dossier</span><span className="text-right">CA signé</span><span className="text-center">Taux</span><span className="text-right">Commission</span>
                </div>
                {dossiersSignes.slice(0, 5).map(d => {
                  const ap = apporteurs.filter(a => a.actif)[0];
                  if (!ap) return null;
                  const ca = d.montant ?? 0;
                  const comm = ca * ap.tauxCommission / 100;
                  return (
                    <div key={d.id} className="grid grid-cols-[1fr_100px_80px_100px] gap-2 items-center px-4 py-2.5 border-t border-[#304035]/5 text-sm">
                      <span className="font-medium text-[#304035]">{d.name}</span>
                      <span className="text-right text-[#304035]/70">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ca)}</span>
                      <span className="text-center text-[#304035]/50">{ap.tauxCommission}%</span>
                      <span className="text-right font-bold text-[#a67749]">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(comm)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#304035]/30 mt-2">Simulation basée sur le 1er apporteur actif — Taux modifiable en cliquant dessus</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : ÉQUIPE & ACCÈS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'equipe' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          {/* Plan abonnement */}
          <div className="rounded-2xl bg-[#304035] p-5 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-[#a67749]" />
                  <p className="text-xs font-medium text-white/60">Plan actuel</p>
                </div>
                <p className="text-2xl font-bold">AVRA Pro</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Facturation mensuelle</p>
                <p className="text-xl font-bold">149€ <span className="text-sm font-normal text-white/60">HT/mois</span></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-white/15 pt-3">
              {['Modules complets', 'IA photo réalisme', 'Support prioritaire'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-white/75">
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" /> {f}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-white/45">
              <span>{members.filter(m => m.active).length} utilisateur(s) actif(s) · max 10</span>
              <span>Renouvellement le 01/04/2026</span>
            </div>
          </div>

          {/* Membres */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[#304035]">Membres de l'équipe</p>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#304035] px-3 py-2 text-xs font-bold text-white hover:bg-[#304035]/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Inviter un membre
              </button>
            </div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className={cn('flex items-center justify-between rounded-xl border px-4 py-3 transition-all', m.active ? 'bg-white border-[#304035]/10' : 'bg-[#304035]/4 border-[#304035]/5 opacity-60')}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#304035]/10 font-bold text-sm text-[#304035]">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#304035] text-sm">{m.name}</p>
                      <p className="text-xs text-[#304035]/50">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Rôle éditable */}
                    <select
                      value={m.role}
                      onChange={e => updateMemberRole(m.id, e.target.value as 'ADMIN' | 'VENDEUR' | 'POSEUR')}
                      className={cn('rounded-lg px-2 py-1 text-xs font-bold border-none cursor-pointer', ROLE_COLORS[m.role])}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="VENDEUR">VENDEUR</option>
                      <option value="POSEUR">POSEUR</option>
                    </select>
                    {/* Actif/inactif */}
                    <button
                      onClick={() => toggleMemberActive(m.id)}
                      title={m.active ? 'Désactiver' : 'Activer'}
                      className={cn('rounded-lg p-1.5 transition-colors', m.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-[#304035]/10 text-[#304035]/50 hover:bg-[#304035]/20')}
                    >
                      {m.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    {/* Supprimer */}
                    {m.role !== 'ADMIN' && (
                      <button
                        onClick={() => setDeleteConfirm(deleteConfirm === m.id ? null : m.id)}
                        className="rounded-lg p-1.5 bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Confirmation suppression */}
            {deleteConfirm && (
              <div className="mt-2 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between">
                <p className="text-sm text-red-700 font-medium">Supprimer ce membre définitivement ?</p>
                <div className="flex gap-2">
                  <button onClick={() => { removeMember(deleteConfirm); setDeleteConfirm(null); }}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">Confirmer</button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">Annuler</button>
                </div>
              </div>
            )}
          </div>

          {/* Modal ajouter membre */}
          {showAddMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#304035]/10">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-[#304035]">Inviter un membre</h4>
                  <button onClick={() => setShowAddMember(false)} className="text-[#304035]/40 hover:text-[#304035]"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nom complet"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                  <input value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemple.fr" type="email"
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                  <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value as 'VENDEUR' | 'POSEUR' | 'ADMIN' }))}
                    className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20">
                    <option value="VENDEUR">VENDEUR</option>
                    <option value="POSEUR">POSEUR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { if (newMember.name.trim() && newMember.email.trim()) { addMember(newMember); setNewMember({ name: '', email: '', role: 'VENDEUR', active: true }); setShowAddMember(false); } }}
                    disabled={!newMember.name.trim() || !newMember.email.trim()}
                    className="flex-1 rounded-xl bg-[#304035] py-2.5 font-bold text-sm text-white hover:bg-[#304035]/90 disabled:opacity-40">
                    Inviter
                  </button>
                  <button onClick={() => setShowAddMember(false)} className="flex-1 rounded-xl border border-[#304035]/20 py-2.5 text-sm text-[#304035]">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : RELANCES AUTOMATIQUES
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'relances' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Bell className="h-5 w-5" /> Relances automatiques
          </h3>

          {/* Délais */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Délais de relance (jours)</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { label: '1ère relance acompte', key: 'delaiAcompte' as const },
                { label: 'Relance solde',         key: 'delaiSolde' as const },
                { label: 'Relance retard',        key: 'delaiRetard' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={relanceForm[f.key]}
                      onChange={e => setRelanceForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20" />
                    <span className="text-xs text-[#304035]/50 shrink-0">j</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modèles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Modèles de messages</p>
              <span className="text-xs text-[#304035]/45 bg-[#f5eee8] rounded-lg px-2.5 py-1">
                Variables : <code className="font-mono">{'{client}'}</code> <code className="font-mono">{'{montant}'}</code> <code className="font-mono">{'{date}'}</code>
              </span>
            </div>
            {[
              { label: 'Message acompte', key: 'messageAcompte' as const },
              { label: 'Message solde',   key: 'messageSolde' as const },
              { label: 'Message retard',  key: 'messageRetard' as const },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-[#304035]/60 mb-1.5">{f.label}</label>
                <textarea value={relanceForm[f.key]}
                  onChange={e => setRelanceForm(p => ({ ...p, [f.key]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 resize-none" />
              </div>
            ))}
          </div>

          <SaveButton saved={!!savedMap['relances']} onClick={() => { updateRelanceConfig(relanceForm); flash('relances'); }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : NOTIFICATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'notifications' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-5">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </h3>

          <div className="space-y-2">
            {[
              { key: 'factureRetard'    as const, label: 'Facture en retard de paiement',     desc: 'Déclenche une alerte sur le tableau de bord' },
              { key: 'devisExpire'      as const, label: 'Devis expiré sans réponse',          desc: 'Après la date de validité' },
              { key: 'commandeAttente'  as const, label: 'Commande en attente de validation', desc: 'Nouvelles commandes non confirmées' },
              { key: 'planningRappel'   as const, label: 'Rappel planning (24h avant)',        desc: 'Rappel pour chaque événement' },
              { key: 'nouveauDossier'   as const, label: 'Nouveau dossier créé',              desc: 'Notifie tous les membres actifs' },
              { key: 'paiementRecu'     as const, label: 'Paiement reçu',                     desc: 'Confirmation d\'encaissement' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#304035] text-sm">{item.label}</p>
                  <p className="text-xs text-[#304035]/50 mt-0.5">{item.desc}</p>
                </div>
                <Toggle
                  checked={notifConfig[item.key]}
                  onChange={v => updateNotifConfig({ [item.key]: v })}
                />
              </div>
            ))}
          </div>

          {/* Canal */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Canal de notification</p>
            <div className="space-y-2">
              {[
                { key: 'emailNotif' as const, label: 'Notifications par email',    desc: `Envoi à ${societe.email}` },
                { key: 'smsNotif'   as const, label: 'Notifications par SMS',      desc: `Envoi au ${societe.phone}` },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#304035] text-sm">{item.label}</p>
                    <p className="text-xs text-[#304035]/50 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={notifConfig[item.key]} onChange={v => updateNotifConfig({ [item.key]: v })} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : TRAMES & DOCUMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'trames' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2 mb-5">
            <FileText className="h-5 w-5" /> Trames de documents
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Fiche dossier client',    desc: 'Modèle de fiche client complet',      color: 'border-blue-200 bg-blue-50',     icon: '📋' },
              { label: 'Devis standard',          desc: 'Template de devis personnalisable',   color: 'border-[#a67749]/30 bg-[#f5eee8]', icon: '📄' },
              { label: 'Bon de commande',         desc: 'Commande fournisseur',                color: 'border-emerald-200 bg-emerald-50', icon: '🛒' },
              { label: 'Compte rendu chantier',   desc: 'Rapport hebdomadaire de chantier',    color: 'border-purple-200 bg-purple-50', icon: '🏗️' },
              { label: 'Fiche de pose',           desc: 'Instructions pour le poseur',         color: 'border-orange-200 bg-orange-50', icon: '🔧' },
              { label: 'Réception de chantier',   desc: 'PV de réception finale',              color: 'border-green-200 bg-green-50',  icon: '✅' },
            ].map(t => (
              <div key={t.label} className={`rounded-xl border-2 p-4 ${t.color} hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="font-bold text-[#304035] text-sm">{t.label}</p>
                    <p className="text-xs text-[#304035]/60">{t.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg bg-white border border-[#304035]/20 py-1.5 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors">
                    Modifier
                  </button>
                  <button className="flex-1 rounded-lg bg-[#304035] py-1.5 text-xs font-bold text-white hover:bg-[#304035]/90 transition-colors">
                    Utiliser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : CATALOGUE PRODUITS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'produits' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
              <Package className="h-5 w-5" /> Catalogue produits
            </h3>
            <span className="text-xs text-[#304035]/50 bg-[#f5eee8] rounded-full px-3 py-1">{stockItems.length} article(s)</span>
          </div>
          <div className="space-y-1 mb-4">
            {stockItems.slice(0, 8).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 px-4 py-3 hover:bg-[#f5eee8] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', item.dot === 'green' ? 'bg-emerald-500' : item.dot === 'red' ? 'bg-red-500' : 'bg-orange-400')} />
                  <span className="font-semibold text-[#304035] text-sm">{item.supplier} — {item.model}</span>
                  <span className="text-xs text-[#304035]/45">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#304035]">{fmt(item.purchase)}</span>
                  {item.sale && <span className="ml-2 text-xs text-emerald-600 font-semibold">→ {fmt(item.sale)}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#304035]/40 text-center">
            Gérez l'intégralité de votre catalogue depuis la page <strong className="text-[#304035]/60">Stock</strong>
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : DOSSIERS PERDUS
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'perdus' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
              <FolderX className="h-5 w-5" /> Dossiers perdus
            </h3>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{dossiersPerdus.length} dossier(s)</span>
          </div>
          {dossiersPerdus.length === 0 ? (
            <div className="py-10 text-center">
              <FolderX className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" />
              <p className="text-[#304035]/40 text-sm">Aucun dossier perdu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dossiersPerdus.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-5 py-4">
                  <div>
                    <p className="font-bold text-[#304035]">{d.name}</p>
                    <p className="text-xs text-[#304035]/60 mt-0.5">{d.reason} · {d.lostDate}</p>
                  </div>
                  {d.montantEstime && (
                    <div className="text-right">
                      <p className="text-[10px] text-[#304035]/50 uppercase tracking-wider">Estimé</p>
                      <p className="font-bold text-red-600">{fmt(d.montantEstime)}</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="rounded-xl bg-[#304035] px-5 py-4 flex items-center justify-between mt-3">
                <p className="font-bold text-white text-sm">Total CA perdu</p>
                <p className="text-xl font-bold text-red-300">
                  {fmt(dossiersPerdus.reduce((s, d) => s + (d.montantEstime ?? 0), 0))}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : IMPORT / EXPORT
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'export' && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Download className="h-5 w-5" /> Import / Export de données
          </h3>

          {/* Export */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Exporter vos données</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Dossiers en cours',    count: dossiers.length,       color: 'bg-[#304035]/8 text-[#304035]' },
                { label: 'Dossiers signés',       count: dossiersSignes.length, color: 'bg-amber-50 text-amber-700' },
                { label: 'Factures',              count: invoices.length,       color: 'bg-violet-50 text-violet-700' },
                { label: 'Devis',                 count: devis.length,          color: 'bg-blue-50 text-blue-700' },
                { label: 'Catalogue produits',    count: stockItems.length,     color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Historique complet',    count: null,                  color: 'bg-[#f5eee8] text-[#a67749]' },
              ].map(item => (
                <button key={item.label}
                  className={cn('flex items-center justify-between rounded-xl px-4 py-3.5 hover:shadow-md transition-all border border-transparent hover:border-[#304035]/10', item.color, 'bg-opacity-50')}
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 opacity-70" />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.count !== null && <span className="text-xs opacity-60">{item.count} entrée(s)</span>}
                    <span className="text-[10px] font-bold opacity-50 bg-white/60 rounded px-1.5 py-0.5">CSV</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sauvegarde complète */}
          <div className="rounded-xl bg-[#304035]/5 border border-[#304035]/10 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-[#304035] text-sm">Sauvegarde complète (JSON)</p>
                <p className="text-xs text-[#304035]/50 mt-1">Exporte l'intégralité de vos données AVRA dans un fichier JSON restaurable</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-[#304035] px-4 py-2 text-xs font-bold text-white hover:bg-[#304035]/90 transition-colors shrink-0 ml-4">
                <Download className="h-3.5 w-3.5" /> Télécharger
              </button>
            </div>
          </div>

          {/* Import */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3">Importer des données</p>
            <div className="rounded-xl border-2 border-dashed border-[#304035]/20 p-6 text-center hover:border-[#304035]/40 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-[#304035]/25 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#304035]/60">Glisser un fichier JSON ou CSV</p>
              <p className="text-xs text-[#304035]/35 mt-1">Formats acceptés : .json, .csv — max 10 Mo</p>
              <button className="mt-3 rounded-xl border border-[#304035]/20 bg-white px-4 py-2 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors">
                Parcourir les fichiers
              </button>
            </div>
          </div>

          {/* Zone danger */}
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="font-bold text-red-700 text-sm">Zone dangereuse</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Réinitialiser toutes les données</p>
                <p className="text-xs text-red-400 mt-0.5">Remet l'app dans son état initial de démonstration</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-red-100 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-200 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL : INTELLIGENCE ARTIFICIELLE
      ══════════════════════════════════════════════════════════════════════ */}
      {active === 'ia' && iaForm && (
        <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 p-6 space-y-6">
          <h3 className="font-bold text-[#304035] text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Intelligence Artificielle — Assistant
          </h3>

          {/* Activation générale */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#304035]/5 to-[#304035]/10 border border-[#304035]/12 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#304035]/10">
                <Bot className="h-5 w-5 text-[#304035]" />
              </div>
              <div>
                <p className="font-bold text-[#304035] text-sm">Activer l'assistant AVRA</p>
                <p className="text-xs text-[#304035]/50 mt-0.5">L'assistant IA apparaît dans toutes les pages de l'application</p>
              </div>
            </div>
            <Toggle checked={iaForm.assistantActif} onChange={v => setIAForm(f => ({ ...f, assistantActif: v }))} />
          </div>

          {/* Personnalité */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Personnalité de l'assistant
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'professionnel', label: 'Professionnel', desc: 'Formel et précis', emoji: '💼' },
                { value: 'amical',        label: 'Amical',        desc: 'Chaleureux et humain', emoji: '😊' },
                { value: 'concis',        label: 'Concis',        desc: 'Court et efficace', emoji: '⚡' },
              ] as const).map(p => (
                <button
                  key={p.value}
                  onClick={() => setIAForm(f => ({ ...f, personnalite: p.value }))}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all',
                    iaForm.personnalite === p.value
                      ? 'border-[#304035] bg-[#304035]/5 shadow-sm'
                      : 'border-[#304035]/12 bg-[#f5eee8]/30 hover:border-[#304035]/30'
                  )}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <p className={cn('font-bold text-sm mt-2', iaForm.personnalite === p.value ? 'text-[#304035]' : 'text-[#304035]/70')}>{p.label}</p>
                  <p className="text-xs text-[#304035]/45 mt-0.5">{p.desc}</p>
                  {iaForm.personnalite === p.value && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#304035]/60">
                      <Check className="h-3 w-3" /> Actif
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Accès aux données */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Accès aux données de votre espace
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {[
                { key: 'accesDossiers'      as const, label: 'Dossiers clients',      desc: 'Dossiers en cours et signés' },
                { key: 'accesFacturation'    as const, label: 'Facturation',            desc: 'Devis, factures, avoirs' },
                { key: 'accesPlanning'       as const, label: 'Planning',               desc: 'Agenda et interventions' },
                { key: 'accesStock'          as const, label: 'Stock & Catalogue',      desc: 'Produits et tarifs' },
                { key: 'accesStats'          as const, label: 'Statistiques',            desc: 'KPIs et tableaux de bord' },
                { key: 'accesIntervenants'   as const, label: 'Intervenants',            desc: 'Poseurs et sous-traitants' },
                { key: 'accesAdminDocs'      as const, label: 'Dossiers administratifs', desc: 'Contrats, assurances, juridique' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-2.5">
                  <div>
                    <p className="font-semibold text-[#304035] text-sm">{item.label}</p>
                    <p className="text-xs text-[#304035]/50">{item.desc}</p>
                  </div>
                  <Toggle checked={iaForm[item.key]} onChange={v => setIAForm(f => ({ ...f, [item.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Actions autorisées */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Actions autorisées
            </p>
            <p className="text-xs text-[#304035]/40 mb-3">Définissez ce que l'assistant peut faire de manière autonome quand vous lui demandez.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {[
                { key: 'actionNavigation'       as const, label: 'Naviguer entre les pages',      safe: true },
                { key: 'actionCreerDossier'      as const, label: 'Créer un nouveau dossier',      safe: true },
                { key: 'actionCreerDevis'        as const, label: 'Créer un devis',                 safe: false },
                { key: 'actionCreerFacture'      as const, label: 'Créer une facture',              safe: false },
                { key: 'actionEnvoyerRelance'    as const, label: 'Envoyer une relance',            safe: false },
                { key: 'actionModifierPlanning'  as const, label: 'Modifier le planning',           safe: false },
              ].map(item => (
                <div key={item.key} className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-2.5',
                  !item.safe && iaForm[item.key] ? 'bg-amber-50 border-amber-200' : 'bg-[#f5eee8]/40 border-[#304035]/8'
                )}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#304035] text-sm">{item.label}</p>
                    {!item.safe && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">Sensible</span>}
                  </div>
                  <Toggle checked={iaForm[item.key]} onChange={v => setIAForm(f => ({ ...f, [item.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Comportement */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Comportement
            </p>
            <div className="space-y-2">
              {[
                { key: 'suggestionsAuto'          as const, label: 'Suggestions automatiques',    desc: 'Raccourcis contextuels selon la page' },
                { key: 'voixActive'               as const, label: 'Reconnaissance vocale',       desc: 'Dicter vos messages à la voix' },
                { key: 'notificationsProactives'   as const, label: 'Notifications proactives',    desc: 'L\'IA vous alerte d\'elle-même sur les urgences' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-[#f5eee8]/40 border border-[#304035]/8 px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#304035] text-sm">{item.label}</p>
                    <p className="text-xs text-[#304035]/50 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={iaForm[item.key]} onChange={v => setIAForm(f => ({ ...f, [item.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Réglages avancés */}
          <div>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Réglages avancés
            </p>
            <div className="space-y-4">
              {/* Température */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#304035]/60">Créativité des réponses</label>
                  <span className="text-xs font-bold text-[#304035]">{Math.round(iaForm.temperature * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#304035]/40 w-12">Précis</span>
                  <input type="range" min={0} max={1} step={0.1}
                    value={iaForm.temperature}
                    onChange={e => setIAForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))}
                    className="flex-1 accent-[#304035]" />
                  <span className="text-[10px] text-[#304035]/40 w-12 text-right">Créatif</span>
                </div>
              </div>

              {/* Longueur de réponse */}
              <div>
                <label className="block text-xs font-semibold text-[#304035]/60 mb-2">Longueur des réponses</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'courte',    label: 'Courte',    desc: '1-2 phrases' },
                    { value: 'normale',   label: 'Normale',   desc: 'Équilibré' },
                    { value: 'detaillee', label: 'Détaillée', desc: 'Complète' },
                  ] as const).map(opt => (
                    <button key={opt.value}
                      onClick={() => setIAForm(f => ({ ...f, longueurMaxReponse: opt.value }))}
                      className={cn(
                        'rounded-lg border py-2 px-3 text-center transition-all',
                        iaForm.longueurMaxReponse === opt.value
                          ? 'border-[#304035] bg-[#304035] text-white'
                          : 'border-[#304035]/15 bg-[#f5eee8]/30 text-[#304035]/70 hover:border-[#304035]/30'
                      )}
                    >
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className={cn('text-[10px] mt-0.5', iaForm.longueurMaxReponse === opt.value ? 'text-white/60' : 'text-[#304035]/40')}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mémoire */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#304035]/60">Mémoire de conversation</label>
                  <span className="text-xs font-bold text-[#304035]">{iaForm.nombreMessagesHistorique} msg</span>
                </div>
                <input type="range" min={5} max={100} step={5}
                  value={iaForm.nombreMessagesHistorique}
                  onChange={e => setIAForm(f => ({ ...f, nombreMessagesHistorique: parseInt(e.target.value) }))}
                  className="w-full accent-[#304035]" />
                <p className="text-[10px] text-[#304035]/40 mt-1">Nombre de messages conservés dans le contexte</p>
              </div>
            </div>
          </div>

          {/* Contexte métier */}
          <div>
            <label className="block text-[10px] font-bold text-[#304035]/50 mb-1.5 uppercase tracking-widest">Contexte métier</label>
            <input type="text"
              value={iaForm.contextMetier}
              onChange={e => setIAForm(f => ({ ...f, contextMetier: e.target.value }))}
              placeholder="Ex: Cuisines sur mesure, salles de bain, dressings…"
              className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 transition-shadow"
            />
            <p className="text-xs text-[#304035]/40 mt-1">Spécialités de votre activité — aide l'IA à mieux vous répondre</p>
          </div>

          {/* Prompt système */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest">Instruction système (prompt)</p>
              <span className="text-[10px] text-[#304035]/35 bg-[#f5eee8] rounded px-2 py-0.5">{iaForm.promptSysteme.length} caractères</span>
            </div>
            <textarea
              value={iaForm.promptSysteme}
              onChange={e => setIAForm(f => ({ ...f, promptSysteme: e.target.value }))}
              rows={4}
              placeholder="Décrivez le rôle et le comportement souhaité pour votre assistant..."
              className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 transition-shadow resize-none font-mono"
            />
            <p className="text-xs text-[#304035]/40 mt-1">Ce texte définit le comportement de base de l'assistant à chaque conversation.</p>
          </div>

          <SaveButton saved={!!savedMap['ia']} onClick={() => { updateIAConfig(iaForm); flash('ia'); }} />
        </div>
      )}
    </div>
  );
}
