'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, Profession } from '@/store/useAuthStore';

const PORTAILS = [
  {
    id: 'architecte' as Profession,
    emoji: '🏛️',
    titre: 'Architecte d\'intérieur',
    description: 'Gestion de projets déco, plans, suivi de chantier, dossiers clients, e-signature et facturation.',
    couleur: '#3D5449',
    couleurLight: '#EAF0EC',
    gradient: 'linear-gradient(135deg, #3D5449 0%, #2C3E2F 100%)',
    tags: ['Dossiers projets', 'Plans & visuels', 'Devis & facturation', 'E-signature'],
  },
  {
    id: 'menuisier' as Profession,
    emoji: '🪵',
    titre: 'Menuisier',
    description: 'Suivi des commandes bois, gestion des chantiers, devis matériaux, planning atelier et livraisons.',
    couleur: '#7B4F2E',
    couleurLight: '#F5EDE5',
    gradient: 'linear-gradient(135deg, #7B4F2E 0%, #5C3820 100%)',
    tags: ['Commandes bois', 'Planning atelier', 'Devis matériaux', 'Suivi chantier'],
  },
  {
    id: 'cuisiniste' as Profession,
    emoji: '🍳',
    titre: 'Cuisiniste',
    description: 'Conception cuisines, gestion poses, suivi SAV, catalogue produits et planification des techniciens.',
    couleur: '#1A3A5C',
    couleurLight: '#E5EDF5',
    gradient: 'linear-gradient(135deg, #1A3A5C 0%, #0F2540 100%)',
    tags: ['Conception cuisines', 'Planning pose', 'SAV & garanties', 'Catalogue produits'],
  },
];

export default function PortalSelectPage() {
  const setProfession = useAuthStore(s => s.setProfession);
  const profession = useAuthStore(s => s.profession);
  const user = useAuthStore(s => s.user);
  const [selected, setSelected] = useState<Profession>(null);
  const [loading, setLoading] = useState(false);

  // Si portail déjà défini → rediriger directement
  useEffect(() => {
    if (profession) {
      window.location.href = `/portail-${profession}`;
    }
  }, [profession]);

  const handleSelect = (id: Profession) => {
    setSelected(id);
  };

  const handleConfirm = () => {
    if (!selected) return;
    setLoading(true);
    setProfession(selected);
    setTimeout(() => {
      window.location.href = `/portail-${selected}`;
    }, 400);
  };

  const prenom = user?.firstName ?? 'là';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1E2D22 0%, #2C3E2F 40%, #1A2E35 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      {/* En-tête */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: '2px solid #C49A3C',
          background: 'rgba(196,154,60,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: 28,
        }}>
          🦉
        </div>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>
          AVRA
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, marginBottom: 4 }}>
          Bienvenue{prenom !== 'là' ? `, ${prenom}` : ''} !
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17, fontWeight: 600 }}>
          Choisissez votre portail métier
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>
          Votre espace sera personnalisé selon votre profession
        </p>
      </div>

      {/* Cartes portails */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: 20,
        maxWidth: 920,
        width: '100%',
        marginBottom: 36,
      }}>
        {PORTAILS.map(p => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              style={{
                background: isSelected ? p.gradient : 'rgba(255,255,255,0.06)',
                border: isSelected ? `2px solid ${p.couleur}` : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '28px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s ease',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                boxShadow: isSelected ? `0 12px 40px ${p.couleur}55` : '0 2px 12px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Checkmark */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: 'white', fontWeight: 700,
                }}>✓</div>
              )}

              {/* Icône */}
              <div style={{
                fontSize: 36,
                marginBottom: 14,
                display: 'block',
              }}>{p.emoji}</div>

              {/* Titre */}
              <div style={{
                color: 'white',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 10,
                letterSpacing: 0.3,
              }}>{p.titre}</div>

              {/* Description */}
              <div style={{
                color: isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 16,
              }}>{p.description}</div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                    color: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}>{tag}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bouton confirmer */}
      <button
        onClick={handleConfirm}
        disabled={!selected || loading}
        style={{
          padding: '14px 48px',
          borderRadius: 14,
          background: selected ? 'linear-gradient(135deg, #C49A3C, #8B6914)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          color: selected ? 'white' : 'rgba(255,255,255,0.3)',
          fontSize: 15,
          fontWeight: 700,
          cursor: selected ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          letterSpacing: 0.5,
          minWidth: 220,
          boxShadow: selected ? '0 8px 24px rgba(196,154,60,0.4)' : 'none',
          transform: selected && !loading ? 'none' : 'none',
        }}
      >
        {loading ? '⏳ Chargement…' : selected ? `Accéder à mon portail ${PORTAILS.find(p => p.id === selected)?.emoji ?? ''}` : 'Sélectionnez un portail'}
      </button>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 20 }}>
        Vous pourrez changer de portail depuis vos paramètres
      </p>
    </div>
  );
}
