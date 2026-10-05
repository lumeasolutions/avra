/**
 * Classement des rendus IA (réalistes, coloriste…) dans les dossiers.
 *
 * Retour cofondatrice (22/09/2026) : « comment classer les rendus 3D réalistes
 * dans les dossiers ? le meilleur système ». Règles :
 *
 *  - Un rendu est rangé dans la PHASE du projet à laquelle il se rapporte :
 *    l'option (cuisiniste : OPTION, OPTION 2…), le projet (menuisier : PROJET…)
 *    ou la version (architecte : PROJET – APS / APD). Dans un dossier signé :
 *    l'option validée (« OPTION 2 VALIDÉE », « APD VERSION 2 (DOSSIER SIGNÉ) »…).
 *  - Sous-dossier dédié « RENDUS 3D » dans cette phase : « OPTION 2 ▸ RENDUS 3D ».
 *    À la signature, l'option validée emporte ses sous-dossiers (et donc ses
 *    rendus) : le client retrouve exactement les visuels qu'il a validés.
 *  - Nom automatique et numéroté : « Rendu réaliste — Option 2 — 22-09-2026 — v3.jpg »,
 *    avec, si voulu, la photo d'origine à côté (« … — v3 — photo d'origine.jpg »).
 *  - Sans phase identifiable : « RENDUS 3D » à la racine du dossier.
 */

export const RENDUS_3D = 'RENDUS 3D';
const SEP = ' ▸ ';

/**
 * Boites systeme : « Recu de l'intervenant » et « Dossier - Documents
 * Intervenants ». Leurs fichiers se consultent depuis les demandes, pas depuis
 * le dossier, et la page Dossier les masque de son arborescence.
 *
 * Critere unique, partage par la page Dossier et par la fenetre de classement
 * des rendus : il etait defini du seul cote du dossier, si bien qu'on
 * proposait de classer un rendu dans deux dossiers que l'utilisateur ne voit
 * nulle part (constate le 05/10/2026 sur les donnees reelles).
 */
export function estBoiteSysteme(label: string): boolean {
  const low = label.trim().toLowerCase();
  return (low.includes('reçu') && low.includes('intervenant')) || low.includes('documents intervenant');
}

export interface PhaseRendu {
  /** Chemin du sous-dossier de la phase ('' = racine du dossier). */
  label: string;
  /** Libellé lisible (« Option 2 », « Projet – APD », « Dossier (général) »). */
  titre: string;
}

/**
 * Sous-dossier qui correspond à une option / un projet / une version.
 *
 * 23/09/2026 — retour cofondatrice : « ça ne marche pas de mon côté ». Cause
 * trouvée en base : on n'acceptait que le PREMIER niveau (« OPTION »,
 * « PROJET – APD »), alors qu'elle travaille systématiquement au DEUXIÈME
 * (« OPTION ▸ OPTION 1 », « PROJET – APD ▸ APD 2 », « PROJET VERSION 1 – APS
 * ▸ APS 3 VALIDEE »…). Les seuls emplacements proposés étaient donc ceux
 * qu'elle n'utilise jamais — elle a fini par télécharger ses rendus et les
 * reposer à la main (« Avra-architect-1407 (1).jpg » rangé dans « PROJET – APD
 * ▸ APD 1 »), et elle s'était même créé un « PROJET 1 ▸ PROJET 1 ▸ 3D ».
 *
 * On accepte donc aussi le 2e niveau, dès lors que la racine est bien une
 * option / un projet / une version.
 */
export function estPhase(label: string): boolean {
  if (!label) return false;
  const niveaux = label.split(SEP);
  if (niveaux.length > 2) return false;
  return /^(OPTION|PROJET|APD|APS)\b/i.test(niveaux[0].trim());
}

/**
 * « OPTION 2 VALIDÉE » → « Option 2 validée » (pour le nom du fichier).
 * Sur un chemin à deux niveaux on ne garde que le dernier : « PROJET – APD
 * ▸ APD 2 » → « APD 2 » — c'est lui qui identifie le rendu.
 * Les sigles restés en capitales (APS, APD, DCE, 3D…) sont conservés tels
 * quels : « Apd 2 » ne voudrait rien dire pour un architecte.
 */
