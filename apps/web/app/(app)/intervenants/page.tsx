'use client';

/**
 * Hub /intervenants — drill-down 3 niveaux
 *
 * NIVEAU 0 : Vue d'accueil
 *   - Filtres types (FILTRES : POSEUR / ELECTRICIEN / ...)
 *   - Liste intervenants avec ALERTES dynamiques (DOSSIER RAJOUTE,
 *     ATTENTE RELEVE, SAV ENVOYE, EN ATTENTE PLANNING)
 *   - Demandes rapides (DEMANDE SPECIALE + 8 chips)
 *   - 4 boutons d'action (RAJOUTER / DEMANDE SPECIALE / DONNER ACCES / RELANCE)
 *
 * NIVEAU 1a : Drill-down chip (clic sur DEVIS, LIVRAISON, etc.)
 *   - UI specifique au type
 *
 * NIVEAU 1b : Drill-down intervenant (clic sur un nom)
 *   - Liste de ses dossiers avec statut A CLASSER / CLASSE
 *
 * NIVEAU 2 : Drill-down dossier (clic sur un dossier dans 1b)
 *   - Liste des items avec statut URGENT / EN COURS / CLASSE
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Mail, Phone, Plus, Trash2, Search, Wrench, Users,
  X, Edit3, Check, FileText, ArrowUpDown,
  MessageSquare, ExternalLink, HardHat, Send, Link2, ShieldCheck, Clock,
  ChevronRight, ChevronLeft, AlertTriangle, FolderPlus, RefreshCw,
  CheckCircle2, AlertCircle, Hourglass, FolderOpen, ArrowLeft, Folder,
} from 'lucide-react';
import {
  useIntervenantStore,
  type Intervenant,
  type IntervenantDossier,
  type DossierItemStatut,
} from '@/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendToIntervenantDrawer, type SendToIntervenantPrefill } from '@/components/demandes/SendToIntervenantDrawer';
import { InviteIntervenantModal } from '@/components/demandes/InviteIntervenantModal';
import { DonnerAccesModal } from '@/components/demandes/DonnerAccesModal';
import { MiniCalendarWeek } from '@/components/demandes/MiniCalendarWeek';
import {
  listInvitations, listDemandesPro,
  type IntervenantInvitation, type Demande, type DemandeType,
} from '@/lib/demandes-api';
import { api } from '@/lib/api';

// ─── Types & config ──────────────────────────────────────────────────────────

const TYPES = ['POSEUR', 'ELECTRICIEN', 'MACON', 'MARBRIER', 'CUISINISTES', 'PLOMBIER', 'CARRELEUR', 'PEINTRE', 'AUTRE'];

const TYPE_COLORS: Record<string, { bg: string; ring: string; avatar: string }> = {
  POSEUR:      { bg: 'bg-[#304035]',   ring: 'ring-[#304035]/20', avatar: 'bg-[#304035]/10 text-[#304035]' },
  ELECTRICIEN: { bg: 'bg-amber-500',   ring: 'ring-amber-200',    avatar: 'bg-amber-50 text-amber-600' },
  MACON:       { bg: 'bg-stone-500',   ring: 'ring-stone-200',    avatar: 'bg-stone-100 text-stone-600' },
  MARBRIER:    { bg: 'bg-slate-500',   ring: 'ring-slate-200',    avatar: 'bg-slate-100 text-slate-600' },
  CUISINISTES: { bg: 'bg-blue-500',    ring: 'ring-blue-200',     avatar: 'bg-blue-50 text-blue-600' },
  PLOMBIER:    { bg: 'bg-cyan-500',    ring: 'ring-cyan-200',     avatar: 'bg-cyan-50 text-cyan-600' },
  CARRELEUR:   { bg: 'bg-orange-500',  ring: 'ring-orange-200',   avatar: 'bg-orange-50 text-orange-600' },
  PEINTRE:     { bg: 'bg-rose-500',    ring: 'ring-rose-200',     avatar: 'bg-rose-50 text-rose-600' },
  AUTRE:       { bg: 'bg-[#304035]/10', ring: 'ring-[#304035]/10', avatar: 'bg-[#304035]/5 text-[#304035]/60' },
};

function typeColor(t: string) {
  return TYPE_COLORS[t] ?? TYPE_COLORS.AUTRE;
}

// ─── Quick demandes config ──────────────────────────────────────────────────

interface QuickDemandeDef {
  key: string;
  label: string;
  icon: string;
  /** Type Demande sous-jacent. */
  type: DemandeType;
  /** Title pre-rempli. */
  titlePrefix: string;
  /** Notes template. */
  notesTemplate?: string;
  /** UI mode dans le drill-down. */
  uiMode: 'list-projects' | 'calendar' | 'list-tickets' | 'form';
}

