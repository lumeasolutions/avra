'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistantStore } from '@/store/useAssistantStore';

/**
 * Bouton de l'assistant sur téléphone (14/10/2026) : la chouette AVRA dans
 * un rond vert profond cerclé de cuivre.
 *
 * On l'attrape et on la pose où l'on veut, comme une bulle de discussion :
 * au lâcher, elle se colle au bord le plus proche (gauche ou droite), au-dessus
 * de la barre du bas, et cette place est retenue (localStorage) d'une
 * ouverture à l'autre. Un simple toucher ouvre l'assistant ; elle s'efface
 * pendant qu'il est ouvert et reprend sa place à la fermeture.
 *
 * Affichée seulement sous 900 px ; sur ordinateur, le bouton habituel reste.
 */

const TAILLE = 58;
const MARGE = 12;
const CLE = 'avra-chouette-place';
/** Hauteur de la barre du bas + un peu d'air (hors zone de sécurité). */
const BAS_RESERVE = 96;

type Place = { cote: 'gauche' | 'droite'; y: number };

/**
 * Marges de sécurité de l'écran (encoche, barre d'accueil de l'iPhone).
 * env() ne se lit pas directement en JavaScript : on le mesure sur un
 * élément témoin invisible.
 */
let temoin: HTMLDivElement | null = null;
function lireSafeArea(cote: 'top' | 'bottom'): number {
  if (typeof window === 'undefined') return 0;
  if (!temoin) {
    temoin = document.createElement('div');
    temoin.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
    document.body.appendChild(temoin);
  }
  const s = getComputedStyle(temoin);
  return Number.parseFloat(cote === 'top' ? s.paddingTop : s.paddingBottom) || 0;
}

function bornes() {
  const haut = lireSafeArea('top') + MARGE;
  const bas = window.innerHeight - lireSafeArea('bottom') - BAS_RESERVE - TAILLE;
  return { haut, bas: Math.max(haut, bas) };
}

function placeParDefaut(): Place {
  const { bas } = bornes();
  return { cote: 'droite', y: bas };
}

export function ChouetteFlottante() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);

  const [place, setPlace] = useState<Place | null>(null);
  // Position libre pendant le glisser (suit le doigt), null sinon.
  const [glisse, setGlisse] = useState<{ x: number; y: number } | null>(null);
  const depart = useRef<{ px: number; py: number; x: number; y: number; bouge: boolean } | null>(null);

  // Place retenue, ou coin bas droit au premier lancement.
  useEffect(() => {
    let p: Place | null = null;
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) {
        const v = JSON.parse(brut);
        if ((v?.cote === 'gauche' || v?.cote === 'droite') && typeof v?.y === 'number') p = v;
      }
    } catch { /* stockage indisponible : place par défaut */ }
    setPlace(p ?? placeParDefaut());
  }, []);

  // Rotation de l'écran / barre d'adresse qui change la hauteur : on reste dans l'écran.
  useEffect(() => {
    const recadrer = () => setPlace((p) => {
      if (!p) return p;
      const { haut, bas } = bornes();
      return { ...p, y: Math.min(bas, Math.max(haut, p.y)) };
    });
    window.addEventListener('resize', recadrer);
    return () => window.removeEventListener('resize', recadrer);
  }, []);

  const xDuCote = (cote: Place['cote']) =>
    cote === 'gauche' ? MARGE : window.innerWidth - TAILLE - MARGE;

  const poser = useCallback((x: number, y: number) => {
    const { haut, bas } = bornes();
    const p: Place = {
      cote: x + TAILLE / 2 < window.innerWidth / 2 ? 'gauche' : 'droite',
      y: Math.min(bas, Math.max(haut, y)),
    };
    setPlace(p);
    try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* sans mémoire, tant pis */ }
  }, []);

  if (!place) return <style dangerouslySetInnerHTML={{ __html: STYLES }} />;

  const x = glisse ? glisse.x : xDuCote(place.cote);
  const y = glisse ? glisse.y : place.y;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <button
        type="button"
        className={`ch${glisse ? ' ch--glisse' : ''}${open ? ' ch--cachee' : ''}`}
        style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
        aria-label="Ouvrir l'assistant AVRA"
        aria-expanded={open}
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          depart.current = { px: e.clientX, py: e.clientY, x, y, bouge: false };
        }}
        onPointerMove={(e) => {
          const d = depart.current;
          if (!d) return;
          const dx = e.clientX - d.px;
          const dy = e.clientY - d.py;
          // Au-delà de 6 px, c'est un déplacement et non un toucher.
          if (!d.bouge && Math.hypot(dx, dy) < 6) return;
          d.bouge = true;
          setGlisse({
            x: Math.min(window.innerWidth - TAILLE, Math.max(0, d.x + dx)),
            y: Math.min(window.innerHeight - TAILLE, Math.max(0, d.y + dy)),
          });
        }}
        onPointerUp={() => {
          const d = depart.current;
          depart.current = null;
          if (d?.bouge && glisse) {
            poser(glisse.x, glisse.y);
            setGlisse(null);
            return;
          }
          setGlisse(null);
          setOpen(!open);
        }}
        onPointerCancel={() => { depart.current = null; setGlisse(null); }}
      >
        <span className="ch-halo" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nouveaulogochouette.webp" alt="" className="ch-chouette" draggable={false} />
      </button>
    </>
  );
}

const STYLES = `
.ch { display: none; }
@media (max-width: 900px) {
  .ch {
    display: flex; align-items: center; justify-content: center;
    position: fixed; left: 0; top: 0; z-index: 46;
    width: ${TAILLE}px; height: ${TAILLE}px; border-radius: 50%; padding: 0;
    border: 1.5px solid rgba(226,189,143,.75);
    background: radial-gradient(circle at 34% 28%, #3d5244 0%, #243028 58%, #18211b 100%);
    box-shadow: 0 10px 26px rgba(10,14,11,.38), 0 0 0 4px rgba(245,238,232,.06), inset 0 1px 0 rgba(255,255,255,.14);
    cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform .42s cubic-bezier(.22,1.2,.36,1), opacity .25s ease, box-shadow .2s ease;
    will-change: transform;
  }
  .ch:active { cursor: grabbing; }
  .ch--glisse {
    transition: opacity .25s ease, box-shadow .2s ease;
    box-shadow: 0 18px 38px rgba(10,14,11,.45), 0 0 0 6px rgba(226,189,143,.18), inset 0 1px 0 rgba(255,255,255,.14);
  }
  .ch--glisse .ch-chouette { transform: scale(1.08); }
  .ch--cachee { opacity: 0; pointer-events: none; }
  .ch-chouette {
    width: 38px; height: 38px; object-fit: contain; pointer-events: none;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,.45));
    transition: transform .2s ease;
  }
  .ch-halo {
    position: absolute; inset: -4px; border-radius: 50%;
    border: 1px solid rgba(226,189,143,.55);
    animation: ch-respire 3.6s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes ch-respire {
    0%, 100% { transform: scale(1); opacity: .65; }
    50% { transform: scale(1.12); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ch { transition: opacity .2s ease; }
    .ch-halo { animation: none; }
  }
}
`;
