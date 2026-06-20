'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'pourquoi-erp', label: 'Pourquoi un ERP plutôt qu\'un logiciel ponctuel' },
  { id: 'cout-cache', label: 'Le coût caché du « pas-de-logiciel »' },
  { id: 'criteres', label: 'Les 12 critères qui comptent vraiment' },
  { id: 'metier', label: 'Couverture du cycle métier complet' },
  { id: 'ia', label: 'IA : gadget ou levier réel ?' },
  { id: 'efacture', label: 'Conformité e-facture 2026' },
  { id: 'erreurs', label: '7 erreurs classiques à éviter' },
  { id: 'comparer', label: 'Comparer 3 solutions en 1 semaine' },
  { id: 'avra', label: 'Pourquoi AVRA a été conçu différemment' },
  { id: 'faq', label: 'Questions fréquentes' },
];

const FAQ_ITEMS = [
  {
    q: "Combien coûte un bon ERP de cuisiniste en 2026 ?",
    a: (
      <>
        <p>
          Les solutions sérieuses se situent entre <strong>49 € et 180 € HT par utilisateur et par mois</strong>.
          En dessous de 50 €, vous trouvez surtout des outils de devis isolés sans gestion de projet ni intégrations.
          Au-delà de 200 €, vous payez généralement pour des modules dont vous n'avez pas besoin.
        </p>
        <p>
          Le bon ratio coût/valeur se calcule en prenant en compte le temps gagné : un cuisiniste qui économise 6 h
          par semaine grâce à un ERP rentabilise un abonnement à 120 €/mois en 2 jours de chantier.
        </p>
      </>
    ),
  },
  {
    q: "Faut-il un ERP dès la création de l'activité ?",
    a: (
      <p>
        Pas forcément. En dessous de 10 dossiers actifs et un seul opérateur, un tableur peut suffire 6 à 12 mois.
        Le passage à un ERP devient incontournable dès que vous gérez plus de 15 dossiers en parallèle, que vous
        sous-traitez la pose, ou que vous embauchez un commercial. Le seuil critique observé : 30 dossiers/an.
      </p>
    ),
  },
  {
    q: "Mon installateur poseur peut-il utiliser le logiciel sur chantier ?",
    a: (
      <p>
        C'est le critère que les artisans sous-estiment le plus. Beaucoup d'éditeurs vendent une appli web non
        responsive, inutilisable sur smartphone. Vérifiez toujours qu'un poseur peut <strong>consulter les plans,
        valider une étape, prendre des photos et signer un PV de réception</strong> directement depuis son téléphone,
        même hors connexion.
      </p>
    ),
  },
  {
    q: "Que faire des données de mon ancien logiciel ?",
    a: (
      <>
        <p>
          La portabilité des données est un droit (RGPD article 20). Tout éditeur sérieux doit pouvoir exporter
          vos clients, devis, factures et fournisseurs en CSV ou Excel.
        </p>
        <p>
          La migration prend en moyenne 2 à 5 jours selon le volume. Demandez à votre nouvel ERP s'il propose
          un service de migration assistée — chez AVRA, c'est inclus pour les premiers utilisateurs.
        </p>
      </>
    ),
  },
  {
    q: "Quelle différence entre un CRM cuisiniste et un ERP cuisiniste ?",
    a: (
      <>
        <p>
          Un <strong>CRM</strong> (Customer Relationship Management) gère uniquement la relation commerciale :
          prospects, devis, signature. Un <strong>ERP</strong> (Enterprise Resource Planning) couvre l'ensemble :
          devis, planning, achats, stock, pose, facturation, SAV.
        </p>
        <p>
          90 % des cuisinistes ont besoin d'un ERP, pas seulement d'un CRM. Le piège : croire qu'un CRM suffira
          puis devoir changer 18 mois plus tard.
        </p>
      </>
    ),
  },
  {
    q: "Puis-je connecter mon logiciel de plan 3D à un ERP ?",
    a: (
      <p>
        Oui, à condition que l'ERP propose une API ouverte. Les principaux outils 3D du métier (Winner, KD-Max,
        2020 Design, SketchUp) peuvent transmettre une nomenclature au format CSV ou XML. Demandez toujours une
        démonstration de l'import avant de signer — c'est là que les éditeurs survendent leurs intégrations.
      </p>
    ),
  },
  {
    q: "Mes clients particuliers vont-ils accepter de signer électroniquement ?",
    a: (
      <p>
        Oui dans 95 % des cas. La signature électronique est valable juridiquement depuis 2014 (règlement eIDAS).
        Les clients de plus de 60 ans demandent parfois un PDF imprimable « en plus » — c'est un faux problème,
        votre logiciel doit pouvoir générer les deux.
      </p>
    ),
  },
];

