'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles, ArticleImage,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'trois-taux', label: 'Un devis, trois taux de TVA' },
  { id: 'la-regle', label: 'La règle de base, en deux phrases' },
  { id: 'ce-qui-passe-a-10', label: 'Ce qui passe à 10 %' },
  { id: 'ce-qui-reste-a-20', label: 'Ce qui reste à 20 %' },
  { id: 'gros-equipements', label: 'Le piège des « gros équipements »' },
  { id: 'le-cas-du-55', label: 'Quand le 5,5 % s\'applique' },
  { id: 'fin-attestation', label: 'L\'attestation a disparu : ce qui la remplace' },
  { id: 'devis-ligne-par-ligne', label: 'Écrire le devis ligne par ligne' },
  { id: 'cas-chiffres', label: 'Trois cas chiffrés' },
  { id: 'redressement', label: 'Qui paie en cas de redressement' },
  { id: 'erreurs', label: 'Les 7 erreurs qu\'on voit le plus' },
  { id: 'faq', label: 'Questions fréquentes' },
];

/**
 * Les reponses FAQ existent en deux versions : le JSX affiche, et `texte`
 * qui alimente le JSON-LD FAQPage. Sans cette version texte, Google recoit
 * un contenu vide et le rich result ne sort jamais.
 */
