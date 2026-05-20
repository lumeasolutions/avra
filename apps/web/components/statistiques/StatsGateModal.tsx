'use client';

/**
 * StatsGateModal — modale BLOQUANTE à l'entrée de /statistiques.
 *
 * Demande asso 19/05/2026 : impossible d'accéder aux tableaux statistiques
 * tant qu'au moins un dossier signé n'a pas ses prix achat HT + vente HT
 * renseignés ligne par ligne (par fournisseur).
 *
 * Architecture :
 *   - Liste des dossiers manquants à gauche (DOSSIER TURPIN, DEBUCHY, …)
 *   - Au clic sur un dossier → split panel à droite :
 *       • Récap "DEVIS VALIDÉS" + "CONFIRMATIONS VALIDÉES" (aide-mémoire)
 *       • Formulaire de saisie ligne par ligne (marque/fournisseur + achat + vente)
 *   - Pas de bouton Fermer (X) ni close-on-overlay tant que ≥1 dossier manquant
 *   - Dès que tout est saisi, la modale se ferme automatiquement
 */

import { useState, useMemo } from 'react';
import { Plus, Trash2, FolderOpen, AlertTriangle, ChevronRight, CheckCircle2, Euro, FileText, Package } from 'lucide-react';
import type { DossierSigne, DossierPrixLigne, ConfirmationFournisseur } from '@/store/useDossierStore';
import type { Devis } from '@/store/useFacturationStore';

interface Props {
  /** Dossiers signés qui n'ont pas (ou pas assez de) lignes prix. */
  missingDossiers: DossierSigne[];
  /** Tous les devis (pour afficher les ACCEPTÉ par dossier dans le récap). */
  allDevis: Devis[];
  /** Callback persistance : ajout d'une ligne sur le dossier. */
  onAddLigne: (dossierId: string, ligne: Omit<DossierPrixLigne, 'id'>) => void;
  /** Callback persistance : suppression d'une ligne. */
  onRemoveLigne: (dossierId: string, ligneId: string) => void;
}