export default function ERPCuisinisteGuide() {
  return (
    <>
      <ArticleShell
        category="Guide complet"
        title="Comment choisir son logiciel ERP de cuisiniste en 2026"
        subtitle="Devis, planning, IA, facturation, pose : ce guide vous donne les 12 critères qui comptent vraiment, les pièges à éviter et une méthode en 1 semaine pour comparer 3 solutions sans vous tromper."
        date="28 avril 2026"
        readTime="15 min de lecture"
        author={{ name: 'L\'équipe AVRA', role: 'Conçu avec 47 cuisinistes pilotes' }}
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            "Un ERP cuisiniste se distingue d'un simple logiciel de devis par la couverture de tout le cycle : prospection → pose → SAV.",
            "Les 12 critères qui font la différence en 2026 : conformité e-facture, IA photo-réalisme, mobilité poseur, intégration plan 3D, signature, paiement.",
            "Budget réaliste : 50 à 180 € HT/mois/utilisateur. En dessous, vous achetez un outil partiel qu'il faudra remplacer en 18 mois.",
            "La méthode « 3 solutions en 1 semaine » : 1 jour de cadrage besoins, 3 démos guidées, 2 jours de tests réels avec un dossier représentatif.",
            "Le critère sous-estimé : la qualité de la migration des données et le support en français pendant les 90 premiers jours.",
          ]}
        />

        <h2 id="pourquoi-erp">Pourquoi un ERP plutôt qu'un logiciel ponctuel</h2>
        <p>
          Demandez à dix cuisinistes ce qu'ils utilisent au quotidien : vous obtiendrez dix piles de logiciels
          différentes. Un outil 3D pour les plans, un tableur Excel pour le suivi des dossiers, une boîte mail
          pour la communication client, un logiciel comptable pour la facturation, un agenda Google pour les
          rendez-vous. Cette mosaïque fonctionne — jusqu'à ce qu'elle ne fonctionne plus.
        </p>
        <p>
          Le moment de bascule arrive en général entre 25 et 40 dossiers actifs. Trop d'informations à
          recroiser, trop de temps perdu à retrouver « le devis de Madame Dupont », trop de relances oubliées,
          trop de marges qui fondent sans qu'on sache pourquoi. C'est précisément à ce stade qu'un <strong>ERP
          (Enterprise Resource Planning)</strong> spécialisé cuisiniste fait basculer l'équilibre économique
          de votre activité.
        </p>
        <p>
          Un ERP n'est pas un super tableur. C'est un <strong>fil rouge unique</strong> qui suit chaque dossier
          du premier appel téléphonique jusqu'à la dernière intervention SAV, en gardant la trace de tout : qui
          a parlé à qui, quel devis a été envoyé quand, quelle commande est partie chez quel fournisseur, quel
          poseur intervient quand, et surtout : combien chaque chantier vous a rapporté.
        </p>

        <Callout variant="insight" title="Le test du vendredi soir">
          <p>
            Un bon ERP cuisiniste passe le test du vendredi 18h : sans aucune préparation, vous devez pouvoir
            répondre en moins de 2 minutes à la question « Combien j'ai facturé cette semaine, combien j'ai
            posé, combien il me reste à livrer la semaine prochaine ? ». Si votre outil actuel ne le permet pas,
            il est temps de changer.
          </p>
        </Callout>

        <h2 id="cout-cache">Le coût caché du « pas-de-logiciel »</h2>
        <p>
          On compare souvent le prix d'un ERP au coût « zéro » d'un tableur Excel ou d'un logiciel de devis seul.
          C'est une erreur d'analyse classique : le coût de ne rien centraliser est invisible mais massif.
        </p>

        <StatGrid
          stats={[
            { value: '6 h', label: 'par semaine', sub: 'temps perdu en re-saisie et recherche d\'infos' },
            { value: '12 %', label: 'de marge perdue', sub: 'sur les chantiers mal suivis' },
            { value: '1 sur 3', label: 'devis non relancés', sub: 'faute d\'alerte automatique' },
            { value: '2 mois', label: 'de retard moyen', sub: 'pour facturer la pose' },
          ]}
        />

        <p>
          Ces chiffres viennent de l'étude conduite par AVRA en 2025 sur 47 cuisinistes pilotes. Pour un artisan
          réalisant 350 000 € de CA annuel, ces inefficacités représentent <strong>environ 42 000 € de marge
          évaporée</strong> chaque année. À comparer avec les 1 440 € HT/an d'un ERP à 120 €/mois.
        </p>

        <PullQuote author="Cassandra G., cuisiniste indépendante (Lyon)">
          Avant AVRA, je passais mes dimanches à recoller mes Excel. Aujourd'hui je récupère 3 dossiers de plus
          par mois sans me lever plus tôt.
        </PullQuote>

        <h2 id="criteres">Les 12 critères qui comptent vraiment</h2>
        <p>
          Tous les éditeurs de logiciels promettent la lune sur leur page d'accueil. Voici la grille qui sépare
          les vraies solutions professionnelles des « jolies maquettes » :
        </p>

        <ChecklistCard
          title="Grille d'évaluation ERP cuisiniste — 2026"
          items={[
            { label: 'Cycle complet métier', help: 'Prospection, devis, signature, achats, planning pose, facturation, SAV — sans rupture entre les modules.' },
            { label: 'Conformité e-facture 2026', help: 'Génération native Factur-X et envoi à Chorus Pro inclus, pas en option.' },
            { label: 'IA photo-réaliste intégrée', help: 'Pour transformer un croquis ou une photo en rendu présentable au client en 3 minutes.' },
            { label: 'Mobilité poseur', help: 'Application mobile native iOS/Android, fonctionnelle hors connexion sur chantier.' },
            { label: 'Signature électronique', help: 'Signature certifiée eIDAS incluse, sans coût additionnel par signature.' },
            { label: 'Paiement en ligne', help: 'Lien de paiement Stripe ou équivalent intégré au devis et à la facture.' },
            { label: 'Catalogue produits structuré', help: 'Import des nomenclatures fournisseurs (Schmidt, Mobalpa, Vorwerk, IXINA, KD-Max).' },
            { label: 'Planning multi-ressources', help: 'Vues équipes, planning gestion, intervention partagée avec les sous-traitants.' },
            { label: 'Tableau de bord pilotage', help: 'CA, marge, dossiers actifs, devis en attente, retards de pose — visible en 1 écran.' },
            { label: 'Portails partenaires', help: 'Accès dédiés pour vos architectes, poseurs et sous-traitants : ils voient leurs propres dossiers.' },
            { label: 'API et exports', help: 'Connexion à votre comptabilité (EBP, Sage, Pennylane) et exports universels CSV.' },
            { label: 'Support en français', help: 'Téléphone et chat avec un humain qui connaît votre métier, pas un bot offshore.' },
          ]}
        />

        <Callout variant="warning" title="Drapeau rouge : la démo trop parfaite">
          Si pendant la démo tout est ultra-rapide et zéro plantage, méfiez-vous. Demandez à voir le logiciel avec
          50 dossiers réels, 200 devis, 1 000 lignes de catalogue — c'est là que les vraies différences de
          performance apparaissent. Un éditeur qui refuse a quelque chose à cacher.
        </Callout>

        <h2 id="metier">Couverture du cycle métier complet</h2>
        <p>
          Un ERP cuisiniste digne de ce nom doit gérer <strong>9 étapes consécutives</strong> sans jamais vous
          obliger à ressaisir une donnée déjà connue :
        </p>
        <ol>
          <li><strong>Prospect</strong> — captation depuis le site web, salons, recommandations, qualification du besoin.</li>
          <li><strong>Visite technique</strong> — relevé des cotes, photos du lieu, contraintes techniques (eau, élec, gaz).</li>
          <li><strong>Plan et rendu IA</strong> — proposition visuelle convaincante en 1 à 3 jours.</li>
          <li><strong>Devis structuré</strong> — chiffrage par poste, options claires, conditions de paiement.</li>
          <li><strong>Signature et acompte</strong> — validation électronique + paiement de l'acompte en ligne.</li>
          <li><strong>Commande fournisseurs</strong> — bons de commande générés depuis le devis signé.</li>
          <li><strong>Planning pose</strong> — coordination installateurs, sous-traitants (plombier, électricien).</li>
          <li><strong>Facturation et solde</strong> — facture finale, lien de paiement, rappels automatiques.</li>
          <li><strong>SAV et suivi qualité</strong> — historique des interventions, garanties, relances satisfaction.</li>
        </ol>
        <p>
          La rupture entre deux étapes est <em>le</em> moment où on perd de l'argent. Un client qui doit
          recevoir un devis, un fournisseur qui n'a pas reçu sa commande, un poseur qui n'a pas la dernière
          version du plan : à chaque étape, l'absence d'un fil rouge coûte du chiffre d'affaires.
        </p>

        <h2 id="ia">IA : gadget ou levier réel ?</h2>
        <p>
          En 2024, l'IA dans les logiciels métier était un argument marketing. En 2026, c'est devenu un
          différenciateur opérationnel. Mais attention : toutes les « IA » ne se valent pas, et certains éditeurs
          collent l'étiquette sur des fonctions qui n'ont rien d'intelligent.
        </p>

        <h3>Les 4 usages d'IA qui changent vraiment le métier</h3>
        <ul>
          <li>
            <strong>Photo-réalisme et coloriste IA.</strong> Vous prenez une photo de la cuisine actuelle de
            votre client, vous décrivez en une phrase la transformation, et vous obtenez un visuel
            photo-réaliste en 30 secondes. Avant : 4 h sur SketchUp pour un rendu correct. Après : 30 secondes
            pendant le rendez-vous.
          </li>
          <li>
            <strong>Extraction de documents.</strong> Vous uploadez un PDF de plans techniques ou un devis
            fournisseur, l'IA en extrait automatiquement les dates butoirs, les références, les montants HT par
            catégorie. Économie : 20 à 40 minutes par dossier.
          </li>
          <li>
            <strong>Assistant projet conversationnel.</strong> Vous demandez à votre logiciel « Quels dossiers
            sont en retard sur la commande fournisseur cette semaine ? » et vous obtenez la réponse précise. Pas
            de filtres compliqués à configurer.
          </li>
          <li>
            <strong>Suggestions d'alertes proactives.</strong> Le logiciel détecte que la commande Mobalpa
            n'arrivera pas avant la date de pose et vous alerte 5 jours en amont au lieu du jour J.
          </li>
        </ul>

        <Callout variant="tip" title="Comment tester si une IA est sérieuse">
          Demandez en démo de comparer le rendu IA avec votre photo de cuisine actuelle. Une vraie IA
          photo-réaliste comme celle d'AVRA respecte la lumière, les proportions et les matières. Une IA
          gadget vous donnera un rendu générique « pinterest » qui ne ressemble pas à votre lieu réel.
        </Callout>

        <h2 id="efacture">Conformité e-facture 2026 : non négociable</h2>
        <p>
          Depuis le 1er juillet 2026, toutes les TPE et PME françaises doivent émettre et recevoir des factures
          électroniques au format Factur-X (ou UBL). Ce n'est plus une option : un cuisiniste qui envoie une
          facture PDF classique à une entreprise s'expose à un rejet et à des pénalités.
        </p>
        <p>
          Or, beaucoup d'éditeurs facturent la conformité e-facture en option payante (souvent 15 à 30 €/mois
          en plus). Vérifiez :
        </p>
        <ul>
          <li>La conformité Factur-X est-elle <strong>incluse dans l'abonnement de base</strong> ou en option ?</li>
          <li>Le logiciel transmet-il automatiquement à <strong>Chorus Pro</strong> pour vos clients publics ?</li>
          <li>L'archivage légal est-il intégré (10 ans de conservation horodatée) ?</li>
        </ul>
        <p>
          Pour creuser le sujet, lisez notre <a href="/blog/e-facture-2026">guide complet sur l'e-facture
          obligatoire en 2026</a>.
        </p>

        <h2 id="erreurs">7 erreurs classiques à éviter en 2026</h2>
        <ol>
          <li>
            <strong>Choisir sur le seul critère du prix.</strong> Un ERP à 39 €/mois qui ne couvre que les devis
            vous coûtera deux fois plus cher en outils complémentaires en 18 mois.
          </li>
          <li>
            <strong>Acheter sans tester avec ses propres données.</strong> Une démo guidée par le commercial
            n'est jamais représentative de votre activité réelle. Demandez toujours 14 jours d'essai.
          </li>
          <li>
            <strong>Ignorer le critère mobilité.</strong> Si vos poseurs ne peuvent pas l'utiliser sur chantier,
            ils ne saisiront rien et vous reviendrez à votre Excel.
          </li>
          <li>
            <strong>Sous-estimer la migration.</strong> Un éditeur qui ne propose pas un accompagnement de
            migration est un éditeur qui ne sait pas le faire. Fuyez.
          </li>
          <li>
            <strong>Confondre CRM et ERP.</strong> Un CRM gère vos prospects. Un ERP gère votre métier complet.
            Vous avez besoin d'un ERP.
          </li>
          <li>
            <strong>Tomber dans le piège « tout-en-un » trop générique.</strong> Un logiciel généraliste qui
            « fait aussi » la cuisine ne connaît rien aux spécificités du métier. Choisissez du vertical.
          </li>
          <li>
            <strong>Oublier le support.</strong> Un logiciel sans support en français disponible le samedi est
            un logiciel inutilisable pour un artisan qui travaille en horaires décalés.
          </li>
        </ol>

        <h2 id="comparer">La méthode « 3 solutions en 1 semaine »</h2>
        <p>
          Plutôt que de visionner 8 démos en 3 mois et finir par ne rien décider, voici la méthode
          opérationnelle utilisée par les cuisinistes qui ont fait le bon choix :
        </p>

        <ComparisonTable
          headers={['Jour', 'Action', 'Livrable']}
          rows={[
            ['Lundi', 'Cadrage besoins : top 5 fonctions critiques pour votre activité', 'Grille de 5 critères pondérés'],
            ['Mardi', 'Démo guidée éditeur 1 (45 min) avec scénario de votre dossier réel', 'Notes sur la grille'],
            ['Mercredi', 'Démo guidée éditeur 2 + démo guidée éditeur 3', 'Notes sur la grille'],
            ['Jeudi', 'Test pratique : créer 3 devis dans chaque solution avec vos vrais produits', 'Score time-to-devis'],
            ['Vendredi', 'Décision et négociation tarifaire (annuel vs mensuel, gratuité 1er mois)', 'Contrat signé'],
          ]}
          highlightCol={2}
        />

        <Callout variant="info" title="Le scénario de test minimal">
          Préparez 3 dossiers réels à reproduire dans chaque démo : 1 cuisine d'entrée de gamme à 8 000 €, 1
          cuisine moyen-haut de gamme à 18 000 € avec ilôt central, 1 dressing complexe à 6 000 €. Si l'éditeur
          ne peut pas reproduire vos 3 cas en moins de 30 minutes chacun, le logiciel n'est pas adapté.
        </Callout>

        <h2 id="avra">Pourquoi AVRA a été conçu différemment</h2>
        <p>
          Nous n'écrivons pas ce paragraphe pour vous vendre AVRA — vous avez largement de quoi décider seul à
          ce stade. Mais comme nous sommes l'éditeur de cet article, voici en quoi notre approche diffère :
        </p>
        <ul>
          <li>
            <strong>AVRA est conçu avec 47 cuisinistes, menuisiers et architectes pilotes</strong>, pas par des
            développeurs en chambre. Chaque écran a été validé sur le terrain.
          </li>
          <li>
            <strong>L'IA photo-réaliste est native</strong>, pas branchée à un service tiers payant à l'usage.
            Vous générez autant de rendus que nécessaire, sans surcoût.
          </li>
          <li>
            <strong>L'e-facture 2026 est incluse</strong> dans l'abonnement de base, conforme Factur-X et
            transmise automatiquement à Chorus Pro.
          </li>
          <li>
            <strong>L'application mobile fonctionne hors connexion</strong> pour vos poseurs, avec
            synchronisation automatique au retour en zone couverte.
          </li>
          <li>
            <strong>Le support est 100 % français</strong>, par téléphone et chat, avec des conseillers qui ont
            travaillé dans le métier.
          </li>
        </ul>
        <p>
          AVRA est en bêta privée jusqu'au lancement public de janvier 2027. Les premiers utilisateurs ont
          accès à un accompagnement personnalisé de 90 jours et à un tarif fondateur verrouillé à vie.
        </p>

        <h2 id="faq">Questions fréquentes</h2>
        <FAQ items={FAQ_ITEMS} />

        <FinalCTA
          title="Prêt à choisir le bon outil ?"
          subtitle="Rejoignez la bêta privée AVRA et bénéficiez d'un accompagnement personnalisé de 90 jours pour migrer sereinement depuis votre outil actuel."
        />

        <RelatedArticles
          items={[
            { href: '/blog/logiciel-cuisiniste-comparatif', title: 'Top 7 logiciels cuisinistes 2026', description: 'Comparatif complet des solutions du marché : prix, fonctions, points forts.', tag: 'Comparatif' },
            { href: '/blog/e-facture-2026', title: 'E-facture 2026 : guide complet', description: 'Tout ce que les artisans doivent savoir sur l\'obligation Factur-X.', tag: 'Réglementation' },
            { href: '/cuisiniste', title: 'AVRA pour les cuisinistes', description: 'La page métier qui décrit comment AVRA résout les problèmes spécifiques des cuisinistes.', tag: 'Métier' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: "Comment choisir son logiciel ERP de cuisiniste en 2026 — Guide complet",
        description: "Le guide ultime pour choisir le bon logiciel ERP de cuisiniste en 2026 : 12 critères essentiels, comparatif des solutions, pièges à éviter et checklist de sélection.",
        image: 'https://avra-app.fr/opengraph-image.png',
        datePublished: '2026-04-28',
        dateModified: '2026-05-01',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/comment-choisir-erp-cuisiniste' },
        articleSection: 'Guide',
        keywords: 'logiciel cuisiniste, ERP cuisiniste, choisir logiciel cuisiniste, logiciel gestion cuisine, e-facture 2026',
        inLanguage: 'fr-FR',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: typeof item.a === 'string' ? item.a : 'Voir l\'article complet pour la réponse détaillée.' },
        })),
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra-app.fr/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://avra-app.fr/blog' },
          { '@type': 'ListItem', position: 3, name: 'Comment choisir son ERP cuisiniste', item: 'https://avra-app.fr/blog/comment-choisir-erp-cuisiniste' },
        ],
      }) }} />
    </>
  );
}
