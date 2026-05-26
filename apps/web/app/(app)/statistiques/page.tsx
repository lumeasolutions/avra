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

import { useMemo, useState } from 'react';
import { BarChart3, Clock, Lock, Table2, Users, Package } from 'lucide-react';
import { useDossierStore, useFacturationStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsGateModal } from '@/components/statistiques/StatsGateModal';
import { StatsTableauStatut } from '@/components/statistiques/StatsTableauStatut';
import { StatsTableauFournisseur } from '@/components/statistiques/StatsTableauFournisseur';
import { StatsTableauVendeur } from '@/components/statistiques/StatsTableauVendeur';

type TabKey = 'statut' | 'fournisseur' | 'vendeur';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'statut',      label: 'Tableau 1 — Statut',      icon: Table2 },
  { key: 'fournisseur', label: 'Tableau 2 — Fournisseur', icon: Package },
  { key: 'vendeur',     label: 'Tableau 3 — Vendeur',     icon: Users },
];

export default function StatistiquesPage() {
  const dossiers       = useDossierStore((s) => s.dossiers);
  const dossiersSignes = useDossierStore((s) => s.dossiersSignes);
  const dossiersPerdus = useDossierStore((s) => s.dossiersPerdus);
  const addDossierPrixLigne     = useDossierStore((s) => s.addDossierPrixLigne);
  const removeDossierPrixLigne  = useDossierStore((s) => s.removeDossierPrixLigne);
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

  const isGateOpen = missingDossiers.length > 0;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={<BarChart3 className="h-7 w-7" />}
        title="Statistiques"
        subtitle={
          isGateOpen
            ? `Accès verrouillé — ${missingDossiers.length} dossier${missingDossiers.length > 1 ? 's' : ''} à compléter`
            : 'Vue d’ensemble de l’activité'
        }
      />

      {/* GATE bloquant — couvre toute la page tant qu'il reste des dossiers
          signés sans lignes prix saisies. */}
      {isGateOpen && (
        <StatsGateModal
          missingDossiers={missingDossiers}
          allDevis={allDevis}
          onAddLigne={addDossierPrixLigne}
          onRemoveLigne={removeDossierPrixLigne}
          onAddLignesBulk={addDossierPrixLignesBulk}
          onSkipDossier={setDossierStatsSkipped}
        />
      )}

      {/* Si gate ouvert, on affiche un placeholder verrouillé sous le header
          (la modale capture l'interaction) — sinon les vrais tableaux. */}
      {isGateOpen ? (
        <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-10 text-center">
          <Lock className="h-10 w-10 text-[#a67749]/45 mx-auto mb-3" />
          <h3 className="font-bold text-[#304035] text-lg">Statistiques verrouillées</h3>
          <p className="text-sm text-[#304035]/55 mt-1 max-w-md mx-auto">
            Vous devez renseigner les prix d&apos;achat et de vente de tous vos dossiers
            signés avant d&apos;accéder aux tableaux statistiques.
          </p>
        </div>
      ) : (
        <>
          {/* StatsGate v2 — Banner watermark si des dossiers ont été reportés */}
          {skippedCount > 0 && (
            <div className="rounded-2xl border border-purple-300/40 bg-purple-50/50 p-3 px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-[#304035]">
                  <strong className="font-bold">{skippedCount} dossier{skippedCount > 1 ? 's reportés' : ' reporté'}</strong>
                  {' '}sans suivi marge — les statistiques ci-dessous sont basées sur les dossiers complétés uniquement.
                </span>
              </div>
              <button
                onClick={() => {
                  // Ré-active tous les dossiers reportés pour revenir au gate
                  dossiersSignes.forEach((d) => {
                    if (d.statsSkipped) setDossierStatsSkipped(d.id, false);
                  });
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
                    active
                      ? 'bg-[#304035] text-white shadow-md'
                      : 'text-[#304035]/55 hover:text-[#304035] hover:bg-[#304035]/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Contenu de l'onglet actif */}
          {tab === 'statut' && (
            <StatsTableauStatut
              dossiers={dossiers}
              dossiersSignes={dossiersSignes}
              dossiersPerdus={dossiersPerdus}
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
        </>
      )}
    </div>
  );
}