const QUICK_DEMANDES: QuickDemandeDef[] = [
  { key: 'PLANNING',   label: 'Planning',                icon: '📅', type: 'POSE',
    titlePrefix: 'Intervention planning — ', uiMode: 'calendar' },
  { key: 'DEVIS',      label: 'Devis',                   icon: '📄', type: 'DEVIS',
    titlePrefix: 'Demande de devis — ', uiMode: 'list-projects' },
  { key: 'LIVRAISON',  label: 'Livraison',               icon: '📦', type: 'LIVRAISON',
    titlePrefix: 'Livraison — ', uiMode: 'calendar' },
  { key: 'SAV',        label: 'SAV',                     icon: '🛠', type: 'SAV',
    titlePrefix: 'SAV — ', uiMode: 'list-tickets' },
  { key: 'MESURE',     label: 'Prise de mesures',        icon: '📏', type: 'MESURE',
    titlePrefix: 'Prise de mesures — ', uiMode: 'list-tickets' },
  { key: 'COMPTE_RENDU', label: 'Compte rendu chantier', icon: '📝', type: 'AUTRE',
    titlePrefix: 'Compte rendu chantier — ',
    notesTemplate: 'Date de visite :\nPersonnes presentes :\nObservations :\nPoints d\'attention :\nProchaines etapes :',
    uiMode: 'list-tickets' },
  { key: 'COMPLEMENT', label: 'Compléments',             icon: '➕', type: 'COMPLEMENT',
    titlePrefix: 'Complément — ', uiMode: 'form' },
  { key: 'CONFIRMATION', label: 'Confirmations commandes', icon: '✅', type: 'CONFIRMATION_COMMANDE',
    titlePrefix: 'Confirmation commande — ', uiMode: 'list-tickets' },
];

// ─── Page principale ─────────────────────────────────────────────────────────

type SortKey = 'name' | 'dossiers';

