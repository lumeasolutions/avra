'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'pourquoi-2026', label: 'Pourquoi 2026 change la donne' },
  { id: 'differences', label: 'Menuisier vs cuisiniste : ce qui change' },
  { id: 'criteres', label: 'Les 10 fonctions critiques' },
  { id: 'plan-technique', label: 'Integration plan technique 2D/3D' },
  { id: 'pose-mobile', label: 'L\'app mobile chantier' },
  { id: 'efacture', label: 'E-facture 2026 : aussi pour vous' },
  { id: 'erreurs', label: '6 erreurs classiques' },
  { id: 'methode', label: 'Comparer 3 solutions en 1 semaine' },
  { id: 'avra', label: 'AVRA pour les menuisiers' },
  { id: 'faq', label: 'Questions frequentes' },
];

const FAQ_ITEMS = [
  {
    q: "Quelle difference entre un logiciel menuisier et un logiciel d'agencement ?",
    a: (
      <p>
        Un logiciel <strong>menuisier</strong> couvre toute la chaine bois : devis, plan technique,
        decoupe matieres, optimisation des chutes, pose chantier. Un logiciel <strong>d'agencement</strong>
        est plus generique et privilegie la gestion commerciale (CRM + devis). En 2026, les meilleurs
        outils comme AVRA combinent les deux approches dans un seul ERP metier.
      </p>
    ),
  },
  {
    q: "Mon logiciel doit-il pouvoir gerer les chutes et la decoupe matiere ?",
    a: (
      <>
        <p>
          Si vous travaillez le panneau (MDF, melamine, contreplaque), oui imperativement. L'optimisation
          de decoupe peut vous faire economiser <strong>8 a 15% de matiere premiere par an</strong>, ce qui
          represente plusieurs milliers d'euros pour un atelier moyen.
        </p>
        <p>
          Les solutions specialisees panneau (OptiCut, KDMax, Cabinet Vision) coutent 2 000 a 8 000 EUR par
          an. Un ERP integre comme AVRA propose une optimisation simplifiee suffisante pour 80% des cas.
        </p>
      </>
    ),
  },
  {
    q: "Comment importer mes plans depuis SketchUp ou Fusion 360 ?",
    a: (
      <p>
        Les ERP serieux acceptent les exports CSV (nomenclature) ou XML (plan + cotes). SketchUp exporte
        nativement en CSV via le menu Plugins. Fusion 360 exporte la BOM en CSV. Verifiez toujours en demo
        l'import d'un plan reel de votre atelier — c'est la que les editeurs gonflent leur fiche produit.
      </p>
    ),
  },
  {
    q: "Mon poseur peut-il valider la pose sur smartphone meme sans connexion ?",
    a: (
      <p>
        C'est le point qui differencie les outils 2026 des outils 2018. Une vraie app mobile menuisier doit
        fonctionner <strong>hors connexion sur chantier</strong> : photos, validation d'etapes, signature
        client, PV de reception. Synchronisation automatique au retour 4G. AVRA respecte ce critere.
      </p>
    ),
  },
  {
    q: "Combien coute un bon ERP menuisier en 2026 ?",
    a: (
      <p>
        Pour un menuisier independant ou un atelier 2-4 personnes : <strong>49 a 149 EUR HT/utilisateur/mois</strong>.
        Pour un ERP metier complet (devis + plan + planning + pose mobile + facturation) c'est le tarif marche.
        Les solutions specialistes (TopSolid Wood, Logikal) sont 5 a 10 fois plus cheres mais
        concues pour les structures de 20+ personnes.
      </p>
    ),
  },
  {
    q: "Comment migrer depuis Excel sans perdre mes 200 clients ?",
    a: (
      <>
        <p>
          La portabilite est un droit (RGPD article 20). Tout editeur serieux propose un import CSV des
          clients, devis et factures. Le format requis : un fichier par entite avec des colonnes standards
          (nom, prenom, email, telephone, adresse pour les clients).
        </p>
        <p>
          Compter 1 a 3 jours selon le volume. AVRA inclut un service de migration assistee dans la beta
          fondateur — vous nous envoyez votre Excel, on l'integre.
        </p>
      </>
    ),
  },
  {
    q: "L'IA est-elle vraiment utile pour un menuisier ?",
    a: (
      <p>
        Plus que vous ne pensez. L'IA photo-realiste produit en 30 secondes un visuel d'agencement bois
        (escalier, dressing, bibliotheque sur mesure) qui aurait pris 2 a 4 heures sur SketchUp. L'IA
        d'extraction lit un PDF de cahier des charges client et pre-remplit le devis. Gain reel : <strong>8
        a 12 heures par semaine</strong> sur un atelier independant.
      </p>
    ),
  },
];

