'use client';

/**
 * Page Statistiques — refonte 19/05/2026 (demande asso).
 *
 * Architecture :
 *   1. GATE BLOQUANT : si un seul dossier signé n'a pas de prixLignes saisies,
 *      modale obligatoire (StatsGateModal) qui force la saisie ligne par ligne
 *      (par marque/fournisseur). Tant que la liste n'est pas vide, l'accès
 *      aux tableaux est verrouillé. Même principe que la validation projet
 *      (saisie des dates butoires obligatoire avant de signer).
 *
 *   2. 3 onglets TABLEAU 1 / 2 / 3 :
 *      - TABLEAU 1 : par STATUT (vendu / en cours / perdu) + camembert
 *      - TABLEAU 2 : par FOURNISSEUR (Franke, Bora, Lapalma, …) + recherche + barres
 *      - TABLEAU 3 : par VENDEUR (Cassandra, Sylvie, …) + taux conversion + camembert
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Clock, AlertTriangle, Table2, Users, Package, FolderCheck } from 'lucide-react';
import { useDossierStore, useFacturationStore, useVisibleDossiers, useVisibleDossiersSignes, useVisibleDossiersPerdus } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsGateModal } from '@/components/statistiques/StatsGateModal';
import { StatsOverview } from '@/components/statistiques/StatsOverview';
import { StatsTableauFournisseur } from '@/components/statistiques/StatsTableauFournisseur';
import { StatsTableauVendeur } from '@/components/statistiques/StatsTableauVendeur';
import { StatsTableauDossier } from '@/components/statistiques/StatsTableauDossier';

type TabKey = 'statut' | 'dossier' | 'fournisseur' | 'vendeur';

const TABS: { key: TabKey; label: string; short: string; icon: React.ElementType }[] = [
  { key: 'statut',      label: 'Vue d’ensemble',         short: 'Ensemble',    icon: Table2 },
  { key: 'dossier',     label: 'Par dossier',            short: 'Dossier',     icon: FolderCheck },
  { key: 'fournisseur', label: 'Par fournisseur',        short: 'Fournisseur', icon: Package },
  { key: 'vendeur',     label: 'Par vendeur',            short: 'Vendeur',     icon: Users },
];

export default function StatistiquesPage() {
  const dossiers       = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const dossiersPerdus = useVisibleDossiersPerdus();
  const addDossierPrixLigne     = useDossierStore((s) => s.addDossierPrixLigne);
  const removeDossierPrixLigne  = useDossierStore((s) => s.removeDossierPrixLigne);
  const updateDossierPrixLigne  = useDossierStore((s) => s.updateDossierPrixLigne);
  const addDossierPrixLignesBulk = useDossierStore((s) => s.addDossierPrixLignesBulk);
  const setDossierStatsSkipped  = useDossierStore((s) => s.setDossierStatsSkipped);

  const allDevis = useFacturationStore((s) => s.devis);

  const [tab, setTab] = useState<TabKey>('statut');

  // Dossiers signés sans aucune ligne de prix ET non reportés → gate à compléter.
  // statsSkipped (StatsGate v2) : permet de débloquer l'accès aux stats même si
  // un dossier historique n'a pas l'info dispo. Le dossier reste dans les stats
  // mais avec un drapeau "données incomplètes".
  const missingDossiers = useMemo(
    () => dossiersSignes.filter((d) => (d.prixLignes?.length ?? 0) === 0 && !d.statsSkipped),
    [dossiersSignes],
  );
  const skippedCount = useMemo(
    () => dossiersSignes.filter((d) => d.statsSkipped && (d.prixLignes?.length ?? 0) === 0).length,
    [dossiersSignes],
  );

  // Plus de blocage : les stats sont toujours accessibles. La saisie des prix
  // s'ouvre À LA DEMANDE (non bloquante) OU automatiquement à l'arrivée si des
  // dossiers signés sont sans prix — mais la modale reste fermable (incitatif,
  // pas obligatoire). L'auto-ouverture ne se déclenche qu'une seule fois.
  const [showSignedGate, setShowSignedGate] = useState(false);
  // Révision/correction ciblée : ouvre le gate sur des dossiers PRÉCIS (déjà
  // renseignés) pour corriger une erreur de saisie. null = comportement gate
  // normal (dossiers manquants).
  const [reviewDossierIds, setReviewDossierIds] = useState<string[] | null>(null);
  const openPriceEditor = (dossierId?: string) => {
    setReviewDossierIds(dossierId ? [dossierId] : dossiersSignes.map((d) => d.id));
    setShowSignedGate(true);
  };
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenedRef.current && missingDossiers.length > 0) {
      autoOpenedRef.current = true;
      setShowSignedGate(true);
    }
  }, [missingDossiers.length]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={<BarChart3 className="h-7 w-7" />}
        title="Statistiques"
        subtitle="Vue d’ensemble de l’activité"
      />

      {/* Rappel NON bloquant : prix manquants sur des dossiers signés. */}
      {missingDossiers.length > 0 && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/60 p-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-[#304035]">
              <strong className="font-bold">{missingDossiers.length} dossier{missingDossiers.length > 1 ? 's' : ''} signé{missingDossiers.length > 1 ? 's' : ''} sans prix</strong>
              {' '}— renseignez-les pour un CA et une marge exacts.
            </span>
          </div>
          <button
            onClick={() => setShowSignedGate(true)}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 underline whitespace-nowrap"
          >
            Renseigner →
          </button>
        </div>
      )}

      {/* Dossiers reportés (sans suivi marge). */}
      {skippedCount > 0 && (
        <div className="rounded-2xl border border-purple-300/40 bg-purple-50/50 p-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="text-[#304035]">
              <strong className="font-bold">{skippedCount} dossier{skippedCount > 1 ? 's reportés' : ' reporté'}</strong>
              {' '}sans suivi marge.
            </span>
          </div>
          <button
            onClick={() => {
              dossiersSignes.forEach((d) => { if (d.statsSkipped) setDossierStatsSkipped(d.id, false); });
              setShowSignedGate(true);
            }}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 underline whitespace-nowrap"
          >
            Compléter maintenant →
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-1.5 flex gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active ? 'bg-[#304035] text-white shadow-md' : 'text-[#304035]/55 hover:text-[#304035] hover:bg-[#304035]/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      {tab === 'statut' && (
        <StatsOverview
          dossiers={dossiers}
          dossiersSignes={dossiersSignes}
          dossiersPerdus={dossiersPerdus}
          onRenseignerSignes={() => setShowSignedGate(true)}
        />
      )}
      {tab === 'dossier' && (
        <StatsTableauDossier
          dossiersSignes={dossiersSignes}
          onEditDossier={(id) => openPriceEditor(id)}
          onEditAll={() => openPriceEditor()}
        />
      )}
      {tab === 'fournisseur' && (
        <StatsTableauFournisseur dossiersSignes={dossiersSignes} />
      )}
      {tab === 'vendeur' && (
        <StatsTableauVendeur
          dossiers={dossiers}
          dossiersSignes={dossiersSignes}
          dossiersPerdus={dossiersPerdus}
        />
      )}

      {/* Saisie des prix SIGNÉS (série rapide + auto-import), NON bloquante. */}
      {showSignedGate && (
        <StatsGateModal
          missingDossiers={
            reviewDossierIds
              ? dossiersSignes.filter((d) => reviewDossierIds.includes(d.id))
              : (missingDossiers.length > 0 ? missingDossiers : dossiersSignes)
          }
          allSignes={dossiersSignes}
          dossiersEnCours={dossiers}
          dossiersPerdus={dossiersPerdus}
          allDevis={allDevis}
          onAddLigne={addDossierPrixLigne}
          onRemoveLigne={removeDossierPrixLigne}
          onUpdateLigne={updateDossierPrixLigne}
          onAddLignesBulk={addDossierPrixLignesBulk}
          onSkipDossier={setDossierStatsSkipped}
          onDone={() => { setShowSignedGate(false); setReviewDossierIds(null); }}
        />
      )}
    </div>
  );
}
