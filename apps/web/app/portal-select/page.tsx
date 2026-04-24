'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, Profession } from '@/store/useAuthStore';

const PORTAILS = [
  {
    id: 'architecte' as Profession,
    emoji: '🏛️',
    titre: "Architecte d'intérieur",
    description: 'Gestion de projets déco, plans, suivi de chantier, dossiers clients, e-signature et facturation.',
    couleur: '#6b8e73',
    couleurDark: '#3D5449',
    gradient: 'linear-gradient(135deg, #6b8e73 0%, #3D5449 55%, #2C3E2F 100%)',
    glowColor: 'rgba(107,142,115,0.55)',
    tags: ['Dossiers projets', 'Plans & visuels', 'Devis & facturation', 'E-signature'],
  },
  {
    id: 'menuisier' as Profession,
    emoji: '🪵',
    titre: 'Menuisier',
    description: 'Suivi des commandes bois, gestion des chantiers, devis matériaux, planning atelier et livraisons.',
    couleur: '#c08a5a',
    couleurDark: '#7B4F2E',
    gradient: 'linear-gradient(135deg, #d9b38a 0%, #a67749 50%, #7B4F2E 100%)',
    glowColor: 'rgba(192,138,90,0.55)',
    tags: ['Commandes bois', 'Planning atelier', 'Devis matériaux', 'Suivi chantier'],
  },
  {
    id: 'cuisiniste' as Profession,
    emoji: '🍳',
    titre: 'Cuisiniste',
    description: 'Conception cuisines, gestion poses, suivi SAV, catalogue produits et planification des techniciens.',
    couleur: '#4a7ec0',
    couleurDark: '#1A3A5C',
    gradient: 'linear-gradient(135deg, #4a7ec0 0%, #1A3A5C 55%, #0F2540 100%)',
    glowColor: 'rgba(74,126,192,0.55)',
    tags: ['Conception cuisines', 'Planning pose', 'SAV & garanties', 'Catalogue produits'],
  },
];

