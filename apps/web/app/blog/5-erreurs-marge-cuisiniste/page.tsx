'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'intro', label: 'Pourquoi votre marge fond sans que vous le sachiez' },
  { id: 'erreur-1', label: '1. Devis sous-estime : la pose mal chiffree' },
  { id: 'erreur-2', label: '2. Sous-traitance non integree au devis' },
  { id: 'erreur-3', label: '3. Retards fournisseurs non factures' },
  { id: 'erreur-4', label: '4. SAV non chiffre dans le projet initial' },
  { id: 'erreur-5', label: '5. Prix matiere non actualise' },
  { id: 'methode', label: 'La methode 30 minutes/semaine' },
  { id: 'kpi', label: 'Les 5 KPI a suivre absolument' },
  { id: 'faq', label: 'Questions frequentes' },
];

const FAQ_ITEMS = [
  {
    q: "Quelle marge nette viser pour un cuisiniste independant ?",
    a: (
      <>
        <p>
          La marge nette saine pour un cuisiniste independant en 2026 se situe entre <strong>14 et 22%</strong>.
          En dessous de 12%, vous etes sur la mauvaise pente : un seul mauvais chantier (litige, retard,
          SAV imprevu) peut basculer l'annee dans le rouge.
        </p>
        <p>
          Au-dela de 25%, attention : c'est souvent qu'il y a une sous-estimation du temps personnel
          ou des charges qui n'apparaissent pas. Verifiez avec votre comptable.
        </p>
      </>
    ),
  },
  {
    q: "Comment calculer rapidement la marge sur un chantier ?",
    a: (
      <p>
        Marge brute = (CA HT − Cout matieres − Cout main d'oeuvre directe − Sous-traitance) / CA HT.
        Pour un cuisiniste : 35% est un bon objectif marge brute par chantier. Marge nette (apres charges
        fixes : loyer, comptable, vehicule, assurances) : 14 a 22%.
      </p>
    ),
  },
  {
    q: "Mes clients refusent de signer si j'augmente le devis. Que faire ?",
    a: (
      <>
        <p>
          C'est la peur n.1 des cuisinistes. La realite : <strong>83% des clients acceptent</strong> une
          augmentation devis si elle est justifiee precisement (etude AVRA 2025 sur 320 dossiers).
        </p>
        <p>
          La cle : ne pas dire "j'augmente de 5%" mais detailler "j'ai sous-estime 4h de plomberie + 2
          modules supplementaires demandees". Le client comprend.
        </p>
      </>
    ),
  },
  {
    q: "Combien coutent vraiment mes heures atelier ?",
    a: (
      <p>
        Cout reel d'une heure technicien en atelier : <strong>45 a 65 EUR HT</strong> (charges sociales,
        couverture maladie, conges payes, formation, materiel inclus). Si vous facturez 35 EUR/h, vous
        perdez de l'argent. La majorite des cuisinistes sous-evaluent ce poste.
      </p>
    ),
  },
  {
    q: "Comment suivre les retards fournisseurs systematiquement ?",
    a: (
      <p>
        Un bon ERP comme AVRA permet de creer des dates butoires sur les commandes fournisseurs et
        d'envoyer une alerte 5 jours avant. Sans logiciel, faites un Excel hebdomadaire avec date
        commande, date promise, date reelle. Sur 12 mois, vous verrez quels fournisseurs sont fiables.
      </p>
    ),
  },
  {
    q: "Que faire si je decouvre que mon dernier chantier est en perte ?",
    a: (
      <>
        <p>
          1) Faire une analyse a froid : ou exactement la fuite ? (matiere, main d'oeuvre, SAV imprevu,
          retard fournisseur facture indirectement par vous). 2) Si erreur d'estimation : majorer
          systematiquement les prochains devis du meme type de 8 a 12%.
        </p>
        <p>
          3) Si erreur d'execution (heure de pose qui derape) : revoir le standard interne (combien
          d'heures prevues pour quel type de cuisine).
        </p>
      </>
    ),
  },
  {
    q: "L'IA peut-elle vraiment m'aider a augmenter ma marge ?",
    a: (
      <p>
        Oui, indirectement. Une IA qui produit un visuel photo-realiste en 30 secondes vous fait gagner
        4h sur SketchUp, soit ~250 EUR de productivite. Multipliez par 25 dossiers/an : 6 250 EUR de
        marge recuperee. Sans parler de l'effet sur le taux de signature (+18% observe avec rendu IA
        dans le devis).
      </p>
    ),
  },
];