const FAQ_ITEMS = [
  {
    q: 'Une cuisine complète, c\'est 10 % ou 20 % ?',
    texte:
      "Les deux, sur le même devis. La pose et les éléments qui s'incorporent au logement relèvent du taux "
      + "intermédiaire de 10 %. Le mobilier et l'électroménager restent à 20 %, même s'ils sont encastrés et "
      + "même s'ils sont posés par vous. C'est la ventilation ligne par ligne qui fait foi, pas la nature "
      + "globale du chantier.",
    a: (
      <>
        <p>
          Les deux, sur le même devis. La pose et les éléments qui s&apos;incorporent au logement relèvent du
          taux intermédiaire de <strong>10 %</strong>. Le mobilier et l&apos;électroménager restent à{' '}
          <strong>20 %</strong>, même encastrés, même posés par vous.
        </p>
        <p>
          C&apos;est la ventilation ligne par ligne qui fait foi, pas la nature globale du chantier. Un devis
          « cuisine équipée posée — 14 200 € TTC dont TVA 10 % » est faux, quelle que soit la bonne foi de
          celui qui l&apos;a écrit.
        </p>
      </>
    ),
  },
  {
    q: 'Le logement doit avoir plus de deux ans : deux ans à partir de quand ?',
    texte:
      "À partir de l'achèvement du logement, pas de la date d'achat ni de l'emménagement du client. "
      + "L'ancienneté s'apprécie à la date de début des travaux. Un appartement livré en mars 2025 ne pourra "
      + "pas ouvrir droit au taux réduit avant mars 2027, même si le client l'a acheté d'occasion entre-temps.",
    a: (
      <p>
        À partir de l&apos;<strong>achèvement du logement</strong>, pas de la date d&apos;achat ni de
        l&apos;emménagement. L&apos;ancienneté s&apos;apprécie au début des travaux. Un appartement livré en
        mars 2025 n&apos;ouvrira pas droit au taux réduit avant mars 2027, même si le client l&apos;a racheté
        d&apos;occasion entre-temps. Sur un programme neuf revendu, c&apos;est la question à poser en premier
        rendez-vous.
      </p>
    ),
  },
  {
    q: 'Un local professionnel ou un meublé de tourisme ouvre-t-il droit au 10 % ?',
    texte:
      "Non pour un local professionnel : le taux réduit vise les locaux à usage d'habitation. Pour un meublé "
      + "de tourisme, la réponse dépend de l'usage réel du local : un logement affecté à l'habitation reste "
      + "éligible, une activité para-hôtelière avec services ne l'est pas. En cas de doute sur un bien loué "
      + "en courte durée, le taux normal est le choix prudent.",
    a: (
      <>
        <p>
          Non pour un local professionnel : le taux réduit vise les locaux <strong>à usage
          d&apos;habitation</strong>. Un cabinet, une boutique, un bureau, c&apos;est 20 % sur tout.
        </p>
        <p>
          Pour un meublé de tourisme, ça dépend de l&apos;usage réel. Un logement affecté à l&apos;habitation
          reste éligible ; une activité para-hôtelière avec services associés ne l&apos;est pas. Sur un bien
          loué en courte durée, le taux normal reste le choix prudent tant que le client ne vous a rien
          confirmé par écrit.
        </p>
      </>
    ),
  },
  {
    q: 'Faut-il encore faire signer une attestation TVA au client ?',
    texte:
      "Non. La loi de finances pour 2025 (loi du 14 février 2025) a supprimé le formulaire d'attestation. Il "
      + "est remplacé par une mention de certification portée directement sur le devis ou la facture, par "
      + "laquelle le client atteste que les locaux sont à usage d'habitation et achevés depuis plus de deux "
      + "ans. L'administration a publié des modèles de rédaction. Vous conservez le document à l'appui de "
      + "votre comptabilité ; le client garde son exemplaire jusqu'au 31 décembre de la cinquième année qui "
      + "suit les travaux.",
    a: (
      <>
        <p>
          Non. La loi de finances pour 2025 (loi du 14 février 2025) a supprimé le formulaire. Il est remplacé
          par une <strong>mention de certification portée sur le devis ou la facture</strong>, par laquelle le
          client atteste que les locaux sont à usage d&apos;habitation et achevés depuis plus de deux ans.
        </p>
        <p>
          L&apos;administration a publié des modèles de rédaction (BOI-LETTRE-000280). Vous conservez le
          document à l&apos;appui de votre comptabilité ; le client garde son exemplaire jusqu&apos;au{' '}
          <strong>31 décembre de la cinquième année</strong> suivant les travaux.
        </p>
      </>
    ),
  },
  {
    q: 'Le client m\'a menti sur l\'âge du logement. Je paie quoi ?',
    texte:
      "L'entreprise reste le redevable légal de la TVA : c'est elle que l'administration redresse. Mais "
      + "l'article 279-0 bis du CGI prévoit que le client est solidairement tenu au paiement du complément "
      + "de taxe lorsque l'inexactitude de la mention lui est imputable. D'où l'intérêt d'avoir la mention "
      + "signée et datée, et de ne pas la pré-remplir à la place du client.",
    a: (
      <>
        <p>
          L&apos;entreprise reste le redevable légal de la TVA : c&apos;est elle que l&apos;administration
          redresse, elle avance le complément. Mais l&apos;article 279-0 bis du CGI prévoit que le client est{' '}
          <strong>solidairement tenu</strong> au paiement de la différence lorsque l&apos;inexactitude de la
          mention lui est imputable.
        </p>
        <p>
          D&apos;où deux réflexes : faire signer et dater la mention, et ne jamais la pré-remplir à la place du
          client. Une case cochée par vos soins, c&apos;est une solidarité qui saute.
        </p>
      </>
    ),
  },
  {
    q: 'Un plan de travail sur mesure, c\'est du mobilier ou de l\'aménagement ?',
    texte:
      "En pratique, le plan de travail suit le meuble sur lequel il est posé et relève de la fourniture de "
      + "mobilier, donc du taux normal. Ce qui bascule à 10 %, c'est la main d'œuvre de pose, les découpes "
      + "sur place, les raccords et les reprises de finition. La bonne méthode est de séparer explicitement "
      + "la fourniture et la pose sur deux lignes distinctes.",
    a: (
      <p>
        En pratique le plan de travail suit le meuble qu&apos;il coiffe : c&apos;est de la fourniture de
        mobilier, donc 20 %. Ce qui bascule à 10 %, c&apos;est la <strong>main d&apos;œuvre</strong> : pose,
        découpes sur place, raccords, reprises de finition. La seule méthode saine est de séparer fourniture et
        pose sur deux lignes distinctes, sur toutes les lignes du devis.
      </p>
    ),
  },
  {
    q: 'Puis-je appliquer 10 % sur la totalité si la part mobilier est minime ?',
    texte:
      "Non. Il n'existe pas de seuil de tolérance qui autoriserait à négliger une part de mobilier ou "
      + "d'électroménager parce qu'elle serait faible. La ventilation est obligatoire dès le premier euro. "
      + "En revanche, rien n'oblige à faire deux devis : une seule pièce avec deux colonnes de TVA suffit.",
    a: (
      <p>
        Non. Il n&apos;existe aucun seuil de tolérance qui permettrait de négliger une part de mobilier parce
        qu&apos;elle est faible. La ventilation vaut dès le premier euro. En revanche rien n&apos;oblige à
        établir deux devis séparés : une seule pièce avec deux colonnes de TVA suffit, et c&apos;est même
        préférable pour la lisibilité client.
      </p>
    ),
  },
  {
    q: 'Et si je sous-traite la pose ?',
    texte:
      "Votre sous-traitant vous facture en autoliquidation si vous intervenez sur un chantier de bâtiment "
      + "pour un donneur d'ordre assujetti. Le taux que vous appliquez ensuite à votre client final ne dépend "
      + "pas de ce qu'a fait le sous-traitant, mais de la nature de la prestation refacturée : pose à 10 %, "
      + "fourniture de mobilier à 20 %.",
    a: (
      <p>
        L&apos;autoliquidation entre vous et votre sous-traitant est un sujet distinct du taux applicable au
        client final. Ce que vous facturez au particulier suit toujours la même logique : la{' '}
        <strong>nature de la prestation refacturée</strong>. Pose à 10 %, fourniture de mobilier à 20 %,
        indépendamment de qui a tenu la visseuse.
      </p>
    ),
  },
];

