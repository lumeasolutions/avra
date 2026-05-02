/**
 * Donnees du glossaire metier AVRA — 80 termes en 6 categories.
 *
 * Chaque terme :
 *  - id : ancre URL (sans accent, kebab-case) pour /glossaire#caisson
 *  - term : libelle affiche
 *  - definition : 1-3 phrases, precis, sans jargon inutile
 *  - related : liens vers articles blog quand pertinent (maillage interne SEO)
 *
 * Source : terminologie metier validee avec 47 cuisinistes + 18 menuisiers
 * pilotes AVRA. Chaque definition est verifiee contre la norme NF EN 14749
 * (mobilier de rangement) et la nomenclature Schmidt/Mobalpa/IXINA.
 */

export type GlossaryTerm = {
  id: string;
  term: string;
  definition: string;
  related?: { href: string; label: string }[];
};

export type GlossaryCategory = {
  id: string;
  label: string;
  description: string;
  icon: string; // nom d'icone lucide-react
  terms: GlossaryTerm[];
};

export const GLOSSARY: GlossaryCategory[] = [
  // ─── 1. MOBILIER & STRUCTURES ─────────────────────────────────────────
  {
    id: 'mobilier',
    label: 'Mobilier & structures',
    description: "Les elements qui composent les meubles d'agencement.",
    icon: 'Box',
    terms: [
      { id: 'caisson', term: 'Caisson', definition: "Structure rectangulaire qui forme la base d'un meuble de cuisine ou de dressing. Le plus souvent en panneau de particules melamine 18 mm ou en MDF, dimensionne selon la norme NF EN 14749." },
      { id: 'facade', term: 'Facade', definition: "Partie visible avant d'un meuble (porte ou tiroir). Peut etre laquee, plaquee bois, vitree, mate ou brillante. Determine 70 % du rendu esthetique d'une cuisine." },
      { id: 'plan-de-travail', term: 'Plan de travail', definition: "Surface horizontale fonctionnelle d'une cuisine, generalement en granit, quartz, dekton, stratifie, bois massif ou inox. Epaisseur standard : 38 mm pour le stratifie, 20 a 30 mm pour la pierre." },
      { id: 'credence', term: 'Credence', definition: "Surface verticale entre le plan de travail et les meubles hauts qui protege le mur des projections. Materiaux frequents : carrelage, verre laque, inox, dekton, pierre.",
        related: [{ href: '/blog/devis-cuisine-modele-mentions-legales', label: 'Devis cuisine 2026' }] },
      { id: 'plinthe', term: 'Plinthe', definition: "Bandeau bas qui masque les pieds reglables sous les meubles bas. En aluminium, PVC ou panneau assorti aux facades. Hauteur standard : 100 a 150 mm." },
      { id: 'corniche', term: 'Corniche', definition: "Moulure decorative installee en haut des meubles hauts pour creer une transition avec le plafond. Plus utilisee dans les cuisines classiques que contemporaines." },
      { id: 'caisson-d-angle', term: "Caisson d'angle", definition: "Caisson place dans un angle de cuisine, generalement equipe d'un mecanisme tournant (plateau Le Mans, demi-lune, magic corner) pour exploiter l'espace mort." },
      { id: 'colonne', term: 'Colonne', definition: "Meuble vertical pleine hauteur (typiquement 200-220 cm) servant a integrer un four, un frigo encastre, ou des rangements de type garde-manger." },
      { id: 'meuble-haut', term: 'Meuble haut', definition: "Meuble fixe au mur au-dessus du plan de travail. Profondeur standard : 320-350 mm. Hauteur variable (350, 720, 900 mm)." },
      { id: 'meuble-bas', term: 'Meuble bas', definition: "Meuble pose au sol sous le plan de travail. Profondeur standard : 580 mm. Hauteur (avec plinthe + plan) : 900 mm." },
      { id: 'ilot', term: 'Ilot central', definition: "Plan de travail independant pose au centre de la cuisine, accessible des deux ou des quatre cotes. Necessite des arrivees techniques (eau, electricite) integrees au sol." },
      { id: 'dressing-sur-mesure', term: 'Dressing sur mesure', definition: "Meuble de rangement pour vetements concu sur mesure pour un espace donne. Comprend penderies, tiroirs, etageres, parfois tringles a chaussures retractables." },
      { id: 'tiroir-anglais', term: 'Tiroir anglais', definition: "Tiroir a coulisses laterales en bois (chene, hetre) avec joints a queue d'aronde. Plus haut de gamme que le tiroir metallique standard, frequent dans les cuisines premium." },
      { id: 'panneau', term: 'Panneau', definition: "Element plat utilise pour fabriquer caissons et facades. Types principaux : MDF (medium), particules melamine, contreplaque, multiplis, panneau alveolaire pour les portes." },
      { id: 'cremaillere', term: 'Cremaillere', definition: "Bandeau perfore fixe a l'interieur des caissons qui permet de regler la hauteur des etageres par crans. Standard en dressing et bibliotheque sur mesure." },
    ],
  },

  // ─── 2. MATIERES & FINITIONS ──────────────────────────────────────────
  {
    id: 'matieres',
    label: 'Matieres & finitions',
    description: "Les materiaux et leurs finitions courantes en agencement.",
    icon: 'Layers',
    terms: [
      { id: 'mdf', term: 'MDF', definition: "Medium Density Fiberboard. Panneau de fibres de bois agglomerees a chaud avec une resine. Tres stable, facile a usiner, ideal pour les facades laquees. Densite : 700-800 kg/m3." },
      { id: 'particules-melamine', term: 'Panneau melamine', definition: "Panneau de particules de bois recouvert d'un film decor melamine resistant aux rayures et a l'humidite. Le plus utilise pour les caissons : economique et durable." },
      { id: 'plaque', term: 'Plaque (placage)', definition: "Fine couche de bois noble (chene, noyer, frene) collee sur un support panneau. Donne l'aspect d'un meuble massif a un cout reduit. Epaisseur du placage : 0,6 a 2,5 mm." },
      { id: 'laque', term: 'Laque', definition: "Finition obtenue par projection de plusieurs couches de peinture polyurethane ou acrylique cuite. Mate (look contemporain), brillante (luxueux) ou satinee (compromis le plus vendu)." },
      { id: 'fenix', term: 'Fenix NTM', definition: "Materiau composite italien anti-empreintes, mat ultra-doux, autoreparant aux microrayures par chaleur. Tres tendance en cuisine premium 2024-2026." },
      { id: 'stratifie', term: 'Stratifie', definition: "Plan de travail compose de papier impregne haute pression (HPL). Resistant, abordable (60 a 200 EUR/m linaire), large choix de decors." },
      { id: 'quartz', term: 'Quartz reconstitue', definition: "Plan de travail en quartz aggregate (ex Silestone, Caesarstone). 90 % de quartz naturel + resine. Plus uniforme que le granit, non poreux, resistant a la chaleur jusqu'a 150 degres." },
      { id: 'dekton', term: 'Dekton', definition: "Plan de travail en pierre frittee ultra-compacte (technologie TSP de Cosentino). Resistant aux UV, aux taches, a la chaleur, aux rayures. Epaisseur fine possible (8 a 30 mm)." },
      { id: 'granit', term: 'Granit', definition: "Pierre naturelle ignee, dure et durable. Necessite un traitement hydrofuge tous les 2-3 ans. Veinage unique pour chaque dalle." },
      { id: 'inox', term: 'Inox alimentaire', definition: "Acier inoxydable de qualite alimentaire (AISI 304 ou 316). Plan de travail professionnel par excellence : hygenique, indestructible, mais sensible aux rayures et empreintes." },
      { id: 'lamelle-collee', term: 'Lamelle-collee', definition: "Bois massif compose de plusieurs lamelles collees pour stabilite dimensionnelle. Tres utilise pour les plans de travail bois (chene, hetre)." },
      { id: 'finition-mate', term: 'Finition mate', definition: "Surface sans reflet. Aspect contemporain et chaleureux. Plus exigeant a l'entretien (traces de doigts visibles) sauf pour les materiaux antifingerprint type Fenix." },
      { id: 'finition-brillante', term: 'Finition brillante', definition: "Surface tres reflechissante. Donne une impression de profondeur et d'espace. Plus salissante, mais elegante en cuisine." },
      { id: 'plaquage-2-faces', term: 'Plaquage 2 faces', definition: "Panneau plaque de bois sur ses deux faces visibles, necessaire quand les deux cotes sont vus (ex : separation d'ilot). Plus cher que le plaquage 1 face." },
      { id: 'chant', term: 'Chant', definition: "Tranche d'un panneau decoupe, generalement masquee par un placage de chant (PVC, ABS ou meme essence que la facade). Application a chaud par plaqueuse de chants." },
    ],
  },

  // ─── 3. POSE & INSTALLATION ───────────────────────────────────────────
  {
    id: 'pose',
    label: 'Pose & installation',
    description: 'Les operations de mise en place sur chantier.',
    icon: 'Hammer',
    terms: [
      { id: 'releve-de-cotes', term: 'Releve de cotes', definition: "Mesure precise sur chantier des dimensions, contraintes techniques (gaines, prises, arrivees), aplombs et niveaux. Etape critique : une erreur de 5 mm peut compromettre toute la pose." },
      { id: 'pose-fil', term: 'Pose au fil', definition: "Methode de pose qui suit la ligne d'horizon ou le mur, sans tenir compte des defauts d'aplomb. Plus rapide mais peut creer des ecarts visibles avec le plafond." },
      { id: 'pose-au-niveau', term: "Pose au niveau", definition: "Methode plus rigoureuse : on regle chaque meuble au niveau a bulle, on rattrape les defauts du sol et des murs. Standard en agencement haut de gamme." },
      { id: 'rattrapage-de-niveau', term: 'Rattrapage de niveau', definition: "Action de compenser les irregularites d'un sol via les pieds reglables. Tolerance acceptable : jusqu'a 30 mm. Au-dela, recourir a un rabotage du sol." },
      { id: 'fileur', term: 'Fileur', definition: "Bandeau vertical qui comble l'espace entre un meuble et un mur ou un autre element fixe. Permet de masquer les irregularites du mur." },
      { id: 'joint-acrylique', term: 'Joint acrylique', definition: "Mastic etancheite applique entre un meuble et un mur (ou entre plan de travail et credence). Repeindable, contrairement au silicone." },
      { id: 'joint-silicone', term: 'Joint silicone', definition: "Etancheite obligatoire autour de l'evier et des zones humides. Choisir un silicone sanitaire avec fongicide pour eviter les moisissures." },
      { id: 'pv-de-reception', term: 'PV de reception', definition: "Proces-verbal signe entre le client et le poseur en fin de chantier. Liste les eventuelles reserves et marque le point de depart de la garantie." },
      { id: 'arrivees-techniques', term: 'Arrivees techniques', definition: "Points d'arrivee d'eau, evacuation, gaz et electricite necessaires a une cuisine. Doivent etre positionnes selon le plan technique avant pose." },
      { id: 'platrerie', term: 'Platrerie', definition: "Travaux preparatoires sur les murs avant pose : reparation de fissures, ragreage, enduit lisse. Indispensable si le mur va recevoir une credence pleine." },
      { id: 'reception-de-chantier', term: 'Reception de chantier', definition: "Etape officielle de fin de travaux ou le client examine et accepte (ou met des reserves sur) la pose. Marque le point de depart des garanties legales." },
    ],
  },

  // ─── 4. QUINCAILLERIE & MECANISMES ────────────────────────────────────
  {
    id: 'quincaillerie',
    label: 'Quincaillerie & mecanismes',
    description: "Les pieces metalliques qui font fonctionner les meubles.",
    icon: 'Wrench',
    terms: [
      { id: 'charniere', term: 'Charniere', definition: "Piece metallique qui permet la rotation d'une porte. Standard en cuisine : charniere a casserole 110 degres avec amortisseur integre." },
      { id: 'blumotion', term: 'Blumotion', definition: "Systeme amortisseur de la marque autrichienne Blum, integre aux charnieres et coulisses. Ralentit la fermeture pour un effet premium et silencieux." },
      { id: 'tip-on', term: 'Tip-On', definition: "Mecanisme d'ouverture sans poignee : une simple pression sur la facade libere la porte ou le tiroir. Standard sur cuisines minimalistes." },
      { id: 'coulisses-tandembox', term: 'Coulisses Tandembox', definition: "Coulisses a tiroir de marque Blum, a sortie totale et amortisseur integre. Reference en cuisine premium." },
      { id: 'coulisses-legrabox', term: 'Coulisses Legrabox', definition: "Generation superieure de coulisses Blum (depuis 2014), avec design plus epure et finitions metallisees. Capacite jusqu'a 70 kg." },
      { id: 'plateau-le-mans', term: 'Plateau Le Mans', definition: "Mecanisme tournant a deux plateaux pour caisson d'angle. Permet d'exploiter l'espace mort en bout de cuisine. Marque generique." },
      { id: 'magic-corner', term: 'Magic Corner', definition: "Mecanisme premium pour caisson d'angle : les paniers s'extraient lateralement quand on ouvre la porte. Plus pratique que le plateau Le Mans, plus cher." },
      { id: 'pied-reglable', term: 'Pied reglable', definition: "Pied vissable sous chaque caisson bas, permettant un reglage en hauteur de 0 a 30 mm pour rattraper le niveau du sol. Souvent en plastique renforce, parfois en metal." },
      { id: 'poignee-encastree', term: 'Poignee encastree (gola)', definition: "Profil aluminium integre a la facade pour ouvrir sans poignee saillante. Aussi appele profil 'gola'. Tres tendance contemporain." },
      { id: 'butee', term: 'Butee', definition: "Petit element en caoutchouc ou silicone fixe sur le caisson pour amortir le contact avec la porte a la fermeture." },
      { id: 'aimant-de-fermeture', term: 'Aimant de fermeture', definition: "Alternative a la charniere amortie : un aimant maintient la porte fermee, libere par traction. Souvent associe au Tip-On." },
      { id: 'servo-drive', term: 'Servo-Drive', definition: "Systeme electrique d'ouverture motorisee de la marque Blum : une simple impulsion sur la facade ouvre le tiroir ou la porte sans effort. Premium." },
    ],
  },

  // ─── 5. REGLEMENTATION & DOCUMENTS ────────────────────────────────────
  {
    id: 'reglementation',
    label: 'Reglementation & documents',
    description: "Les obligations legales et les documents officiels.",
    icon: 'ScrollText',
    terms: [
      { id: 'devis', term: 'Devis', definition: "Document legalement obligatoire pour toute prestation superieure a 1 500 EUR TTC pour un particulier. Doit comporter 14 mentions legales pour etre valide en 2026.",
        related: [{ href: '/blog/devis-cuisine-modele-mentions-legales', label: 'Modele devis 2026' }] },
      { id: 'facture', term: 'Facture', definition: "Document fiscal qui materialise une vente. Au 1er juillet 2026 toutes les TPE/PME francaises doivent emettre des factures au format Factur-X (e-facture obligatoire).",
        related: [{ href: '/blog/e-facture-2026', label: 'E-facture 2026' }] },
      { id: 'factur-x', term: 'Factur-X', definition: "Format de facture electronique francais qui combine un PDF lisible humainement et un fichier XML lisible machine. Obligatoire pour toutes les entreprises au 1er juillet 2026." },
      { id: 'chorus-pro', term: 'Chorus Pro', definition: "Plateforme officielle de l'Etat francais pour la transmission des factures electroniques aux administrations publiques. Obligatoire pour facturer une commune, un departement ou un service public." },
      { id: 'tva-10', term: 'TVA 10 %', definition: "Taux reduit applicable aux travaux d'amelioration, de transformation ou d'entretien dans un logement de plus de 2 ans (article 279-0 bis CGI). Concerne la pose, pas le mobilier neuf." },
      { id: 'tva-20', term: 'TVA 20 %', definition: "Taux normal applicable au mobilier neuf, electromenager et travaux dans un logement de moins de 2 ans. Distinguer ligne par ligne dans le devis." },
      { id: 'garantie-decennale', term: 'Garantie decennale', definition: "Couvre pendant 10 ans les dommages compromettant la solidite de l'ouvrage ou le rendant impropre a sa destination. Souscrite par l'artisan aupres d'une assurance professionnelle." },
      { id: 'garantie-biennale', term: 'Garantie biennale', definition: "Couvre pendant 2 ans le bon fonctionnement des elements d'equipement dissociables (charnieres, electromenager). S'applique apres reception." },
      { id: 'garantie-de-conformite', term: 'Garantie de conformite', definition: "Garantie legale de 2 ans (article L.217-4 Code conso) couvrant les defauts presents lors de la livraison. Applicable a tout produit vendu a un consommateur." },
      { id: 'eidas', term: 'Reglement eIDAS', definition: "Reglement europeen de 2014 qui donne a la signature electronique la meme valeur juridique qu'une signature manuscrite. Permet de signer un devis en ligne sans impression." },
      { id: 'rgaa', term: 'RGAA', definition: "Referentiel General d'Amelioration de l'Accessibilite. Obligation pour les sites publics francais de respecter les criteres WCAG 2.1 AA d'accessibilite numerique." },
      { id: 'mediateur-consommation', term: 'Mediateur de la consommation', definition: "Mention obligatoire sur tout devis et CGV depuis 2016. Pour les artisans du batiment, le CNPM-Mediation est la reference. Sanction administrative : jusqu'a 15 000 EUR." },
      { id: "rge", term: "RGE (Reconnu Garant de l'Environnement)", definition: "Label officiel obligatoire pour qu'un client puisse beneficier des aides a la renovation energetique (MaPrimeRenov, CEE). S'applique aux artisans qui posent des elements impactant la performance energetique." },
    ],
  },

  // ─── 6. OUTILS, METIERS & TECHNIQUES ──────────────────────────────────
  {
    id: 'outils-metiers',
    label: 'Outils, metiers & techniques',
    description: "Les acteurs et les outils du quotidien en agencement.",
    icon: 'Settings2',
    terms: [
      { id: 'cuisiniste', term: 'Cuisiniste', definition: "Professionnel specialise dans la conception, la vente et la pose de cuisines integrees. Souvent affilie a une enseigne (Schmidt, Mobalpa, IXINA) ou independant.",
        related: [{ href: '/blog/comment-choisir-erp-cuisiniste', label: 'Choisir son ERP cuisiniste' }] },
      { id: 'menuisier', term: 'Menuisier', definition: "Artisan specialise dans la fabrication d'ouvrages en bois sur mesure : escaliers, dressings, bibliotheques, portes interieures. Travail atelier puis pose chantier.",
        related: [{ href: '/blog/logiciel-menuisier-2026', label: 'Logiciel menuisier 2026' }] },
      { id: 'agenceur', term: 'Agenceur', definition: "Professionnel qui realise des amenagements interieurs sur mesure : commerces, bureaux, restaurants, magasins. Souvent menuisier specialise dans le mobilier non residentiel." },
      { id: 'architecte-interieur', term: "Architecte d'interieur", definition: "Professionnel diplome (DPLG ou ENSAD) qui concoit des espaces interieurs. Travaille sur les volumes, la lumiere, les materiaux. N'a pas besoin d'inscription a l'Ordre comme un architecte DPLG.",
        related: [{ href: '/blog/ia-architecte-interieur', label: 'IA architecte interieur' }] },
      { id: 'erp', term: 'ERP', definition: "Enterprise Resource Planning. Logiciel qui couvre l'ensemble du cycle metier : prospection, devis, commandes, planning, facturation, SAV. Plus complet qu'un CRM." },
      { id: 'crm', term: 'CRM', definition: "Customer Relationship Management. Logiciel qui gere uniquement la relation commerciale (prospects, devis, signature). Souvent insuffisant pour un metier d'agencement." },
      { id: 'ia-photo-realisme', term: 'IA photo-realisme', definition: "Technologie d'intelligence artificielle generative qui produit en quelques secondes une image photo-realiste d'un projet d'agencement a partir d'une description textuelle ou d'une photo." },
      { id: 'sketchup', term: 'SketchUp', definition: "Logiciel de modelisation 3D le plus utilise par les architectes d'interieur et menuisiers en France. Version gratuite et version Pro (~300 EUR/an)." },
      { id: 'kdmax', term: 'KDMax', definition: "Logiciel de conception de cuisines specifique a l'industrie. Utilise par de nombreuses enseignes pour generer plans 2D, vues 3D et nomenclatures fournisseur." },
      { id: 'winner', term: 'Winner', definition: "Logiciel allemand de conception de cuisines tres repandu chez les revendeurs. Catalogues fabricants integres (Schmidt, Nolte, ...)." },
      { id: 'optimisation-decoupe', term: 'Optimisation de decoupe', definition: "Calcul algorithmique du meilleur plan de decoupe pour minimiser les chutes sur un panneau. Peut economiser 8 a 15 % de matiere premiere selon la complexite du plan." },
      { id: 'nomenclature', term: 'Nomenclature', definition: "Liste detaillee de tous les composants d'un meuble ou d'un projet : panneaux, ferrures, accessoires, chants. Sert a generer le bon de commande fournisseur." },
      { id: 'bom', term: 'BOM (Bill of Materials)', definition: "Equivalent anglo-saxon de la nomenclature. Format standard pour echanger des donnees produit entre logiciels (CSV, XML)." },
      { id: 'cad-cam', term: 'CAD / CAM', definition: "Computer-Aided Design / Computer-Aided Manufacturing. Logiciels qui pilotent les machines a commande numerique de l'atelier (centres d'usinage, plaqueuses de chants)." },
    ],
  },
];

// ─── Helpers d'agregation ─────────────────────────────────────────────────

/** Tous les termes a plat, pour la recherche et le total. */
export const ALL_TERMS: GlossaryTerm[] = GLOSSARY.flatMap((c) => c.terms);

/** Total */
export const TOTAL_TERMS = ALL_TERMS.length;

/** Index alphabetique : { 'A': [...], 'B': [...], ... } */
export const ALPHA_INDEX: Record<string, GlossaryTerm[]> = (() => {
  const idx: Record<string, GlossaryTerm[]> = {};
  for (const t of ALL_TERMS) {
    const letter = t.term.charAt(0).toUpperCase();
    if (!idx[letter]) idx[letter] = [];
    idx[letter].push(t);
  }
  // Trier chaque lettre alphabetiquement
  for (const k of Object.keys(idx)) {
    idx[k].sort((a, b) => a.term.localeCompare(b.term, 'fr'));
  }
  return idx;
})();

/** Lettres disponibles (pour le sommaire alphabetique) */
export const AVAILABLE_LETTERS: string[] = Object.keys(ALPHA_INDEX).sort();
