'use client';

/**
 * StatsManualEntryModal — modale légère, NON bloquante.
 *
 * Permet la saisie OPTIONNELLE des prixLignes (achat/vente HT) sur les
 * dossiers en cours et perdus depuis le Tableau 1 Statut (audit 26/05/2026).
 *
 * Différences avec StatsGateModal :
 *  - Non bloquante : bouton X de fermeture toujours disponible
 *  - Pas d'auto-import / pas de snooze (seuls les dossiers signés ont des
 *    confirmations à importer)
 *  - Vue compacte : liste des dossiers concernés, click pour développer la
 *    saisie ligne par ligne
 *  - Sauvegarde immédiate à chaque ajout/suppression (pas de bouton "Valider"
 *    global — l'utilisateur ferme quand il a fini)
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { X, Plus, Trash2, FolderOpen, Euro, ChevronDown, ChevronRight } from 'lucide-react';
import type { Dossier, DossierPerdu, DossierPrixLigne } from '@/store/useDossierStore';

interface Props {
  /** Titre de la modale (ex: "Renseigner les dossiers EN COURS"). */
  title: string;
  /** Couleur de l'accent (vert pour signé, bleu pour en cours, rouge pour perdu). */
  accentColor: string;
  /** Dossiers à éditer (Dossier en cours, DossierPerdu ou DossierSigne). */
  dossiers: Array<Dossier | DossierPerdu>;
  onAddLigne: (dossierId: string, ligne: Omit<DossierPrixLigne, 'id'>) => void;
  onRemoveLigne: (dossierId: string, ligneId: string) => void;
  /**
   * Édition inline d'une ligne existante (26/05/2026). Si non fourni, les
   * lignes existantes restent affichées en lecture seule (seul l'ajout est
   * possible). Si fourni, chaque cellule devient un input editable qui
   * sauvegarde au blur.
   */
  onUpdateLigne?: (dossierId: string, ligneId: string, patch: Partial<Omit<DossierPrixLigne, 'id'>>) => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Draft { fournisseur: string; achat: string; vente: string; }
const EMPTY_DRAFT: Draft = { fournisseur: '', achat: '', vente: '' };

