'use client';

import Image from 'next/image';

/**
 * Bannière hero AVRA : logo A circulaire, mot AVRA, chouette.
 *
 * POURQUOI CETTE MISE EN PAGE (sept. 2026)
 * ----------------------------------------
 * Les trois éléments se chevauchaient : le A cerclé mordait sur le premier A
 * du mot, la chouette sur le dernier. La bannière reposait sur des marges
 * négatives (−150 px, puis −100, −30, −20 selon l'écran) qui compensaient
 * l'espace vide qu'avait autrefois l'image du mot AVRA sur ses côtés. L'image
 * actuelle est rognée au ras des lettres : il n'y a plus de vide à combler, et
 * ces marges tiraient donc les logos directement sur le texte.
 *
 * Désormais aucune marge négative. Une seule grandeur, --h, fixe la hauteur des
 * lettres ; le A, la chouette et les écarts en sont des multiples. Les
 * proportions restent donc identiques du grand écran au téléphone, sans point
 * de rupture à régler à la main — c'est justement la multiplication de ces
 * réglages manuels qui avait fini par se dérégler.
 *
 * Les images gardent leurs dimensions natives (width/height) et la hauteur est
 * imposée en CSS avec une largeur automatique : le navigateur respecte ainsi le
 * rapport largeur/hauteur exact de chaque dessin, sans le déformer ni le rogner.
 */
const HERO_BANNER_CSS = `
.hero-logo-banner {
  /* Hauteur des lettres. Le groupe entier mesure environ 7,6 fois --h de large :
     11,5vw garde donc ~8 % de marge sur les côtés, et 150px plafonne sur grand
     écran (la bannière retrouve alors ses 250 px d'origine). */
  --h: clamp(34px, 11.5vw, 150px);
  height: calc(var(--h) * 1.65);
  gap: calc(var(--h) * 0.26);
}
.hero-logo-banner img { display: block; width: auto; max-width: none; }
/* Un cercle paraît plus petit qu'une lettre de même hauteur : léger surdimension. */
.hero-logo-a    { height: calc(var(--h) * 1.08); }
.hero-logo-avra { height: var(--h); }
/* La chouette est plus étroite que haute : un peu plus grande pour peser autant. */
.hero-logo-owl  { height: calc(var(--h) * 1.15); }
`;

export default function HeroLogoBanner() {
  return (
    <div
      className="hero-logo-banner"
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        background: '#0f1a14',
        borderTop: '1px solid rgba(201,169,110,0.18)',
        borderBottom: '1px solid rgba(201,169,110,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4%',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <Image
        className="hero-logo-a"
        src="/nouveaulogoA-net.webp"
        alt="AVRA — logo principal"
        width={900}
        height={900}
        priority
        sizes="170px"
      />
      <Image
        className="hero-logo-avra"
        src="/nouveaulogoavra.webp"
        alt="AVRA"
        width={1800}
        height={353}
        priority
        sizes="(max-width: 768px) 60vw, 770px"
      />
      <Image
        className="hero-logo-owl"
        src="/nouveaulogochouette.webp"
        alt="AVRA — chouette emblème"
        width={705}
        height={900}
        priority
        sizes="140px"
      />

      <style dangerouslySetInnerHTML={{ __html: HERO_BANNER_CSS }} />
    </div>
  );
}