export default function LogicielMenuisier2026() {
  return (
    <>
      <ArticleShell
        category="Guide complet"
        title="Logiciel menuisier 2026 : le guide pour choisir l'ERP qui transforme votre atelier"
        subtitle="Devis, plan technique, planning chantier, pose mobile et facturation electronique : 10 criteres pour selectionner le bon outil, comparer 3 solutions en 1 semaine et eviter les pieges du marche."
        date="30 avril 2026"
        readTime="14 min de lecture"
        author={{ name: 'L\'equipe AVRA', role: 'Concu avec 18 menuisiers pilotes' }}
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            "En 2026, un menuisier qui n'utilise qu'Excel + une boite mail perd en moyenne 7h par semaine en re-saisie et recherche d'infos.",
            "Les 10 criteres qui font la difference : devis structure par poste, integration plan 2D/3D, planning ressources, pose mobile, e-facture, IA photo-realiste.",
            "Budget realiste : 49 a 149 EUR HT/utilisateur/mois. En dessous, vous achetez un outil partiel qu'il faudra remplacer en 18 mois.",
            "L'optimisation matiere (chutes, decoupe) peut faire economiser 8 a 15% de bois par an — plusieurs milliers d'euros pour un atelier moyen.",
            "La cle : choisir un ERP vertical pense menuisier, pas un outil generique 'qui fait aussi'.",
          ]}
        />

        <h2 id="pourquoi-2026">Pourquoi 2026 change la donne</h2>
        <p>
          Pendant 15 ans, les menuisiers ont fait tourner leur atelier avec un trio robuste : Excel pour
          le suivi des chantiers, un logiciel comptable pour la facturation, et un agenda papier pour la
          pose. Cette pile fonctionnait — tant que vous geriez 10 a 15 dossiers actifs en parallele.
        </p>
        <p>
          En 2026, trois facteurs cumulent et obligent a repenser ce modele :
        </p>
        <ul>
          <li>
            <strong>L'obligation e-facture</strong> au 1er juillet 2026 — vos factures doivent etre au
            format Factur-X conforme, transmises a Chorus Pro pour les clients publics, archivees
            legalement 10 ans.
          </li>
          <li>
            <strong>Les attentes clients</strong> : 62% des particuliers en projet de renovation
            attendent desormais un visuel 3D ou photo-realiste avec leur devis (etude IFOP 2026).
          </li>
          <li>
            <strong>La pression sur les marges</strong> : les couts matiere bois ont augmente de 18% sur
            18 mois. Sans suivi precis chantier par chantier, impossible de savoir ou la marge fond.
          </li>
        </ul>

        <Callout variant="insight" title="Le test du dimanche soir">
          Un bon ERP menuisier passe le test du dimanche 18h : sans rien preparer, vous repondez en moins
          de 90 secondes a "Combien de chantiers en pose la semaine prochaine, quel CA prevu, quel
          retard fournisseur potentiel ?". Si votre Excel ne le permet pas, il est temps de changer.
        </Callout>

        <h2 id="differences">Menuisier vs cuisiniste : ce qui change vraiment</h2>
        <p>
          Beaucoup d'editeurs vendent le meme logiciel sous deux marques (cuisiniste / menuisier). C'est
          souvent une erreur de positionnement. Le cycle metier differe sensiblement :
        </p>

        <ComparisonTable
          headers={['Etape', 'Cuisiniste', 'Menuisier']}
          rows={[
            ['Conception', 'Plan 2D/3D pre-conçu fournisseur (Schmidt, Mobalpa)', 'Plan technique sur mesure systematique'],
            ['Devis', '5-7 postes standards (mobilier, electromenager, pose)', '10-15 postes (debits, panneaux, ferrures, finitions, pose)'],
            ['Atelier', 'Pas d\'atelier — assemblage chez le client', 'Production atelier puis transport et pose'],
            ['Decoupe', 'Pre-decoupe usine, montage uniquement', 'Decoupe panneau, optimisation chutes critiques'],
            ['Pose', '1 a 3 jours en moyenne', '2 a 10 jours selon complexite'],
            ['SAV', 'Garanties fabricant longues (5-10 ans)', 'Garantie decennale potentielle (selon ouvrage)'],
          ]}
          highlightCol={2}
        />

        <p>
          Concretement : un logiciel cuisiniste sous-traite la conception au plan fournisseur. Un
          logiciel menuisier doit gerer le plan technique de A a Z, l'optimisation matiere, le bon de
          decoupe atelier, et le transport vers chantier.
        </p>

        <h2 id="criteres">Les 10 fonctions critiques pour 2026</h2>
        <p>
          Voici la grille d'evaluation utilisee par les ateliers pilotes AVRA pour selectionner un ERP :
        </p>

        <ChecklistCard
          title="Grille d'evaluation ERP menuisier — 2026"
          items={[
            { label: 'Devis structure par poste detail', help: 'Decoupe par poste : debits, panneaux, ferrures, finitions, pose. Indispensable pour la marge.' },
            { label: 'Catalogue matieres avec prix dynamique', help: 'Mise a jour automatique des prix bois et panneaux (NF EN 314 etc.).' },
            { label: 'Plan technique import (CSV / XML)', help: 'Compatible SketchUp, Fusion 360, KDMax via export nomenclature.' },
            { label: 'Optimisation decoupe panneau', help: 'Reduction des chutes 8-15%. Pas indispensable mais tres rentable.' },
            { label: 'Planning ressources et atelier', help: 'Vue par semaine, par poseur, par chantier. Drag-and-drop.' },
            { label: 'App mobile pose chantier', help: 'Hors connexion, photos, signature, PV de reception. Critique terrain.' },
            { label: 'E-facture 2026 incluse', help: 'Factur-X natif + transmission Chorus Pro. Obligatoire 1er juillet 2026.' },
            { label: 'IA photo-realiste pour devis', help: 'Visuel d\'ambiance bois en 30s. +18% taux signature observe.' },
            { label: 'Suivi marge par chantier', help: 'Devis vs reel : matiere + main d\'oeuvre + sous-traitance.' },
            { label: 'Support francais 7j/7', help: 'Vous travaillez le samedi, votre support doit etre joignable.' },
          ]}
        />

        <Callout variant="warning" title="Drapeau rouge : la demo trop fluide">
          Si la demo se passe trop bien, demandez a voir le logiciel avec un vrai dossier complexe :
          escalier sur mesure, 25 panneaux differents, 2 poseurs, sous-traitance peinture, 5 visites
          client, retards fournisseur. C'est la que les editeurs nuls trahissent leur outil simpliste.
        </Callout>

        <h2 id="plan-technique">Integration plan technique 2D/3D</h2>
        <p>
          C'est la difference fondamentale avec un cuisiniste : un menuisier produit du sur-mesure. Le
          plan technique n'est pas un detail, c'est le coeur du dossier. Quatre niveaux d'integration
          existent :
        </p>

        <StatGrid
          stats={[
            { value: 'N1', label: 'Aucune', sub: 'plan stocke en PDF dans le dossier' },
            { value: 'N2', label: 'Reference', sub: 'lien vers fichier SketchUp / Fusion' },
            { value: 'N3', label: 'Nomenclature', sub: 'import CSV des debits et matieres' },
            { value: 'N4', label: 'Bidirectionnel', sub: 'sync plan ↔ devis automatique' },
          ]}
        />

        <p>
          Le niveau 3 est le bon compromis pour 90% des menuisiers. Le niveau 4 ne devient rentable
          qu'au-dela de 15 personnes (specialistes type TopSolid Wood). En dessous : trop complexe pour
          le ROI.
        </p>

        <PullQuote author="Atelier pilote AVRA, Bordeaux (8 personnes)">
          On a passe 4 ans avec un Excel et SketchUp en parallele. Depuis qu'on importe le CSV nomenclature
          dans AVRA, le devis est pret en 20 min au lieu de 2 heures.
        </PullQuote>

        <h2 id="pose-mobile">L'app mobile chantier — non negociable</h2>
        <p>
          Si vos poseurs ne peuvent pas utiliser le logiciel <strong>sur leur smartphone, hors connexion,
          en plein chantier</strong>, ils ne le rempliront jamais. Vous reviendrez a vos Excel.
        </p>

        <h3>Les 5 actions vitales sur mobile</h3>
        <ol>
          <li><strong>Consulter le plan</strong> et les cotes du dossier en cours</li>
          <li><strong>Prendre des photos</strong> de l'avancement, attachees au dossier</li>
          <li><strong>Valider une etape</strong> de pose (jalon : depose, pose, reglages, finition)</li>
          <li><strong>Faire signer</strong> un PV de reception client</li>
          <li><strong>Saisir un litige</strong> ou une observation sans rentrer au bureau</li>
        </ol>

        <Callout variant="tip" title="Test de l'app mobile en demo">
          Pendant la demo, demandez a installer l'app sur votre telephone, mettre l'avion sur ON, et faire
          les 5 actions ci-dessus. Si l'app crashe ou perd les donnees au retour 4G, c'est non.
        </Callout>

        <h2 id="efacture">E-facture 2026 : aussi pour les menuisiers</h2>
        <p>
          Beaucoup de menuisiers pensent que l'e-facture ne concerne que les grandes entreprises. C'est
          faux. Au <strong>1er juillet 2026</strong>, toutes les TPE et PME francaises (donc 100% des
          ateliers de menuiserie) doivent emettre et recevoir des factures au format Factur-X.
        </p>
        <p>
          Pour creuser : voir notre <a href="/blog/e-facture-2026">guide complet sur l'e-facture
          obligatoire 2026</a>.
        </p>

        <h2 id="erreurs">6 erreurs classiques en 2026</h2>
        <ol>
          <li><strong>Choisir sur le seul prix</strong>. Un outil a 39 EUR/mois qui ne fait que des devis vous coutera 2 000 EUR par an en outils complementaires.</li>
          <li><strong>Acheter sans tester avec votre nomenclature reelle</strong>. Demandez 14 jours d'essai avec votre catalogue panneaux.</li>
          <li><strong>Ignorer la mobilite poseur</strong>. C'est le critere n.1 que les patrons sous-estiment.</li>
          <li><strong>Sous-estimer la migration</strong>. Un editeur sans accompagnement migration cache son incompetence.</li>
          <li><strong>Confondre CRM et ERP</strong>. Vous avez besoin d'un ERP qui couvre tout le cycle, pas juste la prospection.</li>
          <li><strong>Choisir un outil generique 'qui fait aussi' la menuiserie</strong>. Prenez du vertical metier.</li>
        </ol>

        <h2 id="methode">Comparer 3 solutions en 1 semaine</h2>
        <p>
          Plutot que 8 demos en 3 mois, voici la methode qui fonctionne :
        </p>

        <ComparisonTable
          headers={['Jour', 'Action', 'Livrable']}
          rows={[
            ['Lundi', 'Cadrage besoins : top 5 fonctions critiques pour votre atelier', 'Grille de 5 criteres ponderes'],
            ['Mardi', 'Demo guidee editeur 1 (45 min) avec scenario chantier reel', 'Notes sur la grille'],
            ['Mercredi', 'Demos editeurs 2 et 3 dans la meme journee', 'Notes sur la grille'],
            ['Jeudi', 'Test pratique : creer 3 devis dans chaque solution avec votre nomenclature', 'Score time-to-devis et UX poseur'],
            ['Vendredi', 'Decision et negociation tarifaire (annuel vs mensuel)', 'Contrat signe'],
          ]}
          highlightCol={2}
        />

        <h2 id="avra">Pourquoi AVRA repond aux menuisiers</h2>
        <p>
          AVRA est concu avec 18 menuisiers pilotes en Nouvelle-Aquitaine, Auvergne-Rhone-Alpes et
          Ile-de-France. Notre approche :
        </p>
        <ul>
          <li><strong>Nomenclature panneau native</strong>, import CSV depuis vos plans techniques.</li>
          <li><strong>App mobile chantier hors connexion</strong> — testee avec 4G coupee.</li>
          <li><strong>E-facture 2026 incluse</strong>, Factur-X + Chorus Pro automatique.</li>
          <li><strong>IA photo-realiste</strong> qui comprend les ambiances bois (escalier, dressing, bibliotheque sur mesure).</li>
          <li><strong>Support francais</strong> 5j/7 par telephone et chat avec d'anciens menuisiers.</li>
        </ul>
        <p>
          Beta privee gratuite pendant 90 jours pour les premiers ateliers inscrits.
        </p>

        <h2 id="faq">Questions frequentes</h2>
        <FAQ items={FAQ_ITEMS} />

        <FinalCTA
          title="Pret a digitaliser votre atelier ?"
          subtitle="Rejoignez la beta privee AVRA et beneficiez d'un accompagnement de migration personnalise pendant 90 jours."
        />

        <RelatedArticles
          items={[
            { href: '/blog/comment-choisir-erp-cuisiniste', title: 'Choisir son ERP cuisiniste', description: '12 criteres pour le metier voisin — beaucoup s\'appliquent a la menuiserie.', tag: 'Guide' },
            { href: '/blog/e-facture-2026', title: 'E-facture 2026 : guide complet', description: 'L\'obligation Factur-X concerne 100% des menuisiers.', tag: 'Reglementation' },
            { href: '/menuisier', title: 'AVRA pour menuisiers', description: 'Comment AVRA traite les specificites du metier.', tag: 'Metier' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: "Logiciel menuisier 2026 : le guide pour choisir l'ERP qui transforme votre atelier",
        description: "Le guide ultime pour choisir un logiciel menuisier en 2026 : 10 fonctions essentielles, comparatif, plan technique, devis, planning, pose mobile, facturation electronique.",
        image: 'https://avra-app.fr/opengraph-image.png',
        datePublished: '2026-04-30',
        dateModified: '2026-05-01',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/logiciel-menuisier-2026' },
        articleSection: 'Guide',
        keywords: 'logiciel menuisier, ERP menuisier, devis menuisier, planning menuisier, e-facture',
        inLanguage: 'fr-FR',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: typeof item.a === 'string' ? item.a : "Voir l'article complet pour la reponse detaillee." },
        })),
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra-app.fr/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://avra-app.fr/blog' },
          { '@type': 'ListItem', position: 3, name: 'Logiciel menuisier 2026', item: 'https://avra-app.fr/blog/logiciel-menuisier-2026' },
        ],
      }) }} />
    </>
  );
}