export function StatsManualEntryModal({
  title, accentColor, dossiers, onAddLigne, onRemoveLigne, onUpdateLigne, onClose,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(dossiers[0]?.id ?? null);
  const [draftByDossier, setDraftByDossier] = useState<Record<string, Draft>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDraft = useCallback(
    (id: string): Draft => draftByDossier[id] ?? EMPTY_DRAFT,
    [draftByDossier],
  );
  const setDraft = useCallback((id: string, patch: Partial<Draft>) => {
    setDraftByDossier((prev) => ({ ...prev, [id]: { ...getDraft(id), ...patch } }));
  }, [getDraft]);

  const handleAdd = useCallback((dossierId: string) => {
    const d = getDraft(dossierId);
    const achat = parseFloat(d.achat.replace(',', '.'));
    const vente = parseFloat(d.vente.replace(',', '.'));
    if (!d.fournisseur.trim()) return;
    if (!Number.isFinite(achat) || achat < 0) return;
    if (!Number.isFinite(vente) || vente < 0) return;
    onAddLigne(dossierId, { fournisseur: d.fournisseur.trim(), prixAchatHT: achat, prixVenteHT: vente });
    setDraftByDossier((prev) => ({ ...prev, [dossierId]: EMPTY_DRAFT }));
    setTimeout(() => inputRefs.current[dossierId]?.focus(), 0);
  }, [getDraft, onAddLigne]);

  // Totaux globaux pour le footer
  const totals = useMemo(() => {
    let achat = 0, vente = 0, lignes = 0;
    for (const d of dossiers) {
      for (const l of (d.prixLignes ?? [])) {
        achat += l.prixAchatHT;
        vente += l.prixVenteHT;
        lignes++;
      }
    }
    return { achat, vente, marge: vente - achat, lignes };
  }, [dossiers]);

  return (
    <>
      <style>{`
        @keyframes smeFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes smeScaleIn { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .sme-overlay { animation: smeFadeIn 0.25s ease-out; }
        .sme-card { animation: smeScaleIn 0.32s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div
        className="sme-overlay"
        onClick={onClose}
        style={{
          // Fix viewport 26/05/2026 — voir StatsGateModal pour la justification.
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          minWidth: '100vw', minHeight: '100vh',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 65, padding: 16,
          overflowY: 'auto',
        }}
      >
        <div
          className="sme-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 18, width: '100%', maxWidth: 880,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 28px 70px rgba(0,0,0,0.32)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(48,64,53,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${accentColor}10 0%, #fff 100%)`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: accentColor,
              }} />
              <h2 style={{
                margin: 0, fontSize: 15, fontWeight: 800, color: '#304035',
                letterSpacing: '0.02em', textTransform: 'uppercase',
              }}>
                {title}
              </h2>
              <span style={{
                marginLeft: 6, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(48,64,53,0.08)', color: '#304035',
                fontSize: 11, fontWeight: 700,
              }}>
                {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: 'rgba(48,64,53,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Liste accordéon des dossiers */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 16px',
            background: '#fafaf8',
          }}>
            {dossiers.length === 0 ? (
              <p style={{
                margin: '32px 0', textAlign: 'center', fontSize: 13,
                color: 'rgba(48,64,53,0.5)', fontStyle: 'italic',
              }}>
                Aucun dossier dans cette catégorie.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dossiers.map((d) => {
                  const expanded = expandedId === d.id;
                  const lignes = d.prixLignes ?? [];
                  const sumAchat = lignes.reduce((s, l) => s + l.prixAchatHT, 0);
                  const sumVente = lignes.reduce((s, l) => s + l.prixVenteHT, 0);
                  const draft = getDraft(d.id);
                  const Chevron = expanded ? ChevronDown : ChevronRight;
                  const draftValid =
                    !!draft.fournisseur.trim() &&
                    Number.isFinite(parseFloat(draft.achat.replace(',', '.'))) &&
                    Number.isFinite(parseFloat(draft.vente.replace(',', '.')));
                  return (
                    <div
                      key={d.id}
                      style={{
                        border: `1px solid ${expanded ? accentColor : 'rgba(48,64,53,0.1)'}`,
                        borderRadius: 12, background: '#fff', overflow: 'hidden',
                      }}
                    >
                      {/* Header dossier — cliquable pour étendre */}
                      <button
                        onClick={() => setExpandedId(expanded ? null : d.id)}
                        style={{
                          width: '100%', padding: '10px 14px',
                          background: expanded ? `${accentColor}08` : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}
                      >
                        <Chevron size={14} color={accentColor} />
                        <FolderOpen size={14} color="rgba(48,64,53,0.5)" />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#304035' }}>
                          {d.name}{('firstName' in d && d.firstName) ? ` ${d.firstName}` : ''}
                        </span>
                        <span style={{
                          fontSize: 11, color: lignes.length > 0 ? accentColor : 'rgba(48,64,53,0.4)',
                          fontWeight: 600,
                        }}>
                          {lignes.length === 0 ? 'Aucune ligne' : `${lignes.length} ligne${lignes.length > 1 ? 's' : ''}`}
                        </span>
                        {lignes.length > 0 && (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginLeft: 8 }}>
                            Marge {fmt(sumVente - sumAchat)}
                          </span>
                        )}
                      </button>

                      {/* Corps étendu */}
                      {expanded && (
                        <div style={{ padding: '8px 14px 12px', borderTop: '1px dashed rgba(48,64,53,0.08)' }}>
                          {/* Lignes existantes */}
                          {lignes.length > 0 && (
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: 5,
                              marginBottom: 10,
                            }}>
                              {lignes.map((l) => {
                                const m = l.prixVenteHT - l.prixAchatHT;
                                const canEdit = !!onUpdateLigne;
                                // Style commun input vs span (édition inline 26/05/2026)
                                const inputStyle: React.CSSProperties = {
                                  padding: '4px 6px', borderRadius: 6,
                                  border: '1px solid transparent',
                                  background: 'transparent', fontSize: 12,
                                  color: '#304035', outline: 'none',
                                  width: '100%', minWidth: 0, fontFamily: 'inherit',
                                };
                                const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
                                  e.currentTarget.style.background = '#fff';
                                  e.currentTarget.style.borderColor = 'rgba(166,119,73,0.4)';
                                };
                                const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'transparent';
                                };
                                return (
                                  <div
                                    key={l.id}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto',
                                      gap: 8, alignItems: 'center',
                                      padding: '6px 10px',
                                      background: '#fafaf8', borderRadius: 8, fontSize: 12,
                                    }}
                                  >
                                    {/* Fournisseur — éditable inline si onUpdateLigne fourni */}
                                    {canEdit ? (
                                      <input
                                        type="text"
                                        defaultValue={l.fournisseur}
                                        maxLength={50}
                                        style={{ ...inputStyle, fontWeight: 700 }}
                                        onFocus={inputFocusStyle}
                                        onBlur={(e) => {
                                          inputBlurStyle(e);
                                          const v = e.currentTarget.value.trim();
                                          if (v && v !== l.fournisseur) {
                                            onUpdateLigne!(d.id, l.id, { fournisseur: v });
                                          } else if (!v) {
                                            // si vidé, on restore l'ancienne valeur visuellement
                                            e.currentTarget.value = l.fournisseur;
                                          }
                                        }}
                                        title="Modifier le fournisseur — sauvegarde au blur"
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 700, color: '#304035' }}>{l.fournisseur}</span>
                                    )}

                                    {/* Achat HT — éditable inline */}
                                    {canEdit ? (
                                      <input
                                        type="number"
                                        defaultValue={l.prixAchatHT}
                                        min={0}
                                        step="0.01"
                                        style={{ ...inputStyle, color: '#dc2626', fontWeight: 600 }}
                                        onFocus={inputFocusStyle}
                                        onBlur={(e) => {
                                          inputBlurStyle(e);
                                          const v = parseFloat(e.currentTarget.value.replace(',', '.'));
                                          if (Number.isFinite(v) && v >= 0 && v !== l.prixAchatHT) {
                                            onUpdateLigne!(d.id, l.id, { prixAchatHT: v });
                                          } else if (!Number.isFinite(v)) {
                                            e.currentTarget.value = String(l.prixAchatHT);
                                          }
                                        }}
                                        title="Modifier le prix achat HT — sauvegarde au blur"
                                      />
                                    ) : (
                                      <span style={{ color: '#dc2626' }}>Achat {fmt(l.prixAchatHT)}</span>
                                    )}

                                    {/* Vente HT — éditable inline */}
                                    {canEdit ? (
                                      <input
                                        type="number"
                                        defaultValue={l.prixVenteHT}
                                        min={0}
                                        step="0.01"
                                        style={{ ...inputStyle, color: '#16a34a', fontWeight: 600 }}
                                        onFocus={inputFocusStyle}
                                        onBlur={(e) => {
                                          inputBlurStyle(e);
                                          const v = parseFloat(e.currentTarget.value.replace(',', '.'));
                                          if (Number.isFinite(v) && v >= 0 && v !== l.prixVenteHT) {
                                            onUpdateLigne!(d.id, l.id, { prixVenteHT: v });
                                          } else if (!Number.isFinite(v)) {
                                            e.currentTarget.value = String(l.prixVenteHT);
                                          }
                                        }}
                                        title="Modifier le prix vente HT — sauvegarde au blur"
                                      />
                                    ) : (
                                      <span style={{ color: '#16a34a' }}>Vente {fmt(l.prixVenteHT)}</span>
                                    )}

                                    {/* Marge calculée — lecture seule, recalculée à chaque update */}
                                    <span style={{ fontWeight: 700, color: m >= 0 ? '#16a34a' : '#dc2626' }}>
                                      Marge {fmt(m)}
                                    </span>
                                    <button
                                      onClick={() => onRemoveLigne(d.id, l.id)}
                                      style={{
                                        padding: 4, borderRadius: 5, border: 'none',
                                        background: 'transparent', cursor: 'pointer',
                                        color: 'rgba(48,64,53,0.4)',
                                      }}
                                      title="Retirer cette ligne"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Formulaire ajout */}
                          <div
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAdd(d.id); }
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.5fr 1fr 1fr auto',
                              gap: 6, alignItems: 'center',
                            }}
                          >
                            <input
                              ref={(el) => { inputRefs.current[d.id] = el; }}
                              type="text"
                              value={draft.fournisseur}
                              onChange={(e) => setDraft(d.id, { fournisseur: e.target.value })}
                              placeholder="Marque / fournisseur"
                              maxLength={50}
                              style={{
                                padding: '7px 10px',
                                border: '1px solid rgba(48,64,53,0.15)', borderRadius: 7,
                                fontSize: 12, color: '#304035', background: '#fff', outline: 'none',
                              }}
                            />
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                value={draft.achat}
                                onChange={(e) => setDraft(d.id, { achat: e.target.value })}
                                placeholder="Achat HT"
                                min={0}
                                step="0.01"
                                style={{
                                  width: '100%', padding: '7px 22px 7px 10px',
                                  border: '1px solid rgba(48,64,53,0.15)', borderRadius: 7,
                                  fontSize: 12, color: '#304035', background: '#fff', outline: 'none',
                                }}
                              />
                              <Euro size={10} style={{
                                position: 'absolute', right: 7, top: '50%',
                                transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)',
                              }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                value={draft.vente}
                                onChange={(e) => setDraft(d.id, { vente: e.target.value })}
                                placeholder="Vente HT"
                                min={0}
                                step="0.01"
                                style={{
                                  width: '100%', padding: '7px 22px 7px 10px',
                                  border: '1px solid rgba(48,64,53,0.15)', borderRadius: 7,
                                  fontSize: 12, color: '#304035', background: '#fff', outline: 'none',
                                }}
                              />
                              <Euro size={10} style={{
                                position: 'absolute', right: 7, top: '50%',
                                transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)',
                              }} />
                            </div>
                            <button
                              onClick={() => handleAdd(d.id)}
                              disabled={!draftValid}
                              style={{
                                padding: '7px 12px', borderRadius: 7, border: 'none',
                                background: !draftValid ? 'rgba(48,64,53,0.15)' : accentColor,
                                fontSize: 11, fontWeight: 700, color: '#fff',
                                cursor: !draftValid ? 'not-allowed' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Plus size={12} /> Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer totaux */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid rgba(48,64,53,0.08)',
            background: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, fontSize: 12, flexShrink: 0,
          }}>
            <span style={{ color: 'rgba(48,64,53,0.6)' }}>
              {totals.lignes} ligne{totals.lignes > 1 ? 's' : ''} saisie{totals.lignes > 1 ? 's' : ''}
            </span>
            {totals.lignes > 0 && (
              <span style={{ display: 'flex', gap: 16, fontWeight: 700 }}>
                <span style={{ color: '#dc2626' }}>Achat {fmt(totals.achat)}</span>
                <span style={{ color: '#16a34a' }}>Vente {fmt(totals.vente)}</span>
                <span style={{ color: totals.marge >= 0 ? '#16a34a' : '#dc2626' }}>
                  Marge {fmt(totals.marge)}
                </span>
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: '#304035', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
