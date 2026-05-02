'use client';

/**
 * GoogleAnalytics — AVRA
 *
 * Charge Google Analytics 4 (G-6KT2K1PDDB) UNIQUEMENT si l'utilisateur a
 * accepté les cookies via le CookieBanner RGPD.
 *
 * Mécanique :
 *  1. Au mount, on lit `localStorage.avra_cookie_consent`.
 *     - "accepted" → on charge GA4 immédiatement.
 *     - "refused"  → on ne charge rien.
 *     - null       → on attend l'event "avra:consent" du CookieBanner.
 *
 *  2. Google Consent Mode v2 (RGPD/EEE) :
 *     - Avant le consentement : tous les signaux sont en "denied".
 *     - Après "accepted"      : on update en "granted" via gtag('consent','update').
 *
 *  3. Pas de double-load : un flag local empêche d'injecter le script deux fois.
 *
 * Plausible reste actif en parallèle (analytics sans cookies, RGPD-friendly).
 * GA4 vient compléter pour des données plus riches (parcours, conversions).
 */

import { useEffect } from 'react';

const GA_MEASUREMENT_ID = 'G-6KT2K1PDDB';
const STORAGE_KEY = 'avra_cookie_consent';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    __avraGaLoaded?: boolean;
  }
}

function injectGtagScript() {
  if (typeof window === 'undefined') return;
  if (window.__avraGaLoaded) return;
  window.__avraGaLoaded = true;

  // Initialise dataLayer + gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  // Consent Mode v2 — par défaut tout est denied (RGPD)
  // L'utilisateur a déjà accepté donc on update immédiatement après.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted', // toujours granted (sécurité)
    wait_for_update: 500,
  });

  // Maintenant qu'on a le consentement, on accorde analytics_storage
  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
  });

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
  });

  // Inject script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export default function GoogleAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) Si l'utilisateur a déjà donné son consentement, charger directement
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted') {
        injectGtagScript();
        return;
      }
      if (stored === 'refused') {
        // Pas de tracking, on ne fait rien
        return;
      }
    } catch {
      // localStorage indisponible — on attend l'event
    }

    // 2) Sinon, on s'abonne à l'event dispatché par le CookieBanner
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ consent: 'accepted' | 'refused' }>).detail;
      if (detail?.consent === 'accepted') {
        injectGtagScript();
      }
    };

    window.addEventListener('avra:consent', handler as EventListener);
    return () => window.removeEventListener('avra:consent', handler as EventListener);
  }, []);

  return null;
}
