'use client';

/**
 * CustomInterventionTypeModal — modale de création d'un métier custom
 * pour le planning gestion.
 *
 * Demande asso (19/05/2026) : "+ pouvoir rajouter manuellement un métier
 * si besoin" — quand un corps de métier ne figure pas dans les listes
 * prédéfinies (INTERVENTION_TYPES + OCCASIONAL_INTERVENTION_TYPES).
 *
 * L'utilisateur saisit : nom (obligatoire), emoji (palette prédéfinie ou
 * saisie libre), couleur (palette). Le métier est persisté dans le store
 * Planning et apparaît immédiatement dans la légende + sélecteur d'event.
 */

import { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';

const PRESET_COLORS = [
  '#5b9bd5', '#e07050', '#a78bfa', '#2ecc71', '#f59e0b',
  '#0ea5e9', '#dc2626', '#16a34a', '#8b5cf6', '#ea580c',
  '#0891b2', '#84cc16', '#ec4899', '#14b8a6', '#a67749',
];

const PRESET_ICONS = ['🔨', '🪚', '🪟', '🛋', '🧱', '🪵', '🎨', '⚡', '🔧', '🪣', '🔩', '📐', '🛠', '🪜', '🧰'];

interface Props {
  /** Liste des labels déjà utilisés (pour éviter les doublons). */
  existingLabels: string[];
  onConfirm: (data: { label: string; color: string; icon: string }) => void;
  onCancel: () => void;
}

export function CustomInterventionTypeModal({ existingLabels, onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const cleanLabel = label.trim();
    if (cleanLabel.length === 0) {
      setError('Le nom du métier est obligatoire.');
      return;
    }
    if (cleanLabel.length > 40) {
      setError('Le nom ne doit pas dépasser 40 caractères.');
      return;
    }
    const lower = cleanLabel.toLowerCase();
    if (existingLabels.some((l) => l.toLowerCase() === lower)) {
      setError(`Le métier "${cleanLabel}" existe déjà.`);
      return;
    }
    onConfirm({ label: cleanLabel, color, icon: icon.trim().slice(0, 4) || '🔨' });
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
          maxWidth: 460,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid rgba(48,64,53,0.08)',
            background: 'linear-gradient(135deg, #f9f6f2 0%, #fff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(166,119,73,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color="#a67749" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#304035' }}>
                Nouveau métier
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(48,64,53,0.55)' }}>
                Ajoutez un corps de métier qui n&apos;est pas dans la liste.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fermer"
            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(48,64,53,0.5)', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Nom */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Nom du métier *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setError(null); }}
              placeholder="Ex : Verrier d'art, Cordonnier industriel…"
              maxLength={40}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(48,64,53,0.15)',
                borderRadius: 10,
                fontSize: 13,
                color: '#304035',
                background: '#fafaf8',
                outline: 'none',
              }}
            />
          </div>

          {/* Icône */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Icône
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: `1.5px solid ${icon === emoji ? color : 'rgba(48,64,53,0.12)'}`,
                    background: icon === emoji ? color + '14' : '#fff',
                    fontSize: 18,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  aria-label={`Choisir icône ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ou saisir un emoji custom"
              maxLength={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid rgba(48,64,53,0.12)',
                borderRadius: 8,
                fontSize: 12,
                color: '#304035',
                background: '#fafaf8',
                outline: 'none',
              }}
            />
          </div>

          {/* Couleur */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Couleur
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '2px solid #304035' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: color === c ? `0 0 0 2px ${c}40` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={`Couleur ${c}`}
                >
                  {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              padding: '12px 14px',
              border: '1px solid rgba(48,64,53,0.08)',
              borderRadius: 12,
              background: 'rgba(48,64,53,0.03)',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Aperçu dans la légende
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(48,64,53,0.08)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#304035' }}>
                {icon || '🔨'} {label || 'Nom du métier'}
              </span>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10,
                fontSize: 12,
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid rgba(48,64,53,0.08)',
            background: '#fafaf8',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid rgba(48,64,53,0.15)',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: '#304035',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!label.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: label.trim() ? 'linear-gradient(135deg, #304035, #4a6358)' : 'rgba(48,64,53,0.2)',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              cursor: label.trim() ? 'pointer' : 'not-allowed',
              opacity: label.trim() ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={13} />
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
