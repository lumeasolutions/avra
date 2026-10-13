'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronsLeftRight } from 'lucide-react';

/**
 * Comparateur avant / après en tête de l'IA Studio sur téléphone (13/10/2026).
 *
 * Une cuisine telle qu'elle sort d'un logiciel de conception, et la même en
 * photographie : on fait glisser le doigt pour passer de l'une à l'autre.
 * Les deux images ont été générées pour AVRA avec le même cadrage.
 *
 * À l'ouverture, la poignée fait un aller-retour pour montrer qu'elle se
 * manipule ; elle s'arrête dès que l'utilisateur la touche (et ne bouge pas
 * du tout si le téléphone demande de réduire les animations).
 */

const AVANT_FLOU = 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAQAgCdASoMABAAAsBMJZQC7AEf3Vq3K4yAAPvE3304M5NynnMTXlUN069Y5vwP5d9HGWxbDYcB/0VwrxlzyIOjp0qYvz1TmGs/kXJSUWI6oC0T5cAAAA==';
const APRES_FLOU = 'data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAADwAQCdASoMABAAAsBMJYgCdAEQ+oQ11gAA/vQ1l3P0yKNb8BXhGv4jC37PSvV178vs67m9QPvjb8VVpocehXHF8lU7EtUNmnEsqls/Hokqmsm9mc6CeaCy0bgAAA==';

export function IaAvantApres() {
  const zone = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const touche = useRef(false);
  const glisse = useRef(false);

  // Démonstration : un aller-retour de la poignée, une seule fois.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    const etapes = [50, 22, 78, 50];
    const debut = performance.now() + 900;
    const duree = 2600;
    let id = 0;
    const tic = (t: number) => {
      if (touche.current) return;
      const p = Math.min(1, Math.max(0, (t - debut) / duree));
      const seg = Math.min(etapes.length - 2, Math.floor(p * (etapes.length - 1)));
      const local = p * (etapes.length - 1) - seg;
      const doux = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      setPosition(etapes[seg] + (etapes[seg + 1] - etapes[seg]) * doux);
      if (p < 1) id = requestAnimationFrame(tic);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }, []);

  const suivre = (clientX: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r) return;
    setPosition(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <section className="iaa" aria-label="Exemple : un plan 3D transformé en photo par l'IA d'AVRA">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        ref={zone}
        className="iaa-zone"
        onPointerDown={(e) => {
          touche.current = true;
          glisse.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          suivre(e.clientX);
        }}
        onPointerMove={(e) => { if (glisse.current) suivre(e.clientX); }}
        onPointerUp={() => { glisse.current = false; }}
        onPointerCancel={() => { glisse.current = false; }}
      >
        <Image
          src="/images/mobile/ia-avant.webp"
          alt=""
          fill
          sizes="100vw"
          quality={85}
          placeholder="blur"
          blurDataURL={AVANT_FLOU}
          className="iaa-img"
        />
        <div className="iaa-apres" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
          <Image
            src="/images/mobile/ia-apres.webp"
            alt=""
            fill
            sizes="100vw"
            quality={85}
            placeholder="blur"
            blurDataURL={APRES_FLOU}
            className="iaa-img"
          />
        </div>

        <span className="iaa-etiquette iaa-etiquette--avant">Plan 3D</span>
        <span className="iaa-etiquette iaa-etiquette--apres">Rendu AVRA</span>

        <div className="iaa-ligne" style={{ left: `${position}%` }} aria-hidden="true">
          <span className="iaa-poignee"><ChevronsLeftRight size={20} strokeWidth={2} /></span>
        </div>

        <div className="iaa-legende">
          <strong>Du plan 3D à la photo</strong>
          <span>Glissez pour comparer · prêt en moins d&apos;une minute</span>
        </div>
      </div>
    </section>
  );
}

const STYLES = `
.iaa { display: none; }
@media (max-width: 900px) {
  .iaa { display: block; margin: 2px 0 6px; }
  .iaa-zone {
    position: relative; overflow: hidden;
    aspect-ratio: 762 / 1000; max-height: 72vh; width: 100%;
    border-radius: 24px; background: #1a241e;
    box-shadow: 0 18px 40px rgba(20,28,23,.32);
    touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: ew-resize;
  }
  .iaa-img { object-fit: cover; object-position: 50% 60%; pointer-events: none; }
  .iaa-apres { position: absolute; inset: 0; will-change: clip-path; }
  .iaa-etiquette {
    position: absolute; top: 14px; z-index: 3;
    padding: 6px 12px; border-radius: 999px;
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 11.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    pointer-events: none;
  }
  .iaa-etiquette--avant { left: 14px; color: #1d2620; background: rgba(245,238,232,.82); }
  .iaa-etiquette--apres { right: 14px; color: #fffaf4; background: linear-gradient(180deg, rgba(195,146,95,.92), rgba(143,99,59,.92)); }
  .iaa-ligne {
    position: absolute; top: 0; bottom: 0; z-index: 2; width: 2px; margin-left: -1px;
    background: linear-gradient(180deg, rgba(255,250,244,0), #fffaf4 14%, #fffaf4 86%, rgba(255,250,244,0));
    box-shadow: 0 0 14px rgba(0,0,0,.35);
    pointer-events: none;
  }
  .iaa-poignee {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 48px; height: 48px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fffaf4;
    background: radial-gradient(circle at 32% 28%, #e8c79c 0%, #c3925f 35%, #a67749 65%, #7d5530 100%);
    border: 2px solid rgba(255,250,244,.9);
    box-shadow: 0 8px 22px rgba(0,0,0,.4);
  }
  .iaa-legende {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
    padding: 46px 18px 16px;
    display: flex; flex-direction: column; gap: 3px;
    background: linear-gradient(180deg, rgba(10,14,11,0) 0%, rgba(10,14,11,.82) 100%);
    color: #f5eee8; pointer-events: none;
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  .iaa-legende strong {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
    font-size: 22px; font-weight: 600; line-height: 1.15;
  }
  .iaa-legende span { font-size: 13px; color: rgba(245,238,232,.75); }
}
`;
