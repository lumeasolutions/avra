'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}

/**
 * Styles du bandeau. Injectés par dangerouslySetInnerHTML : écrits en enfant
 * texte d'une balise <style>, React échappait les apostrophes des commentaires
 * différemment côté serveur et côté navigateur — erreur d'hydratation sur
 * chaque page qui affiche ce bandeau.
 */
const STYLES = `
/* Portable (≈1366-1536 px) : quand titre + onglets ne tiennent pas sur
   une ligne, les actions passent dessous au lieu d'écraser le titre
   (vu le 11/10/2026 sur Facturation : sous-titre illisible). Placé
   AVANT le bloc mobile, qui garde le dernier mot sur téléphone. */
.page-header-top-row { flex-wrap: wrap; row-gap: 8px; }
.page-header-title-block { min-width: 190px !important; }

/* Téléphone (13/10/2026) : même matière que le menu « Plus » — façades
   laquées vert profond, filet de lumière — titre en Playfair, retour en
   verre dépoli. Seuil 900 px, aligné sur la barre de navigation du bas. */
@media (max-width: 900px) {
  .page-header-root {
    padding: 16px 16px 15px !important;
    border-radius: 22px !important;
    background:
      linear-gradient(115deg, rgba(20,28,23,.92) 0%, rgba(26,36,30,.78) 55%, rgba(20,28,23,.55) 100%),
      url('/images/mobile/menu-laque.webp') 70% 38% / cover no-repeat,
      #1d2820 !important;
    border: 1px solid rgba(226,189,143,.16);
    box-shadow: 0 14px 32px rgba(20,28,23,.28), inset 0 1px 0 rgba(255,255,255,.06) !important;
    overflow: hidden !important;
  }
  .page-header-root::after {
    content: ''; position: absolute; left: 16px; right: 16px; bottom: 0; height: 1px;
    background: linear-gradient(90deg, rgba(201,154,106,0), rgba(201,154,106,.55) 30%, rgba(226,189,143,.7) 50%, rgba(201,154,106,.55) 70%, rgba(201,154,106,0));
    pointer-events: none;
  }
  .page-header-owl {
    display: none !important;
  }
  .page-header-title {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif !important;
    font-weight: 600 !important;
    font-size: 21px !important;
    letter-spacing: 0 !important;
    color: #fffaf4 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .page-header-subtitle {
    font-size: 12.5px !important;
    color: rgba(245,238,232,.66) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .page-header-back-btn {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    flex-shrink: 0 !important;
    background: rgba(245,238,232,.1) !important;
    border: 1px solid rgba(226,189,143,.4) !important;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
  }
  .page-header-top-row {
    flex-wrap: wrap !important;
    gap: 8px 12px !important;
  }
  .page-header-title-block {
    min-width: 0 !important;
  }
  .page-header-actions {
    width: 100% !important;
    margin-top: 6px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    /* Les boutons passent à la ligne : pas besoin de défilement horizontal,
       qui laissait une barre de défilement visible à droite. */
    overflow: visible !important;
  }
  /* Bouton rond « Tableau de bord » (dossiers) : sans son étiquette, qui
     débordait (« TABLEAU DE BOR »), et un peu plus compact. */
  .page-header-actions .dtb-label { display: none !important; }
  .page-header-actions .dtb-wrap { transform: scale(.78); transform-origin: center; margin: -7px -4px; }
}
`;

export const PageHeader = React.memo(function PageHeader({ icon, title, subtitle, actions, extra }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div
      className="page-header-root"
      style={{
        background: 'linear-gradient(135deg, #304035 0%, #3d5244 100%)',
        borderRadius: '16px',
        padding: extra ? '14px 130px 14px 16px' : '18px 130px 18px 16px',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(48,64,53,0.25)',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Ligne principale: retour + titre + actions */}
      <div className="page-header-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Bouton retour */}
        <button
          className="page-header-back-btn"
          onClick={() => router.back()}
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          title="Retour"
        >
          <ChevronLeft size={18} color="rgba(255,255,255,0.9)" />
        </button>

        {/* Titre */}
        <div className="page-header-title-block" style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h1 className="page-header-title" style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="page-header-subtitle" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions — sur desktop : inline à droite | sur mobile : passe en dessous */}
        {actions && (
          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
            {actions}
          </div>
        )}
      </div>

      {/* Rangée extra (nav, KPIs, etc.) */}
      {extra && (
        <div style={{ marginTop: 12 }}>
          {extra}
        </div>
      )}

      {/* Chouette — positionnée en absolute à droite */}
      <div className="page-header-owl" style={{
        position: 'absolute', right: -10, top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }}>
        <Image
          src="/nouveaulogochouette.webp"
          alt=""
          width={120}
          height={120}
          style={{
            width: 120,
            height: 120,
            objectFit: 'contain',
            opacity: 0.82,
            filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 2px 14px rgba(0,0,0,0.35))',
          }}
        />
      </div>
    </div>
  );
});
