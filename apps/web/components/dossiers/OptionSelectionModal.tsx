'use client';

/**
 * OptionSelectionModal — modale de choix des options à valider lors de
 * la signature d'un projet.
 *
 * Apparaît AVANT la DateButoireValidationModal quand le dossier source
 * contient des sous-dossiers de type "OPTION N" (cuisiniste),
 * "PROJET N" (menuisier) ou "PROJET VERSION N – APD" (architecte).
 *
 * L'utilisateur coche la (ou les) option(s) retenue(s) et peut donner
 * un nom personnalisé pour chacune (ex "CUISINE", "DRESSING") qui sera
 * intégré au libellé du sous-dossier signé final
 * (ex "OPTION 1 CUISINE VALIDÉE").
 *
 * Côté store : `selectedOptions` passé à `signProject` puis
 * `buildSignedSubfoldersForProfession` qui crée 1 sous-dossier signé
 * par option cochée, en copiant les documents source dedans.
 */

import { useState, useMemo } from 'react';
import { X, Check, FolderOpen, Folder } from 'lucide-react';
import type { Dossier, ValidatedOptionSelection } from '@/store/useDossierStore';
import {
  MENUISIER_PROJET_REGEX,
  CUISINISTE_OPTION_REGEX,
  ARCHITECTE_PROJET_VERSION_REGEX,
} from '@/store/useDossierStore';
import { childFolders, displayName } from '@/lib/folderTree';

/** Sous-dossier imbriqué (enfant direct) d'une option, sélectionnable. */
interface SubCandidate {
  /** Chemin complet (ex "PROJET VERSION 1 – APD ▸ APD 1"). */
  label: string;
  /** Nom affiché (dernier segment, ex "APD 1"). */
  name: string;
  docCount: number;
}

interface OptionCandidate {
  /** Label exact du sous-dossier source dans le dossier en cours. */
  sourceLabel: string;
  /** Nombre de documents dans le sous-dossier source (info utilisateur). */
  docCount: number;
  /** Numéro extrait par regex (1, 2, …) pour tri stable. */
  num: number;
  /** Sous-dossiers imbriqués (enfants directs) sélectionnables. */
  subFolders: SubCandidate[];
}

/**
 * Détecte les options candidates dans le dossier source selon la profession.
 * Cuisiniste → "OPTION N" / Menuisier → "PROJET N" / Architecte → "PROJET VERSION N – APD".
 */
function detectCandidates(
  dossier: Dossier,
  profession: string | null | undefined,
): OptionCandidate[] {
  const candidates: OptionCandidate[] = [];
  for (const sf of dossier.subfolders ?? []) {
    let match: RegExpMatchArray | null = null;
    if (profession === 'cuisiniste') {
      match = sf.label.match(CUISINISTE_OPTION_REGEX);
    } else if (profession === 'menuisier') {
      match = sf.label.match(MENUISIER_PROJET_REGEX);
    } else if (profession === 'architecte') {
      match = sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
      // Architecte : ne garder que les APD (les APS sont des étapes intermédiaires)
      if (match && match[2]?.toUpperCase() !== 'APD') match = null;
    }
    if (match) {
      const n = parseInt(match[1], 10);
      // Sous-dossiers imbriqués (enfants directs) de cette option — ex les
      // "APD 1", "APD 2"… créés dans un dossier APD. On passe par childFolders
      // (et non un filtre isDirectChild sur les subfolders bruts) pour inclure
      // AUSSI les dossiers "fantômes" (intermédiaires jamais créés explicitement
      // mais présents via un document profond) — sinon ils seraient invisibles et
      // silencieusement exclus lors d'une sélection partielle.
      const allLabels = (dossier.subfolders ?? []).map((s) => s.label);
      const subFolders: SubCandidate[] = childFolders(allLabels, sf.label)
        .map((path) => {
          const real = (dossier.subfolders ?? []).find((s) => s.label === path);
          return { label: path, name: displayName(path), docCount: real?.documents?.length ?? 0 };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));
      candidates.push({
        sourceLabel: sf.label,
        docCount: sf.documents?.length ?? 0,
        num: Number.isFinite(n) ? n : 0,
        subFolders,
      });
    }
  }
  return candidates.sort((a, b) => a.num - b.num);
}

