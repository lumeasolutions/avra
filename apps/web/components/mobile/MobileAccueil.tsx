'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight, ArrowDownRight, ChevronRight, Plus, Sparkles, Receipt, CalendarDays,
  AlertCircle, FolderOpen, Wrench, CalendarCheck,
} from 'lucide-react';
import { useFacturationStore, usePlanningStore, useVisibleDossiers, useVisibleDossiersSignes } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { statutSigne, couleurStatutSigne, parStatutSigne } from '@/lib/statut-dossier-signe';

/**
 * Accueil sur téléphone (13/10/2026), commun aux trois portails métier.
 *
 * En haut, la photo du métier choisi à la connexion (cuisine, atelier, table
 * d'architecte) : l'utilisateur retrouve l'image qu'il vient de choisir.
 * Dessous, ce qu'un gérant regarde entre deux rendez-vous : l'encaissé du
 * mois et sa tendance, les rendez-vous du jour, les dossiers à suivre.
 *
 * Affiché seulement sous 900 px ; sur ordinateur, le tableau de bord du
 * portail reste celui d'avant (attribut data-portail-bureau, masqué ici).
 */

type Metier = 'cuisiniste' | 'menuisier' | 'architecte';

const PHOTOS: Record<Metier, { src: string; flou: string; position: string }> = {
  cuisiniste: {
    src: '/images/mobile/metier-cuisiniste.webp',
    position: '50% 46%',
    flou: 'data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAAAwBACdASoMABUAPtFWo0uoJKMhsAgBABoJQBOmUABwcktJjsgGADhPJoAA/vD4fSSlQGv11FTxOmuTyn3ORJ2AkOJFxL9g+VkJGsy6H1//1YZ9gDDGt8NEDDQ/hicmlasuztPHdb5dmcBgWbaIUWbOXxtirGLwAAA=',
  },
  menuisier: {
    src: '/images/mobile/metier-menuisier.webp',
    position: '50% 55%',
    flou: 'data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAACQAwCdASoMABUAPtFUo0uoJKMhsAgBABoJZACdACFmbAhCOBn2AP70QnyQ/Sf5NVVt5hsockj+Ovy6ZLVNM4hC9+eQlNQpYZ9UwdJ/FHh/S5bFfM3Tm8HWdZQDF663t1zLVd0Q84rhs3DyPwBluP9eU73AAA==',
  },
  architecte: {
    src: '/images/mobile/metier-architecte.webp',
    position: '50% 50%',
    flou: 'data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAABwBACdASoMABUAPtFUo0uoJKMhsAgBABoJYgCdL11s/wGKlx8KUBd8gUM8AAD+9DXaUj+eAqY9vTsHsYHCExSnJiJIKAb85XKekG2Kp1blWoKsvcA2UJ3O7j6Ob91aDjp9LUjEIlTZ2fEK/Se8mLtlJndOkf1wxH9KUvzaiz9K6oOKdWc6d+roN2AAAA==',
  },
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const euros = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** Date de facture : « jj/mm/aaaa » (saisie française) ou ISO. */
function lireDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const STATUTS_EN_COURS: Record<string, { libelle: string; fond: string; texte: string; rang: number }> = {
  URGENT: { libelle: 'Urgent', fond: '#fbe9e5', texte: '#b4432f', rang: 0 },
  'A VALIDER': { libelle: 'À valider', fond: '#fbf1dc', texte: '#a8741c', rang: 1 },
  'EN COURS': { libelle: 'En cours', fond: '#eaf1ec', texte: '#3d5244', rang: 2 },
  FINITION: { libelle: 'Finition', fond: '#e6efe9', texte: '#2d5a3d', rang: 3 },
};

function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '·';
  return (mots[0][0] + (mots[1]?.[0] ?? mots[0][1] ?? '')).toUpperCase();
}

