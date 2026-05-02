'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Bandeau "hors-ligne" pour le portail intervenant.
 * Affiché en haut de la page quand navigator.onLine === false.
 * Le service worker (/sw.js déjà enregistré au layout root) sert
 * /offline.html en fallback. Cette bannière donne un signal visible
 * à l'intervenant en chantier sans connexion.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#b45309',
        color: '#fff',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      <WifiOff size={16} />
      Hors ligne — vos actions seront synchronisées au retour de la connexion.
    </div>
  );
}