interface Props {
  dossier: Dossier;
  profession: string | null | undefined;
  /** Callback : utilisateur a confirmé sa sélection (liste non vide). */
  onConfirm: (selected: ValidatedOptionSelection[]) => void;
  /** Callback : utilisateur a annulé (ferme la modale sans signer). */
  onCancel: () => void;
}

export function OptionSelectionModal({ dossier, profession, onConfirm, onCancel }: Props) {
  const candidates = useMemo(() => detectCandidates(dossier, profession), [dossier, profession]);

  // État local — par défaut, RIEN de coché (utilisateur doit choisir explicitement)
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  // Sous-dossiers : subChecked[optionLabel][subPath] = false si DÉCOCHÉ.
  // Par défaut (absent) = coché → tous inclus quand l'option est cochée.
  const [subChecked, setSubChecked] = useState<Record<string, Record<string, boolean>>>({});

  const selectedCount = Object.values(checked).filter(Boolean).length;
  const canConfirm = selectedCount > 0;

  const handleToggle = (sourceLabel: string) => {
    setChecked((s) => ({ ...s, [sourceLabel]: !s[sourceLabel] }));
  };

  const isSubChecked = (optLabel: string, subPath: string) =>
    subChecked[optLabel]?.[subPath] !== false;

  const toggleSub = (optLabel: string, subPath: string) => {
    setSubChecked((s) => {
      const cur = s[optLabel] ?? {};
      return { ...s, [optLabel]: { ...cur, [subPath]: cur[subPath] === false ? true : false } };
    });
  };

  const handleConfirm = () => {
    const selected: ValidatedOptionSelection[] = candidates
      .filter((c) => checked[c.sourceLabel])
      .map((c) => {
        const allSubs = c.subFolders.map((s) => s.label);
        const included = allSubs.filter((p) => isSubChecked(c.sourceLabel, p));
        // Tous inclus (ou aucun sous-dossier) → tout le dossier (undefined).
        // Sinon → seulement la sélection (peut être [] = parent seul).
        const includeSubPaths =
          allSubs.length === 0 || included.length === allSubs.length ? undefined : included;
        return {
          sourceLabel: c.sourceLabel,
          customName: customNames[c.sourceLabel]?.trim() || undefined,
          includeSubPaths,
        };
      });
    if (selected.length === 0) return;
    onConfirm(selected);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(48,64,53,0.08)',
            background: 'linear-gradient(135deg, #f9f6f2 0%, #fff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035', letterSpacing: '0.02em' }}>
              CHOISIR LE(S) OPTION(S) À VALIDER
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(48,64,53,0.55)' }}>
              Chaque option cochée deviendra un sous-dossier dédié dans le dossier signé.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fermer"
            style={{
              padding: 6,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'rgba(48,64,53,0.45)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {candidates.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                borderRadius: 14,
                border: '1px dashed rgba(48,64,53,0.18)',
                background: 'rgba(48,64,53,0.03)',
                textAlign: 'center',
                color: 'rgba(48,64,53,0.55)',
                fontSize: 13,
              }}
            >
              Aucune option détectée dans ce dossier.
              <br />
              <span style={{ fontSize: 11 }}>
                Ajoutez un sous-dossier {profession === 'cuisiniste' ? '« OPTION 1 »' : profession === 'menuisier' ? '« PROJET 1 »' : '« PROJET VERSION 1 – APD »'} pour activer la validation par option.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidates.map((c) => {
                const isChecked = !!checked[c.sourceLabel];
                return (
                  <label
                    key={c.sourceLabel}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: '12px 14px',
                      border: `1.5px solid ${isChecked ? '#a67749' : 'rgba(48,64,53,0.12)'}`,
                      borderRadius: 12,
                      background: isChecked ? 'rgba(166,119,73,0.06)' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Checkbox visuelle */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          border: `1.5px solid ${isChecked ? '#a67749' : 'rgba(48,64,53,0.3)'}`,
                          background: isChecked ? '#a67749' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(c.sourceLabel)}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                        aria-label={`Valider ${c.sourceLabel}`}
                      />
                      <FolderOpen size={15} color="#a67749" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#304035', flex: 1 }}>
                        {c.sourceLabel}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(48,64,53,0.5)' }}>
                        {c.docCount} doc{c.docCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Champ nom personnalisé — visible seulement si coché */}
                    {isChecked && (
                      <div
                        onClick={(e) => e.preventDefault()}
                        style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 28 }}
                      >
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Nom personnalisé (optionnel)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: CUISINE, DRESSING, SALON…"
                          value={customNames[c.sourceLabel] ?? ''}
                          onChange={(e) =>
                            setCustomNames((s) => ({ ...s, [c.sourceLabel]: e.target.value }))
                          }
                          onClick={(e) => e.stopPropagation()}
                          maxLength={40}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid rgba(48,64,53,0.15)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#304035',
                            background: '#fff',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.4)' }}>
                          Final : « {c.sourceLabel}{' '}
                          {customNames[c.sourceLabel]?.trim() ? customNames[c.sourceLabel]!.trim().toUpperCase() + ' ' : ''}
                          {profession === 'menuisier' ? 'VALIDÉ' : 'VALIDÉE'} »
                        </span>
                      </div>
                    )}

                    {/* Sous-dossiers imbriqués (APD 1, APD 2…) — visibles si coché.
                        Tous cochés par défaut = tout le dossier. Décocher = exclure. */}
                    {isChecked && c.subFolders.length > 0 && (
                      <div
                        onClick={(e) => e.preventDefault()}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Sous-dossiers à inclure ({c.subFolders.filter((s) => isSubChecked(c.sourceLabel, s.label)).length}/{c.subFolders.length})
                        </span>
                        {c.subFolders.map((s) => {
                          const on = isSubChecked(c.sourceLabel, s.label);
                          return (
                            <button
                              key={s.label}
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSub(c.sourceLabel, s.label); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 8px', borderRadius: 8,
                                border: `1px solid ${on ? 'rgba(166,119,73,0.35)' : 'rgba(48,64,53,0.12)'}`,
                                background: on ? 'rgba(166,119,73,0.05)' : '#fff',
                                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                              }}
                            >
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? '#a67749' : 'rgba(48,64,53,0.3)'}`, background: on ? '#a67749' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {on && <Check size={11} color="#fff" strokeWidth={3} />}
                              </div>
                              <Folder size={13} color="#a67749" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#304035', flex: 1 }}>{s.name}</span>
                              <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.5)' }}>{s.docCount} doc{s.docCount > 1 ? 's' : ''}</span>
                            </button>
                          );
                        })}
                        <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.4)' }}>
                          Décochez pour exclure un sous-dossier. Tous cochés = tout le dossier inclus.
                        </span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(48,64,53,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            background: '#fafaf8',
          }}
        >
          <span style={{ fontSize: 12, color: 'rgba(48,64,53,0.55)' }}>
            {selectedCount === 0
              ? 'Sélectionnez au moins une option'
              : `${selectedCount} option${selectedCount > 1 ? 's' : ''} sélectionnée${selectedCount > 1 ? 's' : ''}`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid rgba(48,64,53,0.15)',
                background: '#fff',
                fontSize: 13,
                fontWeight: 600,
                color: '#304035',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                background: canConfirm ? 'linear-gradient(135deg, #304035, #4a6358)' : 'rgba(48,64,53,0.2)',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                opacity: canConfirm ? 1 : 0.5,
              }}
            >
              Continuer →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
