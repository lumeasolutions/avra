'use client';

/**
 * CookieBanner RGPD — AVRA
 *
 * Stocke le consentement dans localStorage sous la clé "avra_cookie_consent".
 * Valeurs possibles : "accepted" | "refused"
 *
 * Ne charge aucun analytics tant que le consentement n'est pas donné.
 * Dispatch un événement custom "avra:consent" pour que les scripts analytics
 * puissent s'abonner et se charger dynamiquement.
 *
 * Design cohérent avec le système AVRA : or #C9A96E sur fond sombre #0e1810.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'avra_cookie_consent';

type ConsentValue = 'accepted' | 'refused';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
      if (!stored) {
        // Petit délai pour éviter le flash au chargement
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      } else {
        // Consentement déjà enregistré : dispatcher l'événement pour les analytics
        dispatchConsentEvent(stored);
      }
    } catch {
      // localStorage peut être bloqué (ex: mode privé strict)
      setVisible(true);
    }
  }, []);

  function dispatchConsentEvent(value: ConsentValue) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avra:consent', { detail: { consent: value } }));
    }
  }

  function handleChoice(value: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Silencieux si localStorage indisponible
    }
    dispatchConsentEvent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Overlay léger */}
      <div style={overlayStyle} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="false"
        aria-label="Gestion des cookies"
        style={bannerStyle}
      >
        <div style={innerStyle}>
          {/* Texte */}
          <div style={textContainerStyle}>
            <p style={titleStyle}>🍪 Gestion des cookies</p>
            <p style={descStyle}>
              AVRA utilise des cookies pour analyser l'audience et améliorer l'expérience.
              Vous pouvez accepter ou refuser les cookies non essentiels.{' '}
              <Link href="/confidentialite" style={linkStyle}>
                En savoir plus
              </Link>
            </p>
          </div>

          {/* Boutons */}
          <div style={buttonsStyle}>
            <button
              onClick={() => handleChoice('refused')}
              style={refuseButtonStyle}
              aria-label="Refuser les cookies non essentiels"
            >
              Refuser
            </button>
            <button
              onClick={() => handleChoice('accepted')}
              style={acceptButtonStyle}
              aria-label="Accepter tous les cookies"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '200px',
  background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)',
  zIndex: 199,
  pointerEvents: 'none',
};

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 200,
  width: 'min(680px, calc(100vw - 32px))',
  background: '#0e1810',
  border: '1px solid rgba(201, 169, 110, 0.25)',
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(12px)',
  animation: 'avra-cookie-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
};

const innerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  padding: '20px 24px',
  flexWrap: 'wrap',
};

const textContainerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '200px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 4px 0',
};

const descStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.65)',
  lineHeight: 1.55,
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: '#C9A96E',
  textDecoration: 'underline',
};

const buttonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexShrink: 0,
};

const refuseButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.8)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};

const acceptButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
  color: '#0e1810',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};