export function titrePhase(label: string): string {
  if (!label) return 'Dossier';
  const dernier = label.split(SEP).pop()!.trim();
  const mots = dernier.split(/\s+/).map((mot) => {
    if (mot.length <= 4 && mot === mot.toUpperCase() && /[A-Z0-9]/.test(mot)) return mot;
    const bas = mot.toLowerCase();
    return bas.charAt(0).toUpperCase() + bas.slice(1);
  });
  const t = mots.join(' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Chemin lisible pour la liste de choix : « Projet – APD ▸ APD 2 ». */
export function cheminPhase(label: string): string {
  if (!label) return 'Dossier (général, hors option)';
  return label.split(SEP).map((n) => titrePhase(n)).join(SEP);
}

/** Phases proposées pour un dossier, dans l'ordre d'affichage, + « Dossier (général) ». */
export function phasesDuDossier(subfolderLabels: string[]): PhaseRendu[] {
  // Racine avant ses enfants, et chaque emplacement une seule fois — la liste
  // vient de sources qui peuvent se recouper (état local + documents serveur).
  const vues = new Set<string>();
  const phases = subfolderLabels
    .filter(estPhase)
    .filter((l) => (vues.has(l) ? false : (vues.add(l), true)))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((label) => ({ label, titre: cheminPhase(label) }));
  return [...phases, { label: '', titre: 'Dossier (général, hors option)' }];
}

/**
 * Phase choisie par défaut :
 *  1. celle demandée explicitement (lien « Rendu réaliste » depuis le dossier) ;
 *  2. dossier signé : l'option / le projet VALIDÉ(E) ;
 *  3. sinon la plus récente : numéro le plus élevé, à défaut la dernière listée
 *     (architecte : APD après APS).
 */
export function phaseParDefaut(subfolderLabels: string[], demandee?: string | null): string {
  const phases = subfolderLabels.filter(estPhase);
  if (demandee !== undefined && demandee !== null && (demandee === '' || phases.includes(demandee))) return demandee;
  const validee = phases.find((l) => /VALID|DOSSIER SIGN/i.test(l));
  if (validee) return validee;
  let best = '';
  let bestN = -1;
  phases.forEach((l, i) => {
    // Un sous-niveau (« APD 2 ») l'emporte sur sa racine (« PROJET – APD ») :
    // c'est là que le travail se range réellement.
    const profond = l.includes(SEP) ? 1_000_000 : 0;
    const m = /(\d+)/.exec(l.split(SEP).pop()!);
    const n = profond + (m ? parseInt(m[1], 10) * 1000 : 0) + i;
    if (n >= bestN) { bestN = n; best = l; }
  });
  return best;
}

/** Sous-dossier cible : « OPTION 2 ▸ RENDUS 3D » (ou « RENDUS 3D » à la racine). */
export function dossierRendus(phaseLabel: string): string {
  return phaseLabel ? `${phaseLabel}${SEP}${RENDUS_3D}` : RENDUS_3D;
}

/**
 * Tous les emplacements du dossier, suggérés en tête.
 *
 * `phasesDuDossier` ne retient que les options, projets et versions. C'est le
 * bon réglage par défaut, mais ça rendait le reste de l'arborescence
 * inaccessible : un rendu à ranger dans « DOCUMENTS CLIENT » n'avait aucun
 * chemin, et il fallait le télécharger pour le reposer à la main — retour
 * Cassandra du 02/10/2026, confirmé par ce qu'on voyait déjà en base.
 *
 * `suggere` sépare les deux groupes à l'affichage ; l'ordre reste celui de
 * l'arborescence, pour qu'on retrouve ses repères.
 */
export interface EmplacementRendu extends PhaseRendu {
  suggere: boolean;
}

export function tousLesEmplacements(subfolderLabels: string[]): EmplacementRendu[] {
  const vues = new Set<string>();
  const uniques = subfolderLabels
    .filter((l) => l && (vues.has(l) ? false : (vues.add(l), true)))
    // On ne propose pas de ranger un rendu dans un dossier de rendus : la case
    // « RENDUS 3D » s'en charge, et l'imbriquer deux fois n'a pas de sens.
    .filter((l) => !l.split(SEP).some((n) => n.trim().toUpperCase() === RENDUS_3D))
    // Ni dans une boite systeme, que le dossier ne montre pas.
    .filter((l) => !l.split(SEP).some((n) => estBoiteSysteme(n)));
  // Pas de tri : on garde l'ordre d'arrivee, qui est celui de l'arborescence du
  // dossier. Un tri alphabetique donnait les memes noms dans un autre ordre, et
  // on ne s'y retrouvait plus.

  const suggeres = uniques.filter(estPhase).map((label) => ({ label, titre: cheminPhase(label), suggere: true }));
  const autres = uniques.filter((l) => !estPhase(l)).map((label) => ({ label, titre: cheminPhase(label), suggere: false }));
  return [
    ...suggeres,
    { label: '', titre: 'Dossier (général, hors option)', suggere: true },
    ...autres,
  ];
}

/** Caractères interdits dans un nom de fichier (Windows / macOS). */
const nettoyer = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

/**
 * Prochain numéro de version dans le sous-dossier cible : on compte les rendus
 * déjà présents (les « photo d'origine » ne comptent pas).
 */
export function prochaineVersion(nomsExistants: string[]): number {
  let max = 0;
  for (const n of nomsExistants) {
    if (/photo d'origine/i.test(n)) continue;
    const m = /— v(\d+)(?:\.|\s|$)/i.exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10));
    else max = Math.max(max, 0);
  }
  const sansNumero = nomsExistants.filter((n) => !/photo d'origine/i.test(n) && !/— v\d+/i.test(n)).length;
  return Math.max(max, sansNumero) + 1;
}

export function nomRendu(module: string, phaseLabel: string, version: number, ext: string, origine = false): string {
  const d = new Date();
  const date = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const base = `${module} — ${titrePhase(phaseLabel)} — ${date} — v${version}${origine ? " — photo d'origine" : ''}`;
  return `${nettoyer(base)}.${ext}`;
}

/** Extension de fichier d'après le type MIME d'une image. */
export function extensionImage(mime: string | undefined, repli = 'jpg'): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return repli;
}
