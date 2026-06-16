'use client';

import { useEffect, useState } from 'react';

/**
 * Retourne true quand la largeur du viewport est <= breakpoint (mobile/petit écran).
 * SSR-safe : rend `false` au premier rendu (côté serveur + hydratation), puis se
 * met à jour côté client. Breakpoint par défaut 900px = aligné sur le passage
 * de la sidebar en mode drawer (voir globals.css @media 900px).
 */
export function useIsMobile(breakpoint = 900): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    // addEventListener('change') — fallback addListener pour vieux navigateurs.
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
    };
  }, [breakpoint]);

  return isMobile;
}