export default function TvaCuisine10Ou20() {
  return (
    <>
      <ArticleShell
        category="Réglementation"
        title="TVA cuisine : 10 %, 5,5 % ou 20 % ? Le guide ligne par ligne"
        subtitle="Sur un même devis de cuisine cohabitent deux, parfois trois taux de TVA. Voici ce qui va où, comment l'écrire, et ce qui se passe quand on se trompe."
        date="22 septembre 2026"
        readTime="16 min"
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            'La pose et les éléments incorporés au logement : 10 %. Le mobilier et l\'électroménager : 20 %. Sur le même devis.',
            'Le logement doit être achevé depuis plus de deux ans, appréciés au démarrage des travaux.',
            'L\'attestation papier a été supprimée par la loi de finances pour 2025. Une mention sur le devis ou la facture la remplace.',
            'Certains « gros équipements » restent au taux normal même quand ils sont scellés.',
            'En cas de contrôle, c\'est l\'entreprise qui est redressée. Le client n\'est solidaire que si l\'erreur vient de lui.',
          ]}
        />

        <h2 id="trois-taux">Un devis, trois taux de TVA</h2>
        <p>
          Prenez un dossier ordinaire. Une cuisine de 4,20 m linéaires dans un appartement des années 70.
          Caissons, façades, plan de travail, crédence, quatre appareils encastrés, l&apos;évier, la
          robinetterie, le déplacement d&apos;une arrivée d&apos;eau, deux prises ajoutées, la dépose de
          l&apos;ancienne cuisine et deux jours de pose à deux.
        </p>
        <p>
          Sur ce seul dossier, vous avez de la fourniture de mobilier, de la fourniture
          d&apos;électroménager, des travaux de plomberie, des travaux d&apos;électricité et de la main
          d&apos;œuvre de pose. Fiscalement, ça ne relève pas du même taux. Et pourtant, huit devis sur dix
          qui circulent dans le métier affichent une seule ligne de TVA.
        </p>
        <p>
          Ça passe tant que personne ne regarde. Le jour où quelqu&apos;un regarde, c&apos;est l&apos;entreprise
          qui rattrape la différence, majorations comprises, sur trois exercices.
        </p>

        <ArticleImage
          src="/images/blog/tva-cuisine-10-ou-20.jpg"
          alt="Devis de cuisine détaillé posé sur un plan de travail, avec calculatrice et mètre de menuisier"
          caption="Un devis cuisine bien ventilé fait apparaître deux colonnes de TVA. Ce n'est pas une complication : c'est la seule version conforme."
          priority
        />

        <h2 id="la-regle">La règle de base, en deux phrases</h2>
        <p>
          Le taux intermédiaire de 10 % s&apos;applique aux travaux d&apos;<strong>amélioration, de
          transformation, d&apos;aménagement et d&apos;entretien</strong> portant sur des locaux à usage
          d&apos;habitation achevés depuis plus de deux ans. C&apos;est l&apos;article 279-0 bis du Code
          général des impôts, et c&apos;est le texte qui gouverne l&apos;essentiel de votre activité.
        </p>
        <p>
          Le même article exclut du taux réduit <strong>la part correspondant à la fourniture
          d&apos;équipements ménagers ou mobiliers</strong>, ainsi qu&apos;à l&apos;acquisition de certains
          gros équipements. Cette exclusion est la phrase la plus coûteuse du métier : c&apos;est elle qui
          renvoie l&apos;essentiel d&apos;une cuisine au taux normal.
        </p>

        <Callout variant="info" title="Trois conditions, toutes cumulatives">
          Le local est à usage d&apos;habitation. Il est achevé depuis plus de deux ans au démarrage des
          travaux. Les travaux ne concourent pas à une construction ou une reconstruction. Si une seule de
          ces trois conditions tombe, tout le chantier bascule à 20 %.
        </Callout>

        <h2 id="ce-qui-passe-a-10">Ce qui passe à 10 %</h2>
        <p>
          La logique du texte tient en une image : ce qui <strong>reste dans le logement quand on déménage</strong>
          relève du taux réduit. Ce qu&apos;on emporte, non.
        </p>

        <ChecklistCard
          title="Les lignes qui relèvent du taux intermédiaire"
          items={[
            { label: 'La main d\'œuvre de pose', help: 'Montage, réglage, fixation, mise à niveau, calage. La part la plus importante en valeur sur un chantier bien vendu.' },
            { label: 'La dépose de l\'ancienne cuisine', help: 'Démontage, évacuation, remise en état des supports.' },
            { label: 'Les travaux de plomberie', help: 'Déplacement d\'arrivée et d\'évacuation, création d\'attente lave-vaisselle, pose d\'un robinet d\'arrêt.' },
            { label: 'Les travaux d\'électricité', help: 'Ajout de prises, ligne dédiée plaque, tableau, éclairage fixe encastré.' },
            { label: 'La maçonnerie et le plâtre', help: 'Saignées, rebouchage, création ou suppression de cloison non porteuse, reprise d\'enduit.' },
            { label: 'Le revêtement de sol posé', help: 'Carrelage, parquet collé, sol souple collé : incorporé au bâti.' },
            { label: 'La peinture et les finitions', help: 'Murs, plafond, huisseries, plinthes.' },
            { label: 'L\'éclairage encastré dans le bâti', help: 'Spots encastrés au plafond, rampe intégrée dans un faux-plafond. Pas la suspension au-dessus de l\'îlot.' },
          ]}
        />

        <PullQuote>
          La règle mémorisable : ce qui part avec le déménagement est à 20 %, ce qui reste au mur est à 10 %.
        </PullQuote>

        <h2 id="ce-qui-reste-a-20">Ce qui reste à 20 %</h2>
        <p>
          Voici la partie que les clients contestent, souvent de bonne foi, parce qu&apos;ils ont lu quelque
          part que « les travaux de rénovation sont à 10 % ». Ils ont raison sur les travaux. Le mobilier
          n&apos;est pas un travail.
        </p>

        <ComparisonTable
          headers={['Élément', 'Taux', 'Pourquoi']}
          rows={[
            ['Caissons, façades, portes, tiroirs', '20 %', 'Fourniture de mobilier, même sur mesure, même fixée au mur.'],
            ['Plan de travail et crédence', '20 %', 'Suivent le meuble. Seule la pose et les découpes basculent à 10 %.'],
            ['Four, plaque, hotte, lave-vaisselle, frigo', '20 %', 'Équipements ménagers, explicitement exclus par le texte.'],
            ['Évier et robinetterie', '10 %', 'Éléments de plomberie sanitaire incorporés au réseau.'],
            ['Suspensions, appliques mobiles', '20 %', 'Luminaires démontables, pas d\'incorporation au bâti.'],
            ['Tabourets, table, banquette non fixée', '20 %', 'Mobilier libre.'],
            ['Main d\'œuvre de pose de tout ce qui précède', '10 %', 'C\'est une prestation de travaux, distincte de la fourniture.'],
          ]}
          highlightCol={1}
        />

        <Callout variant="warning" title="« Mais c'est encastré, donc c'est incorporé »">
          Non. L&apos;encastrement n&apos;est pas un critère. Un four encastré dans une colonne reste un
          équipement ménager au sens du texte, et reste à 20 %. Le fait qu&apos;il faille un tournevis pour le
          sortir ne change rien à sa qualification fiscale.
        </Callout>

        <h2 id="gros-equipements">Le piège des « gros équipements »</h2>
        <p>
          Au-delà du mobilier et de l&apos;électroménager, le CGI exclut du taux réduit une liste fermée de{' '}
          <strong>gros équipements</strong>, fixée par voie réglementaire. Elle vise des matériels qui, eux,
          sont bel et bien incorporés au bâti, mais que le législateur a choisi de laisser au taux normal.
        </p>
        <p>
          On y trouve notamment les équipements de chauffage et de production d&apos;eau chaude au sens de
          cette liste, les ascenseurs, les systèmes de climatisation, les installations d&apos;assainissement.
          Pour un cuisiniste, le sujet reste marginal ; pour un agenceur qui touche à du CVC ou à de la
          ventilation, il devient central.
        </p>

        <Callout variant="info" title="Depuis 2025 : les chaudières fossiles à 20 %">
          La fourniture et l&apos;installation d&apos;une chaudière à combustible fossile (gaz, fioul) sont
          passées au taux normal de 20 % au cours de l&apos;année 2025, en application de la loi de finances
          pour 2025. Si vous reprenez une cuisine avec une chaudière murale à remplacer, cette ligne ne suit
          plus le reste du chantier.
        </Callout>

        <h2 id="le-cas-du-55">Quand le 5,5 % s&apos;applique</h2>
        <p>
          Le taux de 5,5 % de l&apos;article 278-0 bis A vise les travaux d&apos;amélioration de la{' '}
          <strong>qualité énergétique</strong> du logement : isolation, équipements de chauffage performants,
          régulation. Il concerne aussi les travaux dits induits, indissociablement liés à ces travaux
          d&apos;amélioration.
        </p>
        <p>
          Dans un chantier de cuisine, ça reste rare mais pas inexistant. Une isolation de mur par
          l&apos;intérieur refaite derrière la ligne de meubles, une VMC double flux remplacée à
          l&apos;occasion, une menuiserie extérieure changée pendant qu&apos;on y est : ces lignes-là relèvent
          du 5,5 %, et elles ont leurs propres critères de performance à respecter.
        </p>

        <Callout variant="tip" title="Ne mélangez pas le 5,5 % au jugé">
          Le taux de 5,5 % ouvre sur des exigences techniques précises — caractéristiques minimales des
          matériaux, qualification de l&apos;entreprise pour certains dispositifs d&apos;aide. Si vous
          n&apos;êtes pas au clair sur la ligne concernée, le 10 % est le repli sûr : vous perdez quelques
          euros de compétitivité, pas un redressement.
        </Callout>

        <h2 id="fin-attestation">L&apos;attestation a disparu : ce qui la remplace</h2>
        <p>
          Pendant vingt ans, la procédure était connue : formulaire Cerfa, signature du client, classement dans
          le dossier. La <strong>loi de finances pour 2025, du 14 février 2025</strong>, a supprimé cette
          attestation.
        </p>
        <p>
          À la place, le client certifie <strong>directement sur le devis ou sur la facture</strong> que les
          travaux portent sur des locaux à usage d&apos;habitation achevés depuis plus de deux ans et
          qu&apos;ils ne relèvent pas des cas exclus. L&apos;administration a publié des modèles de rédaction
          de cette mention.
        </p>

        <StatGrid
          stats={[
            { value: '0', label: 'formulaire à faire signer', sub: 'le Cerfa est supprimé' },
            { value: '1', label: 'mention sur le devis', sub: 'ou sur la facture' },
            { value: '31/12 + 5 ans', label: 'conservation côté client', sub: 'devis et factures' },
            { value: 'Comptabilité', label: 'conservation côté entreprise', sub: 'à l\'appui des pièces' },
          ]}
        />

        <p>
          Concrètement, ça veut dire que votre modèle de devis doit changer. Le bloc de signature client doit
          désormais porter la mention de certification, datée, à côté du « bon pour accord ». Si votre logiciel
          de devis ne le fait pas, vous l&apos;ajoutez à la main — mais vous l&apos;ajoutez.
        </p>

        <Callout variant="warning" title="L'erreur qui va se généraliser">
          Beaucoup d&apos;entreprises ont retenu « l&apos;attestation est supprimée » et se sont arrêtées là.
          La suppression du formulaire n&apos;est pas la suppression de la justification. Un devis sans mention
          de certification, c&apos;est aujourd&apos;hui un taux réduit sans pièce justificative.
        </Callout>

        <h2 id="devis-ligne-par-ligne">Écrire le devis ligne par ligne</h2>
        <p>
          La bonne structure ne demande pas deux devis ni un logiciel exotique. Elle demande de séparer
          systématiquement <strong>fourniture</strong> et <strong>pose</strong>, et de porter le taux sur
          chaque ligne plutôt qu&apos;en pied de page.
        </p>

        <h3>La trame qui fonctionne</h3>
        <ol>
          <li><strong>Bloc 1 — Mobilier</strong> : caissons, façades, plans, crédence, accessoires. Taux 20 %.</li>
          <li><strong>Bloc 2 — Électroménager</strong> : chaque appareil avec sa référence. Taux 20 %.</li>
          <li><strong>Bloc 3 — Sanitaire</strong> : évier, robinetterie, raccordements. Taux 10 %.</li>
          <li><strong>Bloc 4 — Travaux</strong> : dépose, plomberie, électricité, plâtrerie, sol, peinture. Taux 10 %.</li>
          <li><strong>Bloc 5 — Pose et mise en service</strong> : main d&apos;œuvre détaillée. Taux 10 %.</li>
          <li><strong>Récapitulatif TVA</strong> : une ligne par taux, base HT et montant de taxe.</li>
        </ol>

        <p>
          Le récapitulatif en pied de devis est ce que regarde un contrôleur en premier. S&apos;il voit deux
          bases distinctes et deux montants de taxe, il sait en trois secondes que le dossier a été ventilé.
          S&apos;il voit une base unique, il ouvre le détail.
        </p>

        <Callout variant="tip" title="Le gain commercial dont personne ne parle">
          Ventiler le devis vous met dans une position plus confortable en rendez-vous. Le client voit que
          38 % du montant est de la main d&apos;œuvre et des travaux, pas du meuble. Ça rend la marge plus
          lisible et ça coupe court à la comparaison brutale avec un prix de grande surface, qui lui ne
          contient aucune de ces lignes.
        </Callout>

        <h2 id="cas-chiffres">Trois cas chiffrés</h2>
        <p>
          Les montants ci-dessous sont des ordres de grandeur de dossiers courants, arrondis pour la lecture.
          Ce qui compte n&apos;est pas le chiffre exact, c&apos;est l&apos;écart entre la version ventilée et
          la version à taux unique.
        </p>

        <h3>Cas 1 — Rénovation complète, appartement de 1978</h3>
        <ComparisonTable
          headers={['Poste', 'HT', 'Taux', 'TVA']}
          rows={[
            ['Mobilier et plan de travail', '9 800 €', '20 %', '1 960 €'],
            ['Électroménager (4 appareils)', '3 400 €', '20 %', '680 €'],
            ['Évier et robinetterie', '620 €', '10 %', '62 €'],
            ['Plomberie, électricité, plâtrerie', '1 850 €', '10 %', '185 €'],
            ['Dépose et pose (2 poseurs, 2 j)', '2 400 €', '10 %', '240 €'],
            ['Total', '18 070 €', '—', '3 127 €'],
          ]}
          highlightCol={3}
        />
        <p>
          Total TTC : <strong>21 197 €</strong>. Le même dossier passé intégralement à 10 % afficherait
          19 877 € TTC. L&apos;écart, <strong>1 320 €</strong>, c&apos;est exactement ce que l&apos;entreprise
          devra sortir de sa poche en cas de contrôle, puisque le client, lui, a déjà payé son prix TTC.
        </p>

        <h3>Cas 2 — Remplacement de façades seules, maison de 2004</h3>
        <p>
          Façades et poignées : 4 200 € HT à 20 %. Dépose, ajustement, repose et reprise des chants :
          900 € HT à 10 %. Rien d&apos;autre. Beaucoup d&apos;entreprises passent l&apos;intégralité à 10 %
          « puisque c&apos;est de la rénovation » : l&apos;écart est de 420 €, sur un dossier à 6 000 €.
        </p>

        <h3>Cas 3 — Cuisine dans un logement livré il y a dix-huit mois</h3>
        <p>
          Aucune ligne à 10 %. La condition d&apos;ancienneté n&apos;est pas remplie, l&apos;ensemble du
          chantier est au taux normal, main d&apos;œuvre comprise. C&apos;est le cas le plus dangereux, parce
          qu&apos;il est invisible : rien dans le chantier ne signale le problème. Seule la question posée au
          premier rendez-vous le révèle.
        </p>

        <Callout variant="insight" title="La question à poser au premier rendez-vous">
          « Le logement a été livré ou achevé en quelle année ? » Deux secondes de conversation, notées dans le
          dossier. C&apos;est la donnée qui décide de plusieurs milliers d&apos;euros, et c&apos;est
          précisément celle qu&apos;on oublie de consigner parce qu&apos;elle n&apos;a pas de case dans le
          logiciel.
        </Callout>

        <h2 id="redressement">Qui paie en cas de redressement</h2>
        <p>
          L&apos;entreprise est le redevable légal de la TVA. C&apos;est elle que l&apos;administration
          notifie, elle qui avance le complément de taxe, elle qui supporte les intérêts de retard. Le client
          n&apos;est jamais poursuivi en premier.
        </p>
        <p>
          L&apos;article 279-0 bis prévoit toutefois que le preneur est <strong>solidairement tenu</strong> au
          paiement du complément lorsque les mentions portées sur le devis ou la facture se révèlent inexactes
          de son fait. Autrement dit : si le client a certifié que son logement avait plus de deux ans alors
          qu&apos;il en avait dix-huit mois, vous avez un recours. Si c&apos;est vous qui avez rempli la case
          sans lui demander, vous n&apos;en avez aucun.
        </p>

        <ChecklistCard
          title="Le dossier qui tient en cas de contrôle"
          items={[
            { label: 'La mention de certification, signée et datée par le client', help: 'Sur le devis accepté, ou sur la facture. Pas pré-cochée par vous.' },
            { label: 'Le devis ventilé, taux par ligne', help: 'Avec récapitulatif TVA par taux en pied de document.' },
            { label: 'Une trace de l\'année d\'achèvement du logement', help: 'Une note dans le dossier client suffit. Un acte, un avis de taxe foncière ou un DPE, c\'est mieux.' },
            { label: 'Les factures fournisseurs correspondantes', help: 'Elles doivent permettre de retrouver la part mobilier et la part électroménager.' },
            { label: 'Le rattachement chantier de la main d\'œuvre', help: 'Heures posées, par dossier. C\'est ce qui justifie la part à 10 %.' },
          ]}
        />

        <h2 id="erreurs">Les 7 erreurs qu&apos;on voit le plus</h2>
        <ol>
          <li>
            <strong>Le devis à taux unique.</strong> La plus fréquente, et la plus chère. Un seul taux affiché
            en pied de page sur un chantier qui en comporte deux.
          </li>
          <li>
            <strong>L&apos;électroménager passé à 10 % parce qu&apos;il est encastré.</strong>
            L&apos;encastrement n&apos;a jamais été un critère fiscal.
          </li>
          <li>
            <strong>L&apos;ancienneté jamais vérifiée.</strong> On suppose que l&apos;immeuble est ancien parce
            qu&apos;il en a l&apos;air. Sur une résidence livrée en deux tranches, la tranche 2 peut avoir
            trois ans de moins que la tranche 1.
          </li>
          <li>
            <strong>La mention de certification absente</strong> depuis la suppression de l&apos;attestation.
            Le formulaire a disparu, la justification non.
          </li>
          <li>
            <strong>La pose noyée dans le prix du meuble.</strong> « Cuisine posée : 12 000 € ». Aucune part de
            main d&apos;œuvre identifiable, donc aucune part à 10 % défendable.
          </li>
          <li>
            <strong>Le 5,5 % appliqué par optimisme</strong> sur une ligne d&apos;isolation qui ne remplit pas
            les critères techniques.
          </li>
          <li>
            <strong>L&apos;avoir mal ventilé.</strong> Un geste commercial de 500 € imputé sur la seule ligne
            à 10 % alors qu&apos;il porte sur l&apos;ensemble : l&apos;administration recalcule au prorata.
          </li>
        </ol>

        <Callout variant="insight" title="Ce que ça change dans un logiciel de devis">
          Un outil qui gère le taux au niveau de la ligne, et pas au niveau du document, supprime six de ces
          sept erreurs sans y penser. C&apos;est le genre de détail qu&apos;on ne regarde pas en démonstration
          et qu&apos;on paie deux ans plus tard. Dans AVRA, chaque ligne de devis porte son propre taux, et le
          récapitulatif par taux se construit tout seul en pied de document.
        </Callout>

        <h2 id="faq">Questions fréquentes</h2>
        <FAQ items={FAQ_ITEMS.map(({ q, a }) => ({ q, a }))} />

        <Callout variant="info" title="Un mot de prudence">
          Cet article décrit le cadre applicable en 2026 et vise les situations courantes de l&apos;agencement.
          Il ne remplace pas l&apos;avis de votre expert-comptable, en particulier sur les chantiers mixtes
          habitation / professionnel, les logements sociaux et les opérations de rénovation lourde, où la
          qualification des travaux mérite un examen au cas par cas.
        </Callout>

        <FinalCTA
          title="Vos devis, ventilés correctement dès la première ligne"
          subtitle="AVRA gère le taux de TVA ligne par ligne, produit le récapitulatif par taux et intègre la mention de certification au bloc de signature. Bêta privée gratuite pendant 90 jours."
        />

        <RelatedArticles
          items={[
            { href: '/blog/devis-cuisine-modele-mentions-legales', title: 'Devis cuisine : mentions obligatoires', description: 'Les 14 mentions légales à faire figurer, et le modèle qui fait signer.', tag: 'Réglementation' },
            { href: '/blog/e-facture-2026', title: 'E-facture 2026 : le guide', description: 'Factur-X, PDP, calendrier : ce que la réforme change pour vos factures.', tag: 'Réglementation' },
            { href: '/blog/5-erreurs-marge-cuisiniste', title: '5 erreurs qui plombent la marge', description: 'Les fuites silencieuses qui rongent la rentabilité d\'un dossier.', tag: 'Rentabilité' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'TVA cuisine : 10 %, 5,5 % ou 20 % ? Le guide ligne par ligne',
        description: "Quel taux de TVA sur quelle ligne d'un devis de cuisine : mobilier, electromenager, pose, travaux. Fin de l'attestation, mention obligatoire et cas chiffres.",
        image: 'https://avra-app.fr/images/blog/tva-cuisine-10-ou-20.jpg',
        datePublished: '2026-09-22',
        dateModified: '2026-09-27',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/tva-cuisine-10-ou-20' },
        articleSection: 'Réglementation',
        keywords: 'TVA cuisine, TVA 10 ou 20, TVA travaux cuisine, attestation TVA, 279-0 bis, devis cuisiniste',
        inLanguage: 'fr-FR',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.texte },
        })),
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra-app.fr/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://avra-app.fr/blog' },
          { '@type': 'ListItem', position: 3, name: 'TVA cuisine 10 ou 20', item: 'https://avra-app.fr/blog/tva-cuisine-10-ou-20' },
        ],
      }) }} />
    </>
  );
}