export function MobileAccueil({ metier }: { metier: Metier }) {
  const dossiers = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const invoices = useFacturationStore((s) => s.invoices);
  const evenements = usePlanningStore((s) => s.planningEvents);
  const user = useAuthStore((s) => s.user);

  // Date et salutation calculées après le montage : le serveur et le
  // téléphone n'ont pas la même heure (sinon : erreur d'hydratation).
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => { setMaintenant(new Date()); }, []);

  const photo = PHOTOS[metier];
  const prenom = user?.firstName?.trim();
  const salutation = maintenant && maintenant.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
  // « Mardi 13 octobre » : majuscule au jour seulement, le mois reste en
  // minuscule comme le veut l'usage français.
  const jourLong = maintenant
    ? maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const dateDuJour = jourLong.charAt(0).toUpperCase() + jourLong.slice(1);

  /** Encaissé (factures payées, hors avoirs) sur les six derniers mois. */
  const encaisse = useMemo(() => {
    const ref = maintenant ?? new Date();
    const mois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth() - 5 + i, 1);
      return { annee: d.getFullYear(), mois: d.getMonth(), total: 0 };
    });
    for (const f of invoices) {
      if (f.statut !== 'PAYÉE' || f.type === 'Avoir') continue;
      const d = lireDate(f.date);
      if (!d) continue;
      const m = mois.find((x) => x.annee === d.getFullYear() && x.mois === d.getMonth());
      if (m) m.total += f.montantHT;
    }
    const courant = mois[5].total;
    const precedent = mois[4].total;
    const evolution = precedent > 0 ? Math.round(((courant - precedent) / precedent) * 100) : null;
    return { mois, courant, evolution };
  }, [invoices, maintenant]);

  /** Rendez-vous d'aujourd'hui, dans l'ordre de la journée. */
  const aujourdhui = useMemo(() => {
    if (!maintenant) return [];
    const jour = ((maintenant.getDay() + 6) % 7) + 1; // 1 = lundi
    return evenements
      .filter((e) => (e.weekOffset ?? 0) === 0 && e.day === jour)
      .sort((a, b) => a.startHour * 60 + (a.startMinute ?? 0) - (b.startHour * 60 + (b.startMinute ?? 0)));
  }, [evenements, maintenant]);

  const aSuivre = useMemo(
    () => [...dossiers]
      .sort((a, b) => (STATUTS_EN_COURS[a.status]?.rang ?? 9) - (STATUTS_EN_COURS[b.status]?.rang ?? 9))
      .slice(0, 4),
    [dossiers],
  );
  const signes = useMemo(
    () => [...dossiersSignes].sort((a, b) => parStatutSigne(a as never, b as never)).slice(0, 8),
    [dossiersSignes],
  );

  const urgents = dossiers.filter((d) => d.status === 'URGENT').length;
  const confirmations = dossiersSignes.reduce(
    (s, d) => s + (d.confirmations ?? []).filter((c) => !c.validee).length, 0,
  );

  // Courbe des six mois, dessinée à l'échelle de son propre maximum.
  const max = Math.max(...encaisse.mois.map((m) => m.total), 1);
  const points = encaisse.mois.map((m, i) => [i * 52 + 4, 46 - (m.total / max) * 38] as const);
  const trace = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`).join(' ');
  const aire = `${trace} L${points[5][0]},50 L${points[0][0]},50 Z`;

  return (
    <div className="ma">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Bandeau photo ── */}
      <section className="ma-hero">
        <Image
          src={photo.src}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          placeholder="blur"
          blurDataURL={photo.flou}
          style={{ objectFit: 'cover', objectPosition: photo.position }}
        />
        <div className="ma-hero-ombre" />
        <div className="ma-hero-haut">
          <span className="ma-date">{dateDuJour}</span>
          <Link href="/parametres" className="ma-avatar" aria-label="Mon compte et paramètres">
            {initiales([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'A')}
          </Link>
        </div>
        <div className="ma-hero-texte">
          <h1>{salutation}{prenom ? `, ${prenom}` : ''}</h1>
          <p>{user?.workspaceName ? `Votre journée chez ${user.workspaceName}` : 'Voici votre journée'}</p>
        </div>
      </section>

      {/* ── Encaissé du mois ── */}
      <Link href="/statistiques" className="ma-ca">
        <div className="ma-ca-gauche">
          <span className="ma-surtitre">Encaissé en {MOIS[(maintenant ?? new Date()).getMonth()]}</span>
          <strong className="ma-ca-montant">{euros(encaisse.courant)}</strong>
          {encaisse.evolution !== null ? (
            <span className={`ma-ca-evol${encaisse.evolution >= 0 ? '' : ' ma-ca-evol--baisse'}`}>
              {encaisse.evolution >= 0
                ? <ArrowUpRight size={14} aria-hidden="true" />
                : <ArrowDownRight size={14} aria-hidden="true" />}
              {encaisse.evolution >= 0 ? '+' : ''}{encaisse.evolution} % vs {MOIS_COURT[encaisse.mois[4].mois]}
            </span>
          ) : (
            <span className="ma-ca-evol ma-ca-evol--neutre">Factures payées, hors avoirs</span>
          )}
        </div>
        <svg className="ma-courbe" viewBox="0 0 268 56" aria-hidden="true">
          <defs>
            <linearGradient id="ma-aire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c99a6a" stopOpacity=".38" />
              <stop offset="100%" stopColor="#c99a6a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={aire} fill="url(#ma-aire)" />
          <path d={trace} fill="none" stroke="#e2bd8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={points[5][0]} cy={points[5][1]} r="3.5" fill="#fffaf4" stroke="#c99a6a" strokeWidth="2" />
        </svg>
      </Link>

      {/* ── Trois chiffres ── */}
      <div className="ma-chiffres">
        <Link href="/dossiers" className="ma-chiffre">
          <span className="ma-chiffre-ico ma-chiffre-ico--rouge"><AlertCircle size={17} aria-hidden="true" /></span>
          <strong>{urgents}</strong>
          <span>Urgent{urgents > 1 ? 's' : ''}</span>
        </Link>
        <Link href="/dossiers" className="ma-chiffre">
          <span className="ma-chiffre-ico"><FolderOpen size={17} aria-hidden="true" /></span>
          <strong>{dossiers.length}</strong>
          <span>En cours</span>
        </Link>
        <Link href="/dossiers-signes" className="ma-chiffre">
          <span className="ma-chiffre-ico ma-chiffre-ico--cuivre"><Wrench size={17} aria-hidden="true" /></span>
          <strong>{confirmations}</strong>
          <span>À confirmer</span>
        </Link>
      </div>

      {/* ── Aujourd'hui ── */}
      <section className="ma-bloc">
        <div className="ma-bloc-tete">
          <h2>Aujourd&apos;hui</h2>
          <Link href="/planning">Planning <ChevronRight size={15} aria-hidden="true" /></Link>
        </div>
        {aujourdhui.length > 0 ? (
          <ol className="ma-agenda">
            {aujourdhui.map((e) => {
              const minutes = e.durationMinutes ?? Math.round((e.duration ?? 1) * 60);
              const debut = `${String(e.startHour).padStart(2, '0')}:${String(e.startMinute ?? 0).padStart(2, '0')}`;
              return (
                <li key={e.id} className="ma-rdv">
                  <span className="ma-rdv-heure">{debut}</span>
                  <span className="ma-rdv-trait" style={{ background: e.color }} />
                  <span className="ma-rdv-texte">
                    <strong>{e.title}</strong>
                    <span>{minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ''}` : `${minutes} min`}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="ma-vide">
            <CalendarCheck size={22} aria-hidden="true" />
            <div>
              <strong>Aucun rendez-vous aujourd&apos;hui</strong>
              <span>Une journée pour avancer sur vos dossiers.</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Actions rapides ── */}
      <div className="ma-actions">
        <Link href="/dossiers/nouveau" className="ma-action ma-action--cuivre">
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span>Nouveau dossier</span>
        </Link>
        <Link href="/ia-studio" className="ma-action">
          <Sparkles size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>Rendu IA</span>
        </Link>
        <Link href="/facturation" className="ma-action">
          <Receipt size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>Devis & factures</span>
        </Link>
        <Link href="/planning" className="ma-action">
          <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>Planning</span>
        </Link>
      </div>

      {/* ── Dossiers à suivre ── */}
      <section className="ma-bloc">
        <div className="ma-bloc-tete">
          <h2>À suivre</h2>
          <Link href="/dossiers">Tous <ChevronRight size={15} aria-hidden="true" /></Link>
        </div>
        {aSuivre.length > 0 ? (
          <div className="ma-liste">
            {aSuivre.map((d) => {
              const s = STATUTS_EN_COURS[d.status] ?? { libelle: d.status, fond: '#eef0ee', texte: '#3d5244' };
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="ma-dossier">
                  <span className="ma-dossier-ini">{initiales(d.name)}</span>
                  <span className="ma-dossier-texte">
                    <strong>{d.name}</strong>
                    <span>{[d.firstName, d.vendeurName].filter(Boolean).join(' · ') || 'Dossier en cours'}</span>
                  </span>
                  <span className="ma-statut" style={{ background: s.fond, color: s.texte }}>{s.libelle}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="ma-vide">
            <FolderOpen size={22} aria-hidden="true" />
            <div>
              <strong>Aucun dossier en cours</strong>
              <span>Créez votre premier dossier en un geste.</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Dossiers signés ── */}
      {signes.length > 0 && (
        <section className="ma-bloc">
          <div className="ma-bloc-tete">
            <h2>Dossiers signés</h2>
            <Link href="/dossiers-signes">Tous <ChevronRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="ma-carrousel">
            {signes.map((d) => {
              const libelle = statutSigne(d as never);
              const c = couleurStatutSigne(libelle);
              return (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="ma-signe">
                  <span className="ma-signe-ini">{initiales(d.name)}</span>
                  <strong>{d.name}</strong>
                  <span className="ma-statut" style={{ background: c.bg, color: c.text }}>{libelle}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Styles préfixés « ma- », injectés par dangerouslySetInnerHTML (une balise
 * <style> en enfant texte fait diverger serveur et navigateur sur les
 * apostrophes).
 */
const STYLES = `
.ma { display: none; }
@media (max-width: 900px) {
  [data-portail-bureau] { display: none !important; }

  .ma {
    display: block;
    color: #1d2620;
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ma *, .ma *::before, .ma *::after { box-sizing: border-box; }

  /* Bandeau pleine largeur : il remonte sous la barre d'état et déborde des
     marges latérales du contenu (16 px). */
  .ma-hero {
    position: relative; overflow: hidden;
    margin: calc(-1 * (env(safe-area-inset-top, 0px) + 14px)) -16px 0;
    height: calc(env(safe-area-inset-top, 0px) + 300px);
    color: #f5eee8;
    background: #141c17;
  }
  .ma-hero img { animation: ma-zoom 14s cubic-bezier(.22,.61,.36,1) both; }
  .ma-hero-ombre {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(8,11,9,.55) 0%, rgba(8,11,9,.05) 32%, rgba(8,11,9,.1) 50%, rgba(10,14,11,.86) 100%);
  }
  .ma-hero-haut {
    position: absolute; left: 18px; right: 18px; top: calc(env(safe-area-inset-top, 0px) + 16px);
    display: flex; align-items: center; justify-content: space-between;
  }
  .ma-date { font-size: 13.5px; letter-spacing: .04em; color: rgba(245,238,232,.85); text-shadow: 0 1px 8px rgba(0,0,0,.5); }
  .ma-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif; font-size: 15px; font-weight: 600;
    color: #fffaf4; text-decoration: none;
    background: rgba(20,28,23,.55); border: 1.5px solid rgba(226,189,143,.7);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  }
  .ma-hero-texte { position: absolute; left: 18px; right: 18px; bottom: 64px; animation: ma-monte .8s cubic-bezier(.22,1,.36,1) both; }
  .ma-hero-texte h1 {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
    font-weight: 600; font-size: 32px; line-height: 1.1; color: #fffaf4;
    text-shadow: 0 2px 18px rgba(0,0,0,.4);
  }
  .ma-hero-texte p { margin-top: 6px; font-size: 14.5px; color: rgba(245,238,232,.82); }

  /* Carte encaissé, à cheval sur la photo */
  .ma-ca {
    position: relative; z-index: 2;
    display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
    margin: -46px 2px 0; padding: 18px 18px 16px;
    border-radius: 22px; text-decoration: none; color: #f5eee8;
    background: linear-gradient(160deg, #2b3a30 0%, #1a241e 100%);
    border: 1px solid rgba(226,189,143,.22);
    box-shadow: 0 18px 40px rgba(20,28,23,.35), inset 0 1px 0 rgba(255,255,255,.07);
    animation: ma-monte .8s cubic-bezier(.22,1,.36,1) .08s both;
  }
  .ma-ca-gauche { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .ma-surtitre { font-size: 11px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #d6ab7d; }
  .ma-ca-montant {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
    font-size: 30px; font-weight: 600; line-height: 1.1; color: #fffaf4; white-space: nowrap;
  }
  .ma-ca-evol { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; color: #9fd0a8; }
  .ma-ca-evol--baisse { color: #f0a493; }
  .ma-ca-evol--neutre { color: rgba(245,238,232,.55); }
  .ma-courbe { width: 46%; max-width: 170px; height: 56px; flex-shrink: 0; }

  .ma-chiffres { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .ma-chiffre {
    display: flex; flex-direction: column; gap: 4px;
    padding: 13px 12px 12px; border-radius: 18px; text-decoration: none; color: #1d2620;
    background: #fffdfb; border: 1px solid rgba(48,64,53,.07);
    box-shadow: 0 6px 18px rgba(48,64,53,.07);
  }
  .ma-chiffre strong { font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif; font-size: 25px; font-weight: 600; line-height: 1.1; margin-top: 4px; }
  .ma-chiffre > span:last-child { font-size: 12.5px; color: #6b766f; }
  .ma-chiffre-ico {
    width: 30px; height: 30px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #3d5244; background: #eaf1ec;
  }
  .ma-chiffre-ico--rouge { color: #b4432f; background: #fbe9e5; }
  .ma-chiffre-ico--cuivre { color: #8c623c; background: #f6ebdd; }

  .ma-bloc { margin-top: 24px; }
  .ma-bloc-tete { display: flex; align-items: baseline; justify-content: space-between; margin: 0 2px 10px; }
  .ma-bloc-tete h2 {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
    font-size: 21px; font-weight: 600; color: #1d2620;
  }
  .ma-bloc-tete a { display: inline-flex; align-items: center; gap: 2px; font-size: 13.5px; font-weight: 600; color: #8c623c; text-decoration: none; }

  .ma-agenda, .ma-liste {
    list-style: none; margin: 0; padding: 6px;
    border-radius: 20px; background: #fffdfb;
    border: 1px solid rgba(48,64,53,.07); box-shadow: 0 6px 18px rgba(48,64,53,.07);
  }
  .ma-rdv { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
  .ma-rdv + .ma-rdv { border-top: 1px solid rgba(48,64,53,.06); }
  .ma-rdv-heure { width: 46px; flex-shrink: 0; font-size: 14px; font-weight: 600; color: #3d5244; font-variant-numeric: tabular-nums; }
  .ma-rdv-trait { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .ma-rdv-texte { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ma-rdv-texte strong { font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ma-rdv-texte span { font-size: 12.5px; color: #6b766f; }

  .ma-vide {
    display: flex; align-items: center; gap: 14px;
    padding: 16px; border-radius: 20px;
    background: #fffdfb; border: 1px dashed rgba(166,119,73,.35); color: #8c623c;
  }
  .ma-vide div { display: flex; flex-direction: column; gap: 2px; }
  .ma-vide strong { font-size: 14.5px; color: #1d2620; font-weight: 600; }
  .ma-vide span { font-size: 13px; color: #6b766f; }

  .ma-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .ma-action {
    display: flex; align-items: center; gap: 10px;
    height: 56px; padding: 0 14px; border-radius: 17px;
    text-decoration: none; font-size: 14.5px; font-weight: 600; color: #1d2620;
    background: #fffdfb; border: 1px solid rgba(48,64,53,.08);
    box-shadow: 0 6px 18px rgba(48,64,53,.07);
  }
  .ma-action svg { color: #a67749; flex-shrink: 0; }
  .ma-action--cuivre {
    color: #fffaf4; border-color: transparent;
    background: linear-gradient(180deg, #c3925f 0%, #a67749 55%, #8f633b 100%);
    box-shadow: 0 10px 24px rgba(166,119,73,.32), inset 0 1px 0 rgba(255,236,210,.35);
  }
  .ma-action--cuivre svg { color: #fffaf4; }
  .ma-action:active, .ma-chiffre:active, .ma-dossier:active, .ma-signe:active { transform: scale(.98); }

  .ma-dossier { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; text-decoration: none; color: #1d2620; }
  .ma-dossier + .ma-dossier { border-top: 1px solid rgba(48,64,53,.06); border-radius: 0; }
  .ma-dossier-ini, .ma-signe-ini {
    width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 13.5px; font-weight: 700; color: #fffaf4;
    background: linear-gradient(145deg, #3d5244, #202b24);
  }
  .ma-dossier-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ma-dossier-texte strong { font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ma-dossier-texte span { font-size: 12.5px; color: #6b766f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ma-statut { flex-shrink: 0; padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }

  .ma-carrousel {
    display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory;
    margin: 0 -16px; padding: 2px 16px 8px; scrollbar-width: none;
  }
  .ma-carrousel::-webkit-scrollbar { display: none; }
  .ma-signe {
    flex: 0 0 auto; width: 148px; scroll-snap-align: start;
    display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
    padding: 14px; border-radius: 18px; text-decoration: none; color: #1d2620;
    background: #fffdfb; border: 1px solid rgba(48,64,53,.07); box-shadow: 0 6px 18px rgba(48,64,53,.07);
  }
  .ma-signe strong { font-size: 14px; font-weight: 600; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  @keyframes ma-zoom { from { transform: scale(1.08); } to { transform: scale(1); } }
  @keyframes ma-monte { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .ma *, .ma *::before, .ma *::after { animation: none !important; }
  }
}
`;
