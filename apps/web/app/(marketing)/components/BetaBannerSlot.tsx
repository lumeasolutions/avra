'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Routes où le bandeau NE doit PAS s'afficher (espaces privés / authentifiés)
const HIDDEN_PREFIXES = [
  // Portails partenaires
  '/portail-',
  '/portal-select',
  // Route group (app) — toutes les pages applicatives
  '/dashboard',
  '/assistant',
  '/commandes',
  '/dossiers',
  '/dossiers-signes',
  '/epaiement',
  '/facturation',
  '/historique',
  '/ia-studio',
  '/intervenants',
  '/notifications',
  '/parametres',
  '/planning',
  '/planning-gestion',
  '/signature',
  '/statistiques',
  '/stock',
  '/admin-docs',
];

/**
 * Slot du BetaBanner monté dans le root layout comme SIBLING de children.
 * Pas de wrapping (évite les soucis de serialisation RSC).
 * - Affiche le bandeau fixe en haut
 * - Injecte un spacer <div> inline de 36px pour pousser le contenu sous le bandeau
 * - Se désactive sur les espaces privés (portails, app, portal-select)
 */
export default function BetaBannerSlot() {
  const pathname = usePathname() || '/';
  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isHidden) return null;

  return (
    <>
      <div
        role="status"
        aria-label="Annonce bêta privée"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: 'linear-gradient(90deg, rgba(201,169,110,0.92), rgba(232,201,122,0.92))',
          color: '#0e1810',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '0 16px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
        className="beta-banner"
      >
        <span style={{ fontSize: '0.9rem' }}>🌱</span>
        <span className="beta-banner-text">
          AVRA est en bêta privée · Lancement public en juillet 2026
        </span>
        <Link
          href="/rejoindre"
          style={{
            color: '#0e1810',
            textDecoration: 'underline',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          Rejoindre la liste d&apos;attente →
        </Link>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .beta-banner {
            font-size: 0.72rem !important;
            padding: 0 10px !important;
            gap: 6px !important;
          }
          .beta-banner-text {
            display: none;
          }
          .beta-banner::before {
            content: "🌱 Bêta privée · Juillet 2026";
            font-weight: 600;
          }
        }
        body {
          padding-top: 36px;
        }
      `}</style>
    </>
  );
}