export function StatsGateModal({ missingDossiers, allDevis, onAddLigne, onRemoveLigne }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(missingDossiers[0]?.id ?? null);

  // Formulaire de saisie d'une nouvelle ligne (état local)
  const [draftFournisseur, setDraftFournisseur] = useState('');
  const [draftAchat, setDraftAchat] = useState<string>('');
  const [draftVente, setDraftVente] = useState<string>('');

  const selected = useMemo(
    () => missingDossiers.find((d) => d.id === selectedId) ?? missingDossiers[0] ?? null,
    [missingDossiers, selectedId],
  );

  // Récup devis ACCEPTÉ du dossier (rappel des prix vendus)
  const devisValides = useMemo(
    () => (selected ? allDevis.filter((d) => d.dossierId === selected.id && d.statut === 'ACCEPTÉ') : []),
    [allDevis, selected],
  );

  // Récup confirmations VALIDÉES du dossier (rappel des prix achetés)
  const confirmsValidees: ConfirmationFournisseur[] = useMemo(
    () => (selected?.confirmations ?? []).filter((c) => c.validee),
    [selected],
  );

  const handleAddLigne = () => {
    if (!selected) return;
    const f = draftFournisseur.trim();
    const achat = parseFloat(draftAchat.replace(',', '.'));
    const vente = parseFloat(draftVente.replace(',', '.'));
    if (!f) return;
    if (!Number.isFinite(achat) || achat < 0) return;
    if (!Number.isFinite(vente) || vente < 0) return;
    onAddLigne(selected.id, { fournisseur: f, prixAchatHT: achat, prixVenteHT: vente });
    setDraftFournisseur('');
    setDraftAchat('');
    setDraftVente('');
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  if (!selected) return null;

  const selectedLignes = selected.prixLignes ?? [];
  const totalAchat = selectedLignes.reduce((s, l) => s + l.prixAchatHT, 0);
  const totalVente = selectedLignes.reduce((s, l) => s + l.prixVenteHT, 0);
  const marge = totalVente - totalAchat;
  const margePct = totalVente > 0 ? Math.round((marge / totalVente) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 70,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 1100,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.32)',
        }}
      >
        {/* Header alerte */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fff 100%)',
            borderBottom: '1px solid rgba(48,64,53,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Statistiques manquants <span style={{ fontWeight: 600, color: 'rgba(48,64,53,0.55)', textTransform: 'none' }}>(prix achat / prix vente)</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(48,64,53,0.65)' }}>
              {missingDossiers.length} dossier{missingDossiers.length > 1 ? 's' : ''} signé{missingDossiers.length > 1 ? 's' : ''} sans prix renseignés.
              <strong style={{ color: '#92400e' }}>{' '}Vous devez compléter chaque dossier pour accéder aux statistiques.</strong>
            </p>
          </div>
        </div>

        {/* Body split */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) 1fr', minHeight: 0 }}>
          {/* COLONNE GAUCHE — Liste des dossiers manquants */}
          <div
            style={{
              borderRight: '1px solid rgba(48,64,53,0.08)',
              background: '#fafaf8',
              overflowY: 'auto',
              padding: '14px',
            }}
          >
            <p style={{ margin: '0 0 10px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Dossiers à compléter
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {missingDossiers.map((d) => {
                const isSelected = d.id === selected.id;
                const hasLignes = (d.prixLignes?.length ?? 0) > 0;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? '#304035' : 'rgba(48,64,53,0.1)'}`,
                      background: isSelected ? '#fff' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s',
                    }}
                  >
                    <FolderOpen size={14} color={isSelected ? '#a67749' : 'rgba(48,64,53,0.5)'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#304035', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.name}{d.firstName ? ` ${d.firstName}` : ''}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: hasLignes ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {hasLignes ? `${d.prixLignes?.length} ligne${d.prixLignes!.length > 1 ? 's' : ''} ✓` : 'Aucune ligne'}
                      </p>
                    </div>
                    {isSelected && <ChevronRight size={14} color="#304035" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLONNE DROITE — Détail dossier sélectionné */}
          <div style={{ overflowY: 'auto', padding: '18px 22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800, color: '#304035' }}>
              {selected.name}{selected.firstName ? ` ${selected.firstName}` : ''}
            </h3>

            {/* Récap aide-mémoire — devis validés + confirmations validées */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {/* DEVIS VALIDÉS (aide-mémoire prix vente) */}
              <div style={{ padding: '12px 14px', background: 'rgba(166,119,73,0.06)', border: '1px solid rgba(166,119,73,0.2)', borderRadius: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: '#a67749', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={11} /> Devis validés
                </p>
                {devisValides.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(48,64,53,0.5)', fontStyle: 'italic' }}>Aucun devis accepté.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {devisValides.map((dv) => (
                      <li key={dv.id} style={{ fontSize: 11, color: '#304035', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Devis n°{dv.ref}</span>
                        <span style={{ fontWeight: 700 }}>{fmt(dv.totalHT)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CONFIRMATIONS VALIDÉES (aide-mémoire prix achat) */}
              <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Package size={11} /> Confirmations validées
                </p>
                {confirmsValidees.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(48,64,53,0.5)', fontStyle: 'italic' }}>Aucune confirmation validée.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {confirmsValidees.map((c) => (
                      <li key={c.id} style={{ fontSize: 11, color: '#304035', display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fournisseur}</span>
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>{c.montant ? fmt(c.montant) : '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Lignes déjà saisies + récap marge */}
            {selectedLignes.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Lignes saisies ({selectedLignes.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedLignes.map((l) => {
                    const m = l.prixVenteHT - l.prixAchatHT;
                    const mPct = l.prixVenteHT > 0 ? Math.round((m / l.prixVenteHT) * 100) : 0;
                    return (
                      <div
                        key={l.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#fff',
                          border: '1px solid rgba(48,64,53,0.08)',
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#304035' }}>{l.fournisseur}</span>
                        <span style={{ color: '#dc2626' }}>Achat {fmt(l.prixAchatHT)}</span>
                        <span style={{ color: '#16a34a' }}>Vente {fmt(l.prixVenteHT)}</span>
                        <span style={{ fontWeight: 700, color: m >= 0 ? '#16a34a' : '#dc2626' }}>
                          Marge {fmt(m)} ({mPct}%)
                        </span>
                        <button
                          onClick={() => onRemoveLigne(selected.id, l.id)}
                          style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(48,64,53,0.4)' }}
                          title="Retirer cette ligne"
                          aria-label="Retirer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {/* Totaux */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr auto', gap: 10, padding: '8px 12px', background: 'rgba(48,64,53,0.04)', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                    <span style={{ color: '#304035' }}>TOTAL</span>
                    <span style={{ color: '#dc2626' }}>{fmt(totalAchat)}</span>
                    <span style={{ color: '#16a34a' }}>{fmt(totalVente)}</span>
                    <span style={{ color: marge >= 0 ? '#16a34a' : '#dc2626' }}>
                      {fmt(marge)} ({margePct}%)
                    </span>
                    <span />
                  </div>
                </div>
              </div>
            )}

            {/* Formulaire ajout nouvelle ligne */}
            <div
              style={{
                padding: 14,
                border: '1.5px dashed rgba(166,119,73,0.4)',
                borderRadius: 12,
                background: 'rgba(166,119,73,0.04)',
              }}
            >
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#a67749', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> Ajouter une ligne fournisseur
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Marque / fournisseur
                  </label>
                  <input
                    type="text"
                    value={draftFournisseur}
                    onChange={(e) => setDraftFournisseur(e.target.value)}
                    placeholder="ex: LEICHT, MARBRIER…"
                    maxLength={50}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8, fontSize: 13, color: '#304035', background: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Prix achat HT
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={draftAchat}
                      onChange={(e) => setDraftAchat(e.target.value)}
                      placeholder="0"
                      min={0}
                      step="0.01"
                      style={{ width: '100%', padding: '8px 24px 8px 10px', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8, fontSize: 13, color: '#304035', background: '#fff', outline: 'none' }}
                    />
                    <Euro size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Prix vente HT
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={draftVente}
                      onChange={(e) => setDraftVente(e.target.value)}
                      placeholder="0"
                      min={0}
                      step="0.01"
                      style={{ width: '100%', padding: '8px 24px 8px 10px', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8, fontSize: 13, color: '#304035', background: '#fff', outline: 'none' }}
                    />
                    <Euro size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)' }} />
                  </div>
                </div>
                <button
                  onClick={handleAddLigne}
                  disabled={!draftFournisseur.trim() || !draftAchat || !draftVente}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: !draftFournisseur.trim() || !draftAchat || !draftVente ? 'rgba(166,119,73,0.3)' : 'linear-gradient(135deg, #a67749, #d4b882)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: !draftFournisseur.trim() || !draftAchat || !draftVente ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            </div>

            {/* Statut du dossier — completed si ≥1 ligne */}
            {selectedLignes.length > 0 && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} color="#16a34a" />
                <p style={{ margin: 0, fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                  Dossier complété — vous pouvez passer au suivant ou ajouter d&apos;autres lignes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info — pas de bouton fermer tant qu'il reste des dossiers manquants */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid rgba(48,64,53,0.08)',
            background: '#fafaf8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'rgba(48,64,53,0.6)',
          }}
        >
          <span>
            <strong style={{ color: '#92400e' }}>Modale obligatoire</strong> — l&apos;accès aux statistiques est verrouillé tant que tous les dossiers signés n&apos;ont pas leurs prix.
          </span>
          <span style={{ fontWeight: 700, color: '#304035' }}>
            {missingDossiers.length} dossier{missingDossiers.length > 1 ? 's' : ''} restant{missingDossiers.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