export default function IntervenantsHubPage() {
  const intervenants = useIntervenantStore(s => s.intervenants);
  const addIntervenant = useIntervenantStore(s => s.addIntervenant);
  const removeIntervenant = useIntervenantStore(s => s.removeIntervenant);
  const updateIntervenant = useIntervenantStore(s => s.updateIntervenant);
  const addDossier = useIntervenantStore(s => s.addDossier);
  const removeDossier = useIntervenantStore(s => s.removeDossier);
  const markDossierVu = useIntervenantStore(s => s.markDossierVu);
  const addDossierItem = useIntervenantStore(s => s.addDossierItem);
  const removeDossierItem = useIntervenantStore(s => s.removeDossierItem);
  const updateDossierItemStatut = useIntervenantStore(s => s.updateDossierItemStatut);
  const updateIntervenantDossierStatut = useIntervenantStore(s => s.updateIntervenantDossierStatut);

  // Filtres
  const [filterType, setFilterType] = useState<string>('POSEUR');
  const [search, setSearch] = useState('');

  // Drill-down state
  const [selectedChipKey, setSelectedChipKey] = useState<string | null>(null);
  const [selectedIntervenantId, setSelectedIntervenantId] = useState<string | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDonnerAcces, setShowDonnerAcces] = useState(false);
  const [drawerPrefill, setDrawerPrefill] = useState<SendToIntervenantPrefill | null>(null);
  const [invitingFor, setInvitingFor] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [confirmDeleteIntervenant, setConfirmDeleteIntervenant] = useState<string | null>(null);

  // Backend state
  const [invitations, setInvitations] = useState<Record<string, IntervenantInvitation>>({});
  const [proDemandes, setProDemandes] = useState<Demande[]>([]);
  const [relanceLoading, setRelanceLoading] = useState(false);

  // Charge demandes + invitations au mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listDemandesPro({ pageSize: 100 }),
      listInvitations(),
    ])
      .then(([dem, rawInvs]) => {
        if (cancelled) return;
        setProDemandes(dem.data ?? []);
        const arr = Array.isArray(rawInvs) ? rawInvs : (Array.isArray((rawInvs as any)?.data) ? (rawInvs as any).data : []);
        const sorted = [...(arr as IntervenantInvitation[])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const m: Record<string, IntervenantInvitation> = {};
        for (const inv of sorted) if (!m[inv.intervenantId]) m[inv.intervenantId] = inv;
        setInvitations(m);
      })
      .catch(() => { /* silencieux : auth/network */ });
    return () => { cancelled = true; };
  }, []);

  // Liste filtrée
  const filtered = useMemo(() => {
    let list = intervenants.filter(i => i.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.phone?.includes(q)
      );
    }
    return list;
  }, [intervenants, filterType, search]);

  // Indices intervenants pour drill-down
  const selectedIntervenant = useMemo(
    () => intervenants.find(i => i.id === selectedIntervenantId) ?? null,
    [intervenants, selectedIntervenantId]
  );
  const selectedDossier = useMemo(
    () => selectedIntervenant?.dossiers.find(d => (d.id ?? d.name) === selectedDossierId) ?? null,
    [selectedIntervenant, selectedDossierId]
  );

  // Compute alertes par intervenant (pour la liste niveau 0)
  const alertsByIntervenantId = useMemo(() => {
    const map: Record<string, IntervenantAlert[]> = {};
    for (const inter of intervenants) {
      const alerts: IntervenantAlert[] = [];
      // 1. DOSSIER RAJOUTE — si l'intervenant a au moins un dossier flag rajoute
      if (inter.dossiers.some(d => d.rajoute)) {
        alerts.push({ key: 'DOSSIER_RAJOUTE', label: 'DOSSIER RAJOUTÉ', tone: 'red' });
      }
      // 2. Filtre demandes par intervenantId
      const myDemandes = proDemandes.filter(d => d.intervenant?.id === inter.id);
      // ATTENTE RELEVE = demande MESURE en cours
      if (myDemandes.some(d => d.type === 'MESURE' && ['ENVOYEE', 'VUE'].includes(d.status))) {
        alerts.push({ key: 'ATTENTE_RELEVE', label: 'ATTENTE RELEVÉ', tone: 'orange' });
      }
      // SAV ENVOYE = demande SAV recente (< 30j)
      const recentSAV = myDemandes.find(d =>
        d.type === 'SAV'
        && new Date(d.createdAt).getTime() > Date.now() - 30 * 86400_000
      );
      if (recentSAV) {
        alerts.push({ key: 'SAV_ENVOYE', label: 'SAV ENVOYÉ', tone: 'amber' });
      }
      // EN ATTENTE REPONSE PLANNING = demande POSE/LIVRAISON scheduledFor sans reponse
      if (myDemandes.some(d =>
        ['POSE', 'LIVRAISON'].includes(d.type)
        && d.scheduledFor
        && ['ENVOYEE', 'VUE'].includes(d.status)
      )) {
        alerts.push({ key: 'ATTENTE_PLANNING', label: 'EN ATTENTE RÉPONSE PLANNING', tone: 'red' });
      }
      map[inter.id] = alerts;
    }
    return map;
  }, [intervenants, proDemandes]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePickChip = (chipKey: string) => {
    setSelectedChipKey(chipKey === selectedChipKey ? null : chipKey);
    // Reset intervenant/dossier quand on change de chip
    if (chipKey !== selectedChipKey) {
      setSelectedIntervenantId(null);
      setSelectedDossierId(null);
    }
  };

  const handlePickIntervenantInChip = (id: string) => {
    setSelectedIntervenantId(id);
    setSelectedDossierId(null);
  };

  const handleOpenIntervenant = (id: string) => {
    setSelectedChipKey(null);
    setSelectedIntervenantId(id);
    setSelectedDossierId(null);
  };

  const handleBack = () => {
    if (selectedDossierId) setSelectedDossierId(null);
    else if (selectedIntervenantId) setSelectedIntervenantId(null);
    else if (selectedChipKey) setSelectedChipKey(null);
  };

  const handleRelanceAll = async () => {
    setRelanceLoading(true);
    try {
      const res = await api<{ sent: number }>('/demandes/internal/relance-all', { method: 'POST' });
      alert(`Relance envoyee a ${res.sent ?? 0} intervenant(s).`);
    } catch (err: any) {
      alert(`Erreur relance : ${err?.message ?? 'inconnu'}`);
    } finally {
      setRelanceLoading(false);
    }
  };

  const handleDemandeSpeciale = () => {
    setDrawerPrefill({
      type: 'AUTRE',
      title: '',
      notes: 'Description detaillee de la demande :',
    });
  };

  // ── Vue d'accueil (NIVEAU 0) ───────────────────────────────────────────────

  if (!selectedChipKey && !selectedIntervenantId) {
    return (
      <div className="space-y-5">
        <PageHeader
          icon={<HardHat className="h-7 w-7" />}
          title="Intervenants"
          subtitle={`${filtered.length} ${filterType.toLowerCase()}${filtered.length > 1 ? 's' : ''}`}
        />

        {/* Bandeau filtres style screenshot : "FILTRES :" + types soulignés */}
        <FiltersBar
          types={TYPES}
          activeType={filterType}
          onPick={setFilterType}
        />

        {/* Demandes rapides */}
        <QuickDemandesSection
          onPickChip={handlePickChip}
          onDemandeSpeciale={handleDemandeSpeciale}
        />

        {/* Liste intervenants */}
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#304035]/8 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#304035]/12 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <HardHat className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#304035] mb-1">Aucun {filterType.toLowerCase()}</p>
              <p className="text-xs text-[#304035]/55">
                Cliquez sur "RAJOUTER UN {filterType}" pour en créer un.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#304035]/5">
              {filtered.map(i => (
                <IntervenantRow
                  key={i.id}
                  intervenant={i}
                  alerts={alertsByIntervenantId[i.id] ?? []}
                  onClick={() => handleOpenIntervenant(i.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 4 boutons d'actions globales */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionButton
            color="emerald"
            label={`RAJOUTER UN ${filterType}`}
            icon={<Plus className="h-5 w-5" />}
            onClick={() => setShowAddForm(true)}
          />
          <ActionButton
            color="emerald"
            label="DEMANDE SPÉCIALE"
            icon={<Send className="h-5 w-5" />}
            onClick={handleDemandeSpeciale}
          />
          <ActionButton
            color="emerald"
            label="DONNER ACCÈS"
            icon={<Mail className="h-5 w-5" />}
            onClick={() => setShowDonnerAcces(true)}
          />
          <ActionButton
            color="emerald"
            label={relanceLoading ? 'RELANCE…' : 'RELANCE'}
            icon={<RefreshCw className={`h-5 w-5 ${relanceLoading ? 'animate-spin' : ''}`} />}
            onClick={handleRelanceAll}
            disabled={relanceLoading}
          />
        </div>

        {/* ── Modals & drawers ── */}
        {showAddForm && (
          <AddIntervenantModal
            defaultType={filterType}
            onClose={() => setShowAddForm(false)}
            onCreate={(data) => {
              addIntervenant(data);
              setShowAddForm(false);
            }}
          />
        )}

        {showDonnerAcces && (
          <DonnerAccesModal
            open={showDonnerAcces}
            onClose={() => setShowDonnerAcces(false)}
            intervenants={intervenants.map(i => ({
              id: i.id, type: i.type, name: i.name, email: i.email,
            }))}
            existingInvitations={invitations}
            onSent={() => {
              // Refresh invitations
              listInvitations()
                .then(rawList => {
                  const arr = Array.isArray(rawList) ? rawList : (Array.isArray((rawList as any)?.data) ? (rawList as any).data : []);
                  const sorted = [...(arr as IntervenantInvitation[])].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  const m: Record<string, IntervenantInvitation> = {};
                  for (const inv of sorted) if (!m[inv.intervenantId]) m[inv.intervenantId] = inv;
                  setInvitations(m);
                })
                .catch(() => {/* noop */});
            }}
          />
        )}

        <SendToIntervenantDrawer
          open={!!drawerPrefill}
          onClose={() => setDrawerPrefill(null)}
          prefill={drawerPrefill ?? undefined}
        />
      </div>
    );
  }

  // ── Drill-down chip (NIVEAU 1a) ────────────────────────────────────────────

  if (selectedChipKey) {
    const chip = QUICK_DEMANDES.find(q => q.key === selectedChipKey)!;
    return (
      <div className="space-y-5">
        <PageHeader
          icon={<HardHat className="h-7 w-7" />}
          title="Intervenants"
        />

        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#304035]/60 hover:text-[#304035]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>

        {/* Demande spéciale + chips (le chip selectionne est highlight) */}
        <QuickDemandesSection
          activeChip={selectedChipKey}
          onPickChip={handlePickChip}
          onDemandeSpeciale={handleDemandeSpeciale}
        />

        {/* Drill-down content */}
        <ChipDrilldown
          chip={chip}
          intervenants={intervenants}
          selectedIntervenant={selectedIntervenant}
          onPickIntervenant={handlePickIntervenantInChip}
          proDemandes={proDemandes}
          onAddDossier={(intId, name) => addDossier(intId, { name, date: new Date().toLocaleDateString('fr-FR') })}
          onSendDemande={(prefill) => setDrawerPrefill(prefill)}
        />

        <SendToIntervenantDrawer
          open={!!drawerPrefill}
          onClose={() => setDrawerPrefill(null)}
          prefill={drawerPrefill ?? undefined}
        />
      </div>
    );
  }

  // ── Drill-down intervenant + dossier (NIVEAUX 1b et 2) ─────────────────────

  if (selectedIntervenant) {
    const alerts = alertsByIntervenantId[selectedIntervenant.id] ?? [];
    return (
      <div className="space-y-5">
        <PageHeader
          icon={<HardHat className="h-7 w-7" />}
          title="Intervenants"
        />

        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#304035]/60 hover:text-[#304035]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>

        <FiltersBar
          types={TYPES}
          activeType={filterType}
          onPick={(t) => { setFilterType(t); setSelectedIntervenantId(null); }}
        />

        {/* Header intervenant avec alerte principale */}
        <IntervenantDetailHeader
          intervenant={selectedIntervenant}
          alerts={alerts}
          onSendDemande={() => setDrawerPrefill({ intervenantId: selectedIntervenant.id })}
          onInvite={() => setInvitingFor({
            id: selectedIntervenant.id, name: selectedIntervenant.name, email: selectedIntervenant.email,
          })}
          onDelete={() => setConfirmDeleteIntervenant(selectedIntervenant.id)}
        />

        {selectedDossier ? (
          // ─ NIVEAU 2 : items du dossier ─
          <DossierItemsView
            dossier={selectedDossier}
            onAddItem={(name) => addDossierItem(selectedIntervenant.id, selectedDossier.id ?? selectedDossier.name, { name })}
            onRemoveItem={(itemId) => removeDossierItem(selectedIntervenant.id, selectedDossier.id ?? selectedDossier.name, itemId)}
            onUpdateItemStatut={(itemId, statut) =>
              updateDossierItemStatut(selectedIntervenant.id, selectedDossier.id ?? selectedDossier.name, itemId, statut)
            }
            onBack={() => setSelectedDossierId(null)}
            onMarkClassed={() => updateIntervenantDossierStatut(selectedIntervenant.id, selectedDossier.name, 'CLASSE')}
          />
        ) : (
          // ─ NIVEAU 1b : liste dossiers de l'intervenant ─
          <DossiersListView
            intervenantId={selectedIntervenant.id}
            dossiers={selectedIntervenant.dossiers}
            onPick={(d) => {
              const did = d.id ?? d.name;
              setSelectedDossierId(did);
              if (d.rajoute) markDossierVu(selectedIntervenant.id, did);
            }}
            onAddDossier={(name) => addDossier(selectedIntervenant.id, { name, date: new Date().toLocaleDateString('fr-FR') })}
            onRemoveDossier={(d) => removeDossier(selectedIntervenant.id, d.id ?? d.name)}
            onToggleStatut={(d) =>
              updateIntervenantDossierStatut(selectedIntervenant.id, d.name, d.statut === 'CLASSE' ? 'A CLASSER' : 'CLASSE')
            }
          />
        )}

        {/* ── Modals associés au détail ── */}
        {invitingFor && (
          <InviteIntervenantModal
            open={!!invitingFor}
            onClose={() => setInvitingFor(null)}
            intervenantId={invitingFor.id}
            intervenantName={invitingFor.name}
            defaultEmail={invitingFor.email}
            existingInvitation={invitations[invitingFor.id] ?? null}
            onChange={(inv) => {
              setInvitations(prev => {
                const next = { ...prev };
                if (inv && inv.status === 'PENDING') next[invitingFor.id] = inv;
                else delete next[invitingFor.id];
                return next;
              });
            }}
          />
        )}

        {confirmDeleteIntervenant && (
          <ConfirmDeleteModal
            name={selectedIntervenant.name}
            onCancel={() => setConfirmDeleteIntervenant(null)}
            onConfirm={() => {
              removeIntervenant(selectedIntervenant.id);
              setConfirmDeleteIntervenant(null);
              setSelectedIntervenantId(null);
            }}
          />
        )}

        <SendToIntervenantDrawer
          open={!!drawerPrefill}
          onClose={() => setDrawerPrefill(null)}
          prefill={drawerPrefill ?? undefined}
        />
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sous-composants
// ═══════════════════════════════════════════════════════════════════════════

interface IntervenantAlert {
  key: string;
  label: string;
  tone: 'red' | 'orange' | 'amber';
}

// ─── FiltersBar (style FILTRES : POSEUR ELECTRICIEN ...) ────────────────────

function FiltersBar({ types, activeType, onPick }: { types: string[]; activeType: string; onPick: (t: string) => void }) {
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm px-5 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-[#304035] underline mr-2">FILTRES :</span>
        {types.map(t => {
          const active = t === activeType;
          return (
            <button
              key={t}
              onClick={() => onPick(t)}
              className={cn(
                'text-xs font-bold uppercase tracking-wider px-1.5 py-1 transition-colors underline-offset-4',
                active
                  ? 'text-[#304035] font-extrabold underline decoration-2'
                  : 'text-[#304035]/55 hover:text-[#304035] underline'
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── QuickDemandesSection (DEMANDE SPECIALE + 8 chips) ──────────────────────

function QuickDemandesSection({
  activeChip, onPickChip, onDemandeSpeciale,
}: {
  activeChip?: string | null;
  onPickChip: (key: string) => void;
  onDemandeSpeciale: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
      <div className="p-5 space-y-3">
        <button
          onClick={onDemandeSpeciale}
          className="group w-full rounded-2xl px-6 py-4 text-base font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
          }}
        >
          <span className="flex items-center justify-center gap-2.5">
            <span className="text-xl">✨</span>
            <span className="tracking-wide">DEMANDE SPÉCIALE</span>
          </span>
        </button>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_DEMANDES.map(a => {
            const active = activeChip === a.key;
            return (
              <button
                key={a.key}
                onClick={() => onPickChip(a.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 group border-2',
                  active ? 'border-[#15803d]' : 'border-transparent'
                )}
                style={{
                  background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 100%)',
                  color: '#78350f',
                }}
              >
                <ChevronRight className="h-4 w-4 shrink-0 text-[#78350f]/70 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-base">{a.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide flex-1 truncate">
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── IntervenantRow avec alertes ────────────────────────────────────────────

function IntervenantRow({
  intervenant, alerts, onClick,
}: { intervenant: Intervenant; alerts: IntervenantAlert[]; onClick: () => void }) {
  const c = typeColor(intervenant.type);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-[#f5eee8]/40 transition-colors group cursor-pointer"
    >
      <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center text-base font-bold shrink-0 ring-2', c.avatar, c.ring)}>
        {(intervenant.name[0] ?? '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#304035] group-hover:text-[#a67749] transition-colors text-[15px] underline underline-offset-2">
          {intervenant.name}
        </p>
        <div className="flex flex-wrap gap-3 mt-0.5">
          {intervenant.phone && <span className="flex items-center gap-1 text-xs text-[#304035]/45"><Phone className="h-3 w-3" /> {intervenant.phone}</span>}
          {intervenant.email && <span className="flex items-center gap-1 text-xs text-[#304035]/45"><Mail className="h-3 w-3" /> {intervenant.email}</span>}
        </div>
      </div>
      {/* Alertes */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {alerts.map(a => (
          <AlertBadge key={a.key} label={a.label} tone={a.tone} />
        ))}
      </div>
      <ChevronRight className="h-4 w-4 text-[#304035]/30 shrink-0" />
    </div>
  );
}

function AlertBadge({ label, tone }: { label: string; tone: 'red' | 'orange' | 'amber' }) {
  const config = {
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: <AlertCircle className="h-3 w-3" /> },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <Hourglass className="h-3 w-3" /> },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: <AlertTriangle className="h-3 w-3" /> },
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold', config.bg, config.text)}>
      {config.icon} {label}
    </span>
  );
}

// ─── ActionButton (4 grands boutons en bas) ─────────────────────────────────

function ActionButton({
  color, label, icon, onClick, disabled,
}: {
  color: 'emerald';
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl px-6 py-4 text-base font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
      style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
      }}
    >
      <span className="flex items-center justify-center gap-2.5">
        {icon}
        <span className="tracking-wide">{label}</span>
      </span>
    </button>
  );
}

// ─── ChipDrilldown ──────────────────────────────────────────────────────────

function ChipDrilldown({
  chip, intervenants, selectedIntervenant, onPickIntervenant,
  proDemandes, onAddDossier, onSendDemande,
}: {
  chip: QuickDemandeDef;
  intervenants: Intervenant[];
  selectedIntervenant: Intervenant | null;
  onPickIntervenant: (id: string) => void;
  proDemandes: Demande[];
  onAddDossier: (intervenantId: string, name: string) => void;
  onSendDemande: (prefill: SendToIntervenantPrefill) => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#304035]/8 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#304035] flex items-center gap-2">
            <span>{chip.icon}</span> {chip.label}
          </h2>
        </div>
        {selectedIntervenant && (
          <AddDossierInline
            onAdd={(name) => onAddDossier(selectedIntervenant.id, name)}
          />
        )}
      </div>

      <div className="p-5">
        {!selectedIntervenant ? (
          // Choix de l'intervenant
          <div>
            <p className="text-xs text-[#304035]/55 mb-3">Choisir un intervenant pour cette demande :</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {intervenants.length === 0 ? (
                <p className="col-span-full text-sm text-[#304035]/55 italic">Aucun intervenant. Ajoutez-en depuis la vue principale.</p>
              ) : (
                intervenants.map(i => (
                  <button
                    key={i.id}
                    onClick={() => onPickIntervenant(i.id)}
                    className="text-left p-3 rounded-xl border border-[#304035]/10 hover:border-[#a67749] hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-bold text-[#304035] truncate">{i.name}</p>
                    <p className="text-xs text-[#304035]/55">{i.type}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header intervenant */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#304035]/8">
              <HardHat className="h-5 w-5 text-[#304035]/55" />
              <p className="text-base font-bold text-[#304035] underline underline-offset-2">{selectedIntervenant.name}</p>
            </div>

            {/* UI specifique au type */}
            {chip.uiMode === 'list-projects' && (
              <DevisDrilldown
                intervenant={selectedIntervenant}
                onSend={() => onSendDemande({
                  type: chip.type, title: chip.titlePrefix, intervenantId: selectedIntervenant.id,
                })}
              />
            )}
            {chip.uiMode === 'calendar' && (
              <CalendarDrilldown
                intervenant={selectedIntervenant}
                proDemandes={proDemandes}
                filterType={chip.type}
                onSlotClick={(date, hour) => {
                  const iso = new Date(date);
                  iso.setHours(hour, 0, 0, 0);
                  onSendDemande({
                    type: chip.type,
                    title: chip.titlePrefix,
                    scheduledFor: iso.toISOString().slice(0, 16),
                    intervenantId: selectedIntervenant.id,
                  });
                }}
              />
            )}
            {chip.uiMode === 'list-tickets' && (
              <TicketsDrilldown
                intervenant={selectedIntervenant}
                proDemandes={proDemandes}
                filterType={chip.type}
                onSend={() => onSendDemande({
                  type: chip.type,
                  title: chip.titlePrefix,
                  notes: chip.notesTemplate,
                  intervenantId: selectedIntervenant.id,
                })}
              />
            )}
            {chip.uiMode === 'form' && (
              <button
                onClick={() => onSendDemande({
                  type: chip.type,
                  title: chip.titlePrefix,
                  notes: chip.notesTemplate,
                  intervenantId: selectedIntervenant.id,
                })}
                className="w-full py-3 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm transition-colors"
              >
                <Send className="inline h-4 w-4 mr-2" />
                Composer la demande {chip.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Variantes de drill-down par type ────────────────────────────────────────

function DevisDrilldown({ intervenant, onSend }: { intervenant: Intervenant; onSend: () => void }) {
  return (
    <div className="space-y-3">
      <button
        onClick={onSend}
        className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-2"
      >
        <ChevronRight className="h-4 w-4" />
        Envoyer la demande de devis
      </button>

      <div className="pl-2 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-[#304035]">
          <Folder className="h-4 w-4" />
          <span className="underline">PROJETS DESCRIPTIFS</span>
        </div>
        {intervenant.dossiers.length === 0 ? (
          <p className="text-xs text-[#304035]/55 italic pl-6">Aucun projet — ajoutez-en avec "+ DOSSIER".</p>
        ) : (
          <ul className="pl-6 space-y-1">
            {intervenant.dossiers.map((d, i) => (
              <li key={i} className="text-sm text-[#304035]">{d.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CalendarDrilldown({
  intervenant, proDemandes, filterType, onSlotClick,
}: {
  intervenant: Intervenant;
  proDemandes: Demande[];
  filterType: DemandeType;
  onSlotClick: (date: Date, hour: number) => void;
}) {
  const myDemandes = proDemandes.filter(d => d.intervenant?.id === intervenant.id);
  return (
    <MiniCalendarWeek
      demandes={myDemandes}
      filterType={filterType}
      onCellClick={onSlotClick}
    />
  );
}

function TicketsDrilldown({
  intervenant, proDemandes, filterType, onSend,
}: {
  intervenant: Intervenant;
  proDemandes: Demande[];
  filterType: DemandeType;
  onSend: () => void;
}) {
  const myDemandes = proDemandes
    .filter(d => d.intervenant?.id === intervenant.id && d.type === filterType)
    .slice(0, 10);
  return (
    <div className="space-y-3">
      <button
        onClick={onSend}
        className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-2"
      >
        <ChevronRight className="h-4 w-4" />
        Nouvelle demande {filterType}
      </button>

      {myDemandes.length === 0 ? (
        <p className="text-xs text-[#304035]/55 italic">Aucun ticket {filterType} pour cet intervenant.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#304035]/55 uppercase tracking-wider">Tickets récents</p>
          {myDemandes.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#304035]/10">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#304035] truncate">{d.title}</p>
                <p className="text-xs text-[#304035]/55">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-[#304035]/8 text-[#304035]">
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Détail intervenant ─────────────────────────────────────────────────────

function IntervenantDetailHeader({
  intervenant, alerts, onSendDemande, onInvite, onDelete,
}: {
  intervenant: Intervenant;
  alerts: IntervenantAlert[];
  onSendDemande: () => void;
  onInvite: () => void;
  onDelete: () => void;
}) {
  const c = typeColor(intervenant.type);
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold ring-2', c.avatar, c.ring)}>
          {(intervenant.name[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-[#304035] underline underline-offset-2">{intervenant.name}</h2>
            <span className="text-xs font-bold uppercase tracking-wider text-[#304035]/55">{intervenant.type}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            {intervenant.phone && <span className="text-xs text-[#304035]/55"><Phone className="inline h-3 w-3 mr-1" />{intervenant.phone}</span>}
            {intervenant.email && <span className="text-xs text-[#304035]/55"><Mail className="inline h-3 w-3 mr-1" />{intervenant.email}</span>}
          </div>
          {alerts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {alerts.map(a => <AlertBadge key={a.key} label={a.label} tone={a.tone} />)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onSendDemande} className="text-xs font-bold rounded-lg px-3 py-2 bg-[#1a2a1e] text-[#cbb98a] hover:bg-[#3D5449] transition-colors">
            <Send className="inline h-3.5 w-3.5 mr-1" /> Envoyer demande
          </button>
          <button onClick={onInvite} className="text-xs font-bold rounded-lg px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
            <Mail className="inline h-3.5 w-3.5 mr-1" /> Donner accès
          </button>
          <button onClick={onDelete} className="text-xs font-bold rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200">
            <Trash2 className="inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DossiersListView({
  intervenantId, dossiers, onPick, onAddDossier, onRemoveDossier, onToggleStatut,
}: {
  intervenantId: string;
  dossiers: IntervenantDossier[];
  onPick: (d: IntervenantDossier) => void;
  onAddDossier: (name: string) => void;
  onRemoveDossier: (d: IntervenantDossier) => void;
  onToggleStatut: (d: IntervenantDossier) => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#304035]/8 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#304035]">Dossiers de cet intervenant</h3>
        <AddDossierInline onAdd={onAddDossier} />
      </div>
      <div className="divide-y divide-[#304035]/5">
        {dossiers.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="h-8 w-8 text-[#304035]/20 mx-auto mb-2" />
            <p className="text-xs text-[#304035]/55">Aucun dossier — ajoutez-en avec "+ Dossier".</p>
          </div>
        ) : (
          dossiers.map((d, i) => {
            const isClasse = d.statut === 'CLASSE';
            return (
              <div key={d.id ?? d.name} className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5eee8]/30 transition-colors">
                <button onClick={() => onPick(d)} className="flex-1 flex items-center gap-3 text-left">
                  <Folder className={cn('h-4 w-4', isClasse ? 'text-emerald-600' : 'text-[#a67749]')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#304035] underline truncate">
                      {d.name}{d.date ? ` – ${d.date}` : ''}
                    </p>
                    {(d.items?.length ?? 0) > 0 && (
                      <p className="text-[10px] text-[#304035]/55 mt-0.5">
                        {d.items!.length} élément{d.items!.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </button>
                <ChevronRight className="h-4 w-4 text-[#304035]/30" />
                <button
                  onClick={() => onToggleStatut(d)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors',
                    isClasse
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  )}
                  title="Cliquez pour basculer le statut"
                >
                  {isClasse ? 'CLASSÉ' : 'À CLASSER'}
                </button>
                <button
                  onClick={() => { if (confirm(`Supprimer le dossier "${d.name}" ?`)) onRemoveDossier(d); }}
                  className="rounded-lg p-1.5 text-red-500/60 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {d.rajoute && (
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
                    NOUVEAU
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DossierItemsView({
  dossier, onAddItem, onRemoveItem, onUpdateItemStatut, onBack, onMarkClassed,
}: {
  dossier: IntervenantDossier;
  onAddItem: (name: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemStatut: (id: string, statut: DossierItemStatut) => void;
  onBack: () => void;
  onMarkClassed: () => void;
}) {
  const [newItem, setNewItem] = useState('');
  const items = dossier.items ?? [];
  const allClasse = items.length > 0 && items.every(it => it.statut === 'CLASSE');

  return (
    <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#304035]/8 flex items-center gap-3">
        <button onClick={onBack} className="text-[#304035]/55 hover:text-[#304035]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Folder className="h-5 w-5 text-[#a67749]" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[#304035] underline">
            {dossier.name}{dossier.date ? ` – ${dossier.date}` : ''}
          </h3>
          <p className="text-[10px] text-[#304035]/55">{items.length} élément{items.length > 1 ? 's' : ''}</p>
        </div>
        {allClasse && (
          <button
            onClick={onMarkClassed}
            className="text-xs font-bold rounded-lg px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> Marquer dossier classé
          </button>
        )}
      </div>

      {/* Ajout d'un item */}
      <div className="px-5 py-3 border-b border-[#304035]/5 flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { onAddItem(newItem.trim()); setNewItem(''); } }}
          placeholder="Nom du client / item à ajouter…"
          className="flex-1 rounded-lg border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
        />
        <button
          onClick={() => { if (newItem.trim()) { onAddItem(newItem.trim()); setNewItem(''); } }}
          disabled={!newItem.trim()}
          className="rounded-lg bg-[#1a2a1e] text-[#cbb98a] px-4 py-2 text-xs font-bold disabled:opacity-50"
        >
          + Ajouter
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-[#304035]/55">Aucun élément. Ajoutez-en ci-dessus.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#304035]/5">
          {items.map(it => (
            <DossierItemRow
              key={it.id}
              item={it}
              onUpdateStatut={(statut) => onUpdateItemStatut(it.id, statut)}
              onRemove={() => onRemoveItem(it.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DossierItemRow({
  item, onUpdateStatut, onRemove,
}: {
  item: { id: string; name: string; statut: DossierItemStatut };
  onUpdateStatut: (statut: DossierItemStatut) => void;
  onRemove: () => void;
}) {
  const config: Record<DossierItemStatut, { bg: string; text: string }> = {
    URGENT:    { bg: 'bg-red-100',    text: 'text-red-700' },
    'EN COURS': { bg: 'bg-amber-100', text: 'text-amber-700' },
    CLASSE:    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };
  const c = config[item.statut];

  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <span className="text-sm font-medium text-[#304035] flex-1 truncate">{item.name}</span>
      <div className="flex gap-1">
        {(['URGENT', 'EN COURS', 'CLASSE'] as DossierItemStatut[]).map(s => (
          <button
            key={s}
            onClick={() => onUpdateStatut(s)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition-colors',
              item.statut === s
                ? `${config[s].bg} ${config[s].text}`
                : 'bg-[#304035]/5 text-[#304035]/40 hover:bg-[#304035]/10'
            )}
          >
            {s === 'CLASSE' ? 'CLASSÉ' : s}
          </button>
        ))}
      </div>
      <button onClick={onRemove} className="rounded-lg p-1.5 text-red-500/60 hover:bg-red-50 hover:text-red-600">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── AddDossierInline (bouton "+ DOSSIER") ──────────────────────────────────

function AddDossierInline({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#a67749]/10 text-[#a67749] hover:bg-[#a67749]/20"
      >
        <Plus className="h-3.5 w-3.5" /> DOSSIER
      </button>
    );
  }
  return (
    <div className="flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setName(''); setAdding(false); }
          if (e.key === 'Escape') { setAdding(false); setName(''); }
        }}
        placeholder="Nom du dossier"
        className="rounded-lg border border-[#304035]/12 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#304035]/20"
      />
      <button
        onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); setAdding(false); } }}
        className="rounded-lg bg-[#a67749] text-white px-2.5 py-1 text-xs font-bold"
      >
        ✓
      </button>
      <button
        onClick={() => { setAdding(false); setName(''); }}
        className="rounded-lg p-1 text-[#304035]/40 hover:bg-[#304035]/5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── AddIntervenantModal ────────────────────────────────────────────────────

function AddIntervenantModal({
  defaultType, onClose, onCreate,
}: {
  defaultType: string;
  onClose: () => void;
  onCreate: (data: { type: string; name: string; phone: string; email: string; notes?: string }) => void;
}) {
  const [form, setForm] = useState({ type: defaultType, name: '', phone: '', email: '', notes: '' });
  return (
    <div onClick={onClose} className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-[#304035] mb-4">Nouvel intervenant ({defaultType})</h2>
        <div className="space-y-3">
          <select
            value={form.type}
            onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-[#304035]/12 px-3 py-2 text-sm"
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom *"
            className="w-full rounded-lg border border-[#304035]/12 px-3 py-2 text-sm"
            autoFocus
          />
          <input
            value={form.phone}
            onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Téléphone"
            className="w-full rounded-lg border border-[#304035]/12 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="w-full rounded-lg border border-[#304035]/12 px-3 py-2 text-sm"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes / spécialité"
            rows={2}
            className="w-full rounded-lg border border-[#304035]/12 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[#304035]/12 px-4 py-2 text-sm font-bold text-[#304035]/60">
            Annuler
          </button>
          <button
            onClick={() => form.name.trim() && onCreate(form)}
            disabled={!form.name.trim()}
            className="flex-1 rounded-lg bg-[#10b981] text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div onClick={onCancel} className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-[#304035] mb-2">Supprimer {name} ?</h2>
        <p className="text-sm text-[#304035]/60 mb-5">Cette action est irréversible (côté frontend local — le backend n'est pas touché).</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-[#304035]/12 px-4 py-2 text-sm font-bold text-[#304035]/60">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-bold">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