export default function PortalSelectPage() {
  const setProfession = useAuthStore(s => s.setProfession);
  const profession = useAuthStore(s => s.profession);
  const user = useAuthStore(s => s.user);
  const [selected, setSelected] = useState<Profession>(null);
  const [loading, setLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (profession) {
      window.location.href = `/portail-${profession}`;
    }
  }, [profession]);

  const handleSelect = (id: Profession) => setSelected(id);

  const handleConfirm = () => {
    if (!selected) return;
    setConfetti(true);
    setLoading(true);
    setProfession(selected);
    setTimeout(() => {
      window.location.href = `/portail-${selected}`;
    }, 900);
  };

  const prenom = user?.firstName ?? 'là';
  const selectedPortail = PORTAILS.find(p => p.id === selected);

  return (
    <div
      className="ps-wrap"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes psAurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes psFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes psPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,179,138,0.55), 0 0 40px rgba(217,179,138,0.4); }
          50%      { box-shadow: 0 0 0 16px rgba(217,179,138,0), 0 0 60px rgba(217,179,138,0.6); }
        }
        @keyframes psFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes psShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes psTwinkle {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.5); }
        }
        @keyframes psOrb {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(40px,-30px) scale(1.15); }
          66%  { transform: translate(-30px,25px) scale(0.9); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes psConfetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes psRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .ps-bg {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, #1E2D22 0%, #2C3E2F 30%, #1A2E35 60%, #243a2b 100%);
          background-size: 300% 300%;
          animation: psAurora 18s ease-in-out infinite;
          z-index: 0;
        }
        .ps-orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 1;
        }
        .ps-orb-1 { top: -10%; left: -5%; width: 420px; height: 420px; background: radial-gradient(circle, rgba(166,119,73,0.5), transparent 70%); animation: psOrb 18s ease-in-out infinite; }
        .ps-orb-2 { bottom: -15%; right: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(74,163,80,0.35), transparent 70%); animation: psOrb 22s ease-in-out infinite reverse; }
        .ps-orb-3 { top: 30%; right: 20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(74,126,192,0.3), transparent 70%); animation: psOrb 25s ease-in-out infinite; }

        .ps-star {
          position: absolute; width: 2px; height: 2px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 6px #fff, 0 0 12px rgba(217,179,138,0.6);
          animation: psTwinkle 3s ease-in-out infinite;
          z-index: 1;
        }

        .ps-content { position: relative; z-index: 10; display: contents; }

        .ps-header { animation: psFadeUp 0.6s ease-out both; }

        .ps-owl-ring {
          position: relative;
          width: 100px; height: 100px;
          margin: 0 auto 20px;
        }
        .ps-owl-ring::before, .ps-owl-ring::after {
          content: ''; position: absolute; inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(217,179,138,0.5);
          animation: psRing 2.5s ease-out infinite;
        }
        .ps-owl-ring::after { animation-delay: 1.25s; }
        .ps-owl-inner {
          position: relative;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(217,179,138,0.25), rgba(74,163,80,0.2));
          border: 2px solid rgba(217,179,138,0.6);
          display: flex; align-items: center; justify-content: center;
          animation: psPulse 2.8s ease-in-out infinite, psFloat 4s ease-in-out infinite;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }
        .ps-owl-inner img { width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(217,179,138,0.5)); }

        .ps-title {
          background: linear-gradient(135deg, #ffffff 0%, #d9b38a 50%, #ffffff 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: psAurora 4s ease-in-out infinite;
          font-size: 42px;
          font-weight: 900;
          letter-spacing: 6px;
          margin-bottom: 10px;
        }

        .ps-card {
          animation: psFadeUp 0.6s ease-out both;
          position: relative;
          background: rgba(255,255,255,0.06);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 22px;
          padding: 28px 24px;
          cursor: pointer;
          text-align: left;
          transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease;
          backdrop-filter: blur(14px);
          overflow: hidden;
          color: white;
          font-family: inherit;
        }
        .ps-card:nth-child(1) { animation-delay: 0.1s; }
        .ps-card:nth-child(2) { animation-delay: 0.2s; }
        .ps-card:nth-child(3) { animation-delay: 0.3s; }

        .ps-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
          pointer-events: none;
        }
        .ps-card:hover::before { transform: translateX(100%); }

        .ps-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(217,179,138,0.4);
          background: rgba(255,255,255,0.09);
        }

        .ps-card.selected {
          transform: translateY(-10px) scale(1.03);
          border-color: rgba(255,255,255,0.3);
        }

        .ps-card-emoji-ring {
          width: 58px; height: 58px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px;
          margin-bottom: 16px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          transition: all 0.3s ease;
        }
        .ps-card:hover .ps-card-emoji-ring { transform: rotate(-6deg) scale(1.1); }

        .ps-tag {
          padding: 4px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.55);
          border: 1px solid rgba(255,255,255,0.12);
          transition: all 0.2s ease;
        }
        .ps-card.selected .ps-tag {
          background: rgba(255,255,255,0.22);
          color: rgba(255,255,255,0.95);
          border-color: rgba(255,255,255,0.3);
        }

        .ps-check {
          position: absolute; top: 14px; right: 14px;
          width: 28px; height: 28px; border-radius: 50%;
          background: white;
          display: flex; align-items: center; justify-content: center;
          color: #304035; font-weight: 900; font-size: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          animation: psFadeUp 0.3s ease-out both;
        }

        .ps-cta {
          position: relative;
          padding: 16px 52px;
          border-radius: 16px;
          border: none;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.8px;
          min-width: 260px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ps-cta.active {
          background: linear-gradient(135deg, #d9b38a 0%, #C49A3C 45%, #a67749 100%);
          background-size: 200% 200%;
          color: white;
          cursor: pointer;
          box-shadow: 0 12px 40px rgba(196,154,60,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset;
          animation: psAurora 3s ease-in-out infinite;
        }
        .ps-cta.active:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 18px 50px rgba(196,154,60,0.65), 0 0 0 1px rgba(255,255,255,0.25) inset;
        }
        .ps-cta.active:active { transform: translateY(0) scale(0.98); }
        .ps-cta.disabled {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35);
          cursor: not-allowed;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .ps-cta-shimmer {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%);
          animation: psShimmer 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        .ps-confetti-piece {
          position: fixed; top: -20px;
          width: 10px; height: 14px;
          pointer-events: none;
          z-index: 100;
          animation: psConfetti 1.8s linear forwards;
        }

        @media (max-width: 768px) {
          .ps-title { font-size: 32px; letter-spacing: 4px; }
          .ps-owl-ring { width: 84px; height: 84px; }
          .ps-owl-inner img { width: 58px; height: 58px; }
        }
      `}</style>

      {/* Backdrop animé */}
      <div className="ps-bg" />
      <div className="ps-orb ps-orb-1" />
      <div className="ps-orb ps-orb-2" />
      <div className="ps-orb ps-orb-3" />

      {/* Étoiles scintillantes */}
      {Array.from({ length: 30 }).map((_, i) => {
        const top = (i * 37) % 100;
        const left = (i * 53) % 100;
        const delay = (i * 0.17) % 3;
        const size = 1 + ((i * 7) % 3);
        return (
          <span
            key={i}
            className="ps-star"
            style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s`, width: size, height: size }}
          />
        );
      })}

      {/* Confetti on confirm */}
      {confetti && Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const colors = ['#d9b38a', '#C49A3C', '#4aa350', '#6b8e73', '#c08a5a', '#ffffff'];
        const color = colors[i % colors.length];
        const duration = 1.4 + Math.random() * 0.8;
        return (
          <span
            key={i}
            className="ps-confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              borderRadius: i % 3 === 0 ? '50%' : '2px',
            }}
          />
        );
      })}

      {/* En-tête */}
      <div className="ps-header" style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 10 }}>
        <div className="ps-owl-ring">
          <div className="ps-owl-inner">
            <img src="/nouveaulogochouette.png" alt="AVRA" />
          </div>
        </div>
        <h1 className="ps-title">AVRA</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 4 }}>
          Bienvenue{prenom !== 'là' ? `, ${prenom}` : ''} ✨
        </p>
        <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
          Choisissez votre portail métier
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6 }}>
          Votre espace sera personnalisé selon votre profession
        </p>
      </div>

      {/* Cartes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: 20,
        maxWidth: 960,
        width: '100%',
        marginBottom: 40,
        position: 'relative',
        zIndex: 10,
      }}>
        {PORTAILS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`ps-card${isSelected ? ' selected' : ''}`}
              style={{
                background: isSelected ? p.gradient : undefined,
                boxShadow: isSelected
                  ? `0 20px 60px ${p.glowColor}, 0 0 0 1px rgba(255,255,255,0.2) inset`
                  : '0 4px 24px rgba(0,0,0,0.25)',
              }}
            >
              {isSelected && <div className="ps-check">✓</div>}

              <div
                className="ps-card-emoji-ring"
                style={{
                  background: isSelected ? 'rgba(255,255,255,0.18)' : undefined,
                  borderColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                }}
              >
                {p.emoji}
              </div>

              <div style={{ color: 'white', fontSize: 19, fontWeight: 800, marginBottom: 10, letterSpacing: 0.3 }}>
                {p.titre}
              </div>

              <div style={{
                color: isSelected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
                fontSize: 13,
                lineHeight: 1.55,
                marginBottom: 18,
              }}>
                {p.description}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.tags.map(tag => (
                  <span key={tag} className="ps-tag">{tag}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={handleConfirm}
        disabled={!selected || loading}
        className={`ps-cta ${selected && !loading ? 'active' : 'disabled'}`}
        style={{ position: 'relative', zIndex: 10 }}
      >
        {selected && !loading && <span className="ps-cta-shimmer" />}
        <span style={{ position: 'relative', zIndex: 2 }}>
          {loading
            ? '⏳ Ouverture de votre portail…'
            : selected
            ? `Accéder à mon portail ${selectedPortail?.emoji ?? ''}`
            : 'Sélectionnez un portail'}
        </span>
      </button>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 22, position: 'relative', zIndex: 10 }}>
        Vous pourrez changer de portail depuis vos paramètres
      </p>
    </div>
  );
}