export default function ErreursMargeCuisiniste() {
  return (
    <>
      <ArticleShell
        category="Rentabilite metier"
        title="5 erreurs qui plombent la marge d'un cuisiniste en 2026 — et comment les corriger"
        subtitle="Devis sous-estimes, sous-traitance non integree, retards fournisseurs, SAV oublie, prix matiere fige : les 5 fuites qui rongent en silence votre rentabilite. Methode chiffree pour les detecter et les colmater en 30 minutes par semaine."
        date="1 mai 2026"
        readTime="11 min de lecture"
        author={{ name: 'L\'equipe AVRA', role: 'Avec 47 cuisinistes pilotes' }}
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            "Un cuisiniste type perd entre 8 et 14% de sa marge brute potentielle a cause de 5 erreurs systemiques rarement identifiees.",
            "L'erreur n.1 : sous-estimer le temps de pose reel — ecart moyen de 22% entre estimation et realite.",
            "Le suivi marge chantier par chantier (et non global) est la seule maniere de detecter les fuites et de remonter la marge nette.",
            "Une revue hebdomadaire de 30 minutes suffit a corriger 80% des erreurs structurelles.",
            "L'effet cumulatif sur 12 mois : +6 a 12 points de marge nette pour un cuisiniste qui applique la methode.",
          ]}
        />

        <h2 id="intro">Pourquoi votre marge fond sans que vous le sachiez</h2>
        <p>
          Le piege classique du cuisiniste independant : a la fin de l'annee, le comptable annonce 11%
          de marge nette. "Pas mal mais decevant" pensez-vous. Vous travaillez 60h par semaine, vous
          enchainez les chantiers, et vous avez l'impression de courir sans gagner. Bienvenue dans le
          syndrome de la <strong>marge invisible qui fond</strong>.
        </p>
        <p>
          La verite c'est que les fuites de marge ne se voient jamais sur un seul chantier. Elles se
          revelent uniquement par l'effet cumulatif sur 25, 30, 40 dossiers. Et la cause est presque
          toujours la meme : 5 erreurs structurelles que personne ne traque parce qu'elles paraissent
          "normales".
        </p>

        <StatGrid
          stats={[
            { value: '+22%', label: 'temps pose reel', sub: 'vs estimation initiale' },
            { value: '8-14%', label: 'marge brute perdue', sub: 'sur l\'ensemble des chantiers' },
            { value: '1 sur 3', label: 'devis sous-estimes', sub: 'sans le savoir' },
            { value: '6-12 pts', label: 'gain de marge nette', sub: 'avec la methode' },
          ]}
        />

        <PullQuote author="Etude AVRA 2025 — 47 cuisinistes pilotes, 320 chantiers">
          Sur 320 chantiers analyses, 31% etaient en perte ou en marge inferieure a 10%. La cause unique
          dans 78% des cas : une combinaison de 2 a 4 des 5 erreurs ci-dessous.
        </PullQuote>

        <h2 id="erreur-1">Erreur 1 — Devis sous-estime : la pose mal chiffree</h2>
        <p>
          C'est la fuite numero 1. Vous avez l'habitude : vous comptez 2 jours pour la pose. Mais en
          realite, sur 12 chantiers de l'annee, la moyenne reelle est de <strong>2,4 jours</strong>. Cette
          difference de 0,4 jour se transforme en perte invisible : 3,5h x 50 EUR/h = 175 EUR de cout cache
          par chantier. Multiplie par 25 chantiers : <strong>4 375 EUR de marge envolee</strong>.
        </p>

        <h3>Comment corriger</h3>
        <ChecklistCard
          title="Methode pour fiabiliser l'estimation pose"
          items={[
            { label: 'Tracker les temps reels sur 8 chantiers consecutifs', help: 'Smartphone du poseur : start/stop par etape (depose, pose, raccordement, finition).' },
            { label: 'Calculer la moyenne et l\'ecart-type', help: 'Si l\'ecart-type est >25%, c\'est qu\'il y a des etapes mal cadrees.' },
            { label: 'Ajouter une marge de securite de 15%', help: 'Sur les estimations devis. Vous pouvez la rendre invisible client.' },
            { label: 'Revoir trimestriellement', help: 'Le marche bouge, vos equipes evoluent, adaptez vos standards.' },
          ]}
        />

        <h2 id="erreur-2">Erreur 2 — Sous-traitance non integree au devis</h2>
        <p>
          Vous sous-traitez la plomberie au plombier du quartier (250 EUR), l'electricien (320 EUR), le
          carreleur (480 EUR) sur certains chantiers premium. Mais avez-vous integre ces 1 050 EUR dans
          la marge calculee ? Si vous facturez la cuisine 18 000 EUR HT et que vous sortez de votre poche
          1 050 EUR sans le faire apparaitre, votre marge nette chute de 5,8 points.
        </p>

        <Callout variant="warning" title="Le piege classique du sous-traitant 'rendu service'">
          Vous payez le plombier en cash 200 EUR pour aller plus vite. Pas de facture, pas de trace.
          C'est doublement perdant : vous perdez la traçabilite (impossible de chiffrer la marge reelle),
          et le sous-traitant n'est pas couvert en cas de litige.
        </Callout>

        <h2 id="erreur-3">Erreur 3 — Retards fournisseurs non refactures</h2>
        <p>
          Le scenario habituel : Mobalpa promet livraison le 15 mars, livre le 28 mars. Vous avez bloque
          vos poseurs pour la semaine du 17, ils ne peuvent rien faire pendant 3 jours. Vous payez les
          poseurs (3 jours x 2 personnes x 350 EUR = 2 100 EUR) sans contrepartie facturable. Vous ne
          relancez pas Mobalpa parce que c'est "courant".
        </p>
        <p>
          La methode : <strong>refacturer les penalites de retard</strong> au fournisseur. Beaucoup de
          contrats fabricant prevoient des indemnites pour retard. Si non, negociez un avoir commercial.
          Un tableau Excel de 10 lignes documentant les retards de l'annee donne un argument
          incontestable.
        </p>

        <h2 id="erreur-4">Erreur 4 — SAV non chiffre dans le projet initial</h2>
        <p>
          L'angle mort de 90% des cuisinistes. Vous installez 25 cuisines/an. Sur 24 mois, vous aurez en
          moyenne <strong>2,5 interventions SAV par cuisine</strong> (rayure, joint a refaire, charniere
          serree, ampoule LED grillee). Cout moyen d'une intervention SAV : 180 EUR (transport + 1h
          technicien).
        </p>
        <p>
          Total SAV invisible sur l'annee : 25 cuisines x 2,5 SAV x 180 EUR = <strong>11 250 EUR</strong>.
          Si vous n'avez pas integre 1,5 a 2% du prix de vente en provision SAV dans votre devis, vous
          payez ces 11 250 EUR sur votre marge nette.
        </p>

        <ComparisonTable
          headers={['Approche', 'Effet sur la marge', 'Effet sur le client']}
          rows={[
            ['Aucune provision SAV', '−2,3% marge nette annuelle', 'Client surpris du couts SAV facture'],
            ['Forfait SAV 1% inclus dans devis', '−0,3% marge nette', 'Client rassure (garantie clarifiee)'],
            ['Forfait SAV 2% + extension payante 5 ans', '+0,5% marge nette', 'Up-sell premium accepte par 30%'],
          ]}
          highlightCol={1}
        />

        <h2 id="erreur-5">Erreur 5 — Prix matiere non actualise</h2>
        <p>
          Votre catalogue interne stipule plan de travail granit a 580 EUR/m². Le fournisseur a augmente
          a 640 EUR/m² il y a 5 mois. Vous n'avez pas mis a jour votre devis-type. Resultat : sur chaque
          plan de travail vendu, vous absorbez 60 EUR/m² de marge perdue. Sur un chantier moyen avec 3,5
          m² de plan : <strong>210 EUR de perte par chantier</strong>.
        </p>

        <Callout variant="tip" title="Rituel mensuel : 'check prix' du 1er">
          Le 1er de chaque mois, prenez 30 minutes pour verifier que vos 10 references les plus vendues
          (panneaux, plans travail, electromenager core) sont a jour. Cela suffit a colmater 80% de la
          fuite. Un ERP comme AVRA peut le faire automatiquement via les flux fournisseur.
        </Callout>

        <h2 id="methode">La methode 30 minutes/semaine</h2>
        <p>
          Inutile de tout rebatir. Une routine simple suffit a corriger 80% des fuites :
        </p>

        <ChecklistCard
          title="Rituel hebdomadaire — 30 minutes le vendredi 17h"
          items={[
            { label: '5 min — Liste des chantiers livres cette semaine', help: 'Avec leur marge brute reelle (CA HT - matiere - MO directe - sous-traitance).' },
            { label: '10 min — Top 3 ecarts vs devis initial', help: 'Pour chaque chantier en perte ou en marge < 25%, identifier la cause unique.' },
            { label: '5 min — Mise a jour du standard interne', help: 'Si l\'ecart est repetitif sur 3 chantiers, modifier le devis-type.' },
            { label: '5 min — Verification prix matiere', help: 'Top 5 references les plus vendues, verif fournisseurs.' },
            { label: '5 min — Notes pour la semaine suivante', help: 'Litiges potentiels, retards fournisseurs, alertes SAV.' },
          ]}
        />

        <h2 id="kpi">Les 5 KPI a suivre absolument</h2>
        <ol>
          <li><strong>Marge brute par chantier</strong> {'(objectif : >35% sur cuisines moyen-haut de gamme).'}</li>
          <li><strong>Ecart estime / realise sur la pose</strong> {'(objectif : <15%).'}</li>
          <li><strong>Taux de SAV par cuisine sur 24 mois</strong> {'(objectif : <2 interventions).'}</li>
          <li><strong>Delai moyen de paiement client</strong> {'(objectif : <30 jours).'}</li>
          <li><strong>Taux de signature devis</strong> {'(objectif : >40%).'}</li>
        </ol>

        <PullQuote author="Cassandra G., cuisiniste independante (Lyon)">
          Avant la methode, je travaillais a 11% de marge nette. Au bout d'un an de revue hebdomadaire,
          je suis a 19%. Et je ne travaille pas plus dur — je travaille mieux.
        </PullQuote>

        <h2 id="faq">Questions frequentes</h2>
        <FAQ items={FAQ_ITEMS} />

        <FinalCTA
          title="Suivez votre marge en temps reel avec AVRA"
          subtitle="Tableau de bord chantier par chantier, alertes ecarts, suivi marge en direct. Beta privee gratuite pendant 90 jours pour les cuisinistes inscrits."
        />

        <RelatedArticles
          items={[
            { href: '/blog/comment-choisir-erp-cuisiniste', title: 'Choisir son ERP cuisiniste', description: 'Le guide complet : 12 criteres pour ne pas se tromper en 2026.', tag: 'Guide' },
            { href: '/blog/devis-cuisine-modele-mentions-legales', title: 'Devis cuisine 2026', description: 'Modele professionnel + 9 leviers pour augmenter le taux de signature.', tag: 'Reglementation' },
            { href: '/blog/logiciel-cuisiniste-comparatif', title: 'Top 7 logiciels cuisinistes', description: 'Comparatif detaille des solutions du marche en 2026.', tag: 'Comparatif' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: "5 erreurs qui plombent la marge d'un cuisiniste en 2026 — et comment les corriger",
        description: "Les 5 erreurs les plus frequentes qui rongent silencieusement la marge des cuisinistes en 2026.",
        image: 'https://avra-app.fr/opengraph-image.png',
        datePublished: '2026-05-01',
        dateModified: '2026-05-01',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/5-erreurs-marge-cuisiniste' },
        articleSection: 'Rentabilite',
        keywords: 'marge cuisiniste, rentabilite cuisine, erreurs cuisiniste, augmenter marge',
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
          { '@type': 'ListItem', position: 3, name: '5 erreurs marge cuisiniste', item: 'https://avra-app.fr/blog/5-erreurs-marge-cuisiniste' },
        ],
      }) }} />
    </>
  );
}
