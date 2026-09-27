'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles, ArticleImage,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'double-peine', label: 'La double peine du poseur' },
  { id: 'ce-que-dit-la-loi', label: 'Ce que la loi impose côté client' },
  { id: 'resolution', label: 'Mise en demeure et résolution' },
  { id: 'majorations', label: 'Le remboursement qui grimpe à +50 %' },
  { id: 'cote-fournisseur', label: 'Ce que le fournisseur vous doit (et ne vous doit pas)' },
  { id: 'ecrire-le-delai', label: 'Écrire le délai sur le devis' },
  { id: 'protocole', label: 'Le protocole de suivi qui change tout' },
  { id: 'quand-ca-derape', label: 'Quand le retard est déjà là' },
  { id: 'cout-reel', label: 'Le coût réel d\'un retard' },
  { id: 'faq', label: 'Questions fréquentes' },
];

const FAQ_ITEMS = [
  {
    q: 'Si je n\'ai indiqué aucune date sur le devis, quel délai s\'applique ?',
    texte:
      "Trente jours. L'article L216-1 du Code de la consommation prévoit qu'à défaut d'indication ou d'accord "
      + "sur la date, le professionnel livre sans retard injustifié et au plus tard trente jours après la "
      + "conclusion du contrat. Ne rien écrire n'est donc pas une protection, c'est l'inverse : c'est accepter "
      + "le délai le plus court possible.",
    a: (
      <>
        <p>
          Trente jours. L&apos;article L216-1 du Code de la consommation prévoit qu&apos;à défaut
          d&apos;indication ou d&apos;accord sur la date, le professionnel livre sans retard injustifié et{' '}
          <strong>au plus tard trente jours</strong> après la conclusion du contrat.
        </p>
        <p>
          Ne rien écrire n&apos;est donc pas une prudence, c&apos;est le pire choix possible : c&apos;est
          accepter par défaut le délai le plus court, sur un métier où la moyenne tourne entre huit et douze
          semaines.
        </p>
      </>
    ),
  },
  {
    q: '« Livraison sous 8 à 10 semaines » : est-ce que ça m\'engage ?',
    texte:
      "Oui, sur la borne haute. Une fourchette annoncée constitue une date convenue au sens du Code de la "
      + "consommation, et c'est la fin de fourchette qui fait foi. Une formule vague du type « selon "
      + "disponibilité fournisseur » ne vous protège pas davantage : à défaut de date certaine, on retombe "
      + "sur les trente jours.",
    a: (
      <>
        <p>
          Oui, sur la <strong>borne haute</strong>. Une fourchette annoncée vaut date convenue, et c&apos;est
          la fin de fourchette qui fait foi.
        </p>
        <p>
          Et la formule vague ne sauve rien : « selon disponibilité fournisseur » n&apos;est pas une date. À
          défaut de date certaine, on retombe sur les trente jours de l&apos;article L216-1. Mieux vaut
          annoncer douze semaines et livrer en dix que d&apos;écrire une phrase élastique.
        </p>
      </>
    ),
  },
  {
    q: 'Le client peut-il annuler dès le premier jour de retard ?',
    texte:
      "En principe non : il doit d'abord vous mettre en demeure de livrer dans un délai supplémentaire "
      + "raisonnable. Mais l'article L216-6 prévoit trois cas de résolution immédiate : si vous refusez de "
      + "livrer, si la livraison est manifestement impossible, ou si la date était une condition essentielle "
      + "du contrat connue de vous. Une cuisine promise avant un mariage ou avant l'arrivée d'un nourrisson "
      + "peut entrer dans ce troisième cas.",
    a: (
      <>
        <p>
          En principe non : il doit d&apos;abord vous <strong>mettre en demeure</strong> de livrer dans un
          délai supplémentaire raisonnable.
        </p>
        <p>
          Mais l&apos;article L216-6 ouvre trois cas de résolution immédiate : refus de livrer, impossibilité
          manifeste, ou date qui constituait une <strong>condition essentielle</strong> du contrat et que vous
          connaissiez. Une cuisine promise pour une date de mariage, une remise de clés ou l&apos;arrivée
          d&apos;un enfant peut relever du troisième cas — surtout si le client l&apos;a écrit dans un mail.
        </p>
      </>
    ),
  },
  {
    q: 'En cas d\'annulation, sous combien de temps dois-je rembourser ?',
    texte:
      "Quatorze jours à compter de la résolution du contrat, pour la totalité des sommes versées. Au-delà, "
      + "le montant dû est majoré de plein droit : 10 % si le remboursement intervient dans les quatorze "
      + "jours suivant l'échéance, 20 % jusqu'à trente jours, 50 % ensuite. Ces majorations s'appliquent "
      + "automatiquement, sans que le client ait besoin de les demander.",
    a: (
      <>
        <p>
          <strong>Quatorze jours</strong> à compter de la résolution, pour la totalité des sommes versées,
          acompte compris.
        </p>
        <p>
          Au-delà, la majoration est de plein droit : <strong>+10 %</strong> si vous remboursez dans les
          quatorze jours qui suivent l&apos;échéance, <strong>+20 %</strong> jusqu&apos;à trente jours,{' '}
          <strong>+50 %</strong> ensuite. Automatiquement, sans demande du client, sans juge.
        </p>
      </>
    ),
  },
  {
    q: 'Mon fournisseur a livré en retard. Puis-je me retourner contre lui ?',
    texte:
      "Cela dépend entièrement de ses conditions générales de vente. La plupart des fabricants stipulent des "
      + "délais indicatifs et non contractuels, excluent toute indemnité pour retard et cantonnent leur "
      + "responsabilité au remplacement des pièces. Le rapport avec un fournisseur est un rapport entre "
      + "professionnels : le Code de la consommation ne s'y applique pas. Vérifiez si vos conditions "
      + "d'achat prévoient des pénalités, et négociez-les si votre volume vous le permet.",
    a: (
      <>
        <p>
          Tout dépend de ses CGV, et elles sont rarement à votre avantage. La plupart des fabricants stipulent
          des délais <em>indicatifs et non contractuels</em>, excluent toute indemnité de retard et cantonnent
          leur responsabilité au remplacement des pièces.
        </p>
        <p>
          C&apos;est un rapport entre professionnels : le Code de la consommation ne s&apos;y applique pas.
          D&apos;où l&apos;asymétrie qui fait mal — vous êtes tenu à une obligation stricte envers votre
          client, sans miroir en amont. La seule vraie parade est contractuelle, au moment de négocier vos
          conditions d&apos;achat.
        </p>
      </>
    ),
  },
  {
    q: 'Puis-je facturer des pénalités de retard à mon client qui ne paie pas le solde ?',
    texte:
      "Oui, si vos conditions générales de vente les prévoient. Entre professionnels, les pénalités de retard "
      + "sont dues de plein droit avec une indemnité forfaitaire de recouvrement de 40 €. Vis-à-vis d'un "
      + "particulier, elles doivent figurer dans les CGV acceptées et rester à un niveau non abusif. Dans "
      + "les deux cas, elles n'existent que si elles sont écrites avant, jamais découvertes après.",
    a: (
      <p>
        Oui si vos CGV les prévoient. Entre professionnels, elles sont dues de plein droit avec l&apos;indemnité
        forfaitaire de recouvrement de <strong>40 €</strong>. Face à un particulier, elles doivent figurer dans
        des CGV acceptées et rester à un niveau non abusif. Dans les deux cas, une pénalité n&apos;existe que
        si elle était écrite <em>avant</em>.
      </p>
    ),
  },
  {
    q: 'Une rupture de stock chez le fabricant est-elle un cas de force majeure ?',
    texte:
      "Presque jamais. La force majeure suppose un événement imprévisible, irrésistible et extérieur. Une "
      + "rupture d'approvisionnement fait partie des aléas normaux de l'activité et reste, dans la très "
      + "grande majorité des cas, à la charge du vendeur. Une clause de CGV qui qualifierait toute rupture "
      + "de force majeure a de bonnes chances d'être écartée comme abusive face à un consommateur.",
    a: (
      <p>
        Presque jamais. La force majeure suppose un événement imprévisible, irrésistible et extérieur. Une
        rupture d&apos;approvisionnement relève des aléas normaux de l&apos;activité et reste à la charge du
        vendeur. Une clause de CGV qui qualifierait toute rupture de force majeure a de bonnes chances
        d&apos;être écartée comme abusive face à un consommateur.
      </p>
    ),
  },
  {
    q: 'Livraison partielle : le chantier démarre, est-ce que ça compte comme livré ?',
    texte:
      "Non. La livraison s'entend du transfert au client de la possession physique ou du contrôle du bien "
      + "commandé, dans son ensemble. Une cuisine livrée sans ses façades ou sans son plan de travail n'est "
      + "pas livrée. Commencer la pose ne fait pas courir de nouveau délai et n'éteint pas le droit du "
      + "client : cela dit, un chantier entamé, des meubles montés et un client tenu informé réduisent "
      + "considérablement le risque de rupture.",
    a: (
      <>
        <p>
          Non. La livraison s&apos;entend du transfert de la possession physique ou du contrôle du bien
          commandé, pris dans son ensemble. Une cuisine sans ses façades n&apos;est pas une cuisine livrée.
        </p>
        <p>
          Cela dit, la réalité d&apos;un chantier compte : des caissons montés, un plan provisoire posé et un
          client tenu informé chaque semaine réduisent énormément le risque que la situation parte en
          résolution. Le droit fixe le cadre ; c&apos;est la relation qui évite le conflit.
        </p>
      </>
    ),
  },
];

export default function RetardLivraisonCuisine() {
  return (
    <>
      <ArticleShell
        category="Réglementation"
        title="Retard de livraison : ce que vous devez au client, ce que le fournisseur vous doit"
        subtitle="D'un côté une obligation stricte, de l'autre des délais « indicatifs ». Le retard de livraison est le seul risque du métier où la loi et vos contrats d'achat ne jouent pas dans le même sens."
        date="25 septembre 2026"
        readTime="15 min"
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            'Sans date écrite sur le devis, la loi impose trente jours. Ne rien indiquer est le pire des choix.',
            'Le client met en demeure, puis peut résoudre le contrat — parfois immédiatement, sans mise en demeure.',
            'Le remboursement doit intervenir sous quatorze jours, sous peine de majoration de 10, 20 puis 50 %.',
            'Votre fournisseur, lui, annonce des délais « indicatifs » : l\'asymétrie est structurelle.',
            'Le seul levier réellement efficace est en amont : un délai annoncé large, et un suivi de commande hebdomadaire.',
          ]}
        />

        <h2 id="double-peine">La double peine du poseur</h2>
        <p>
          Le scénario est toujours le même. Commande passée le 12 mars, délai fabricant annoncé à dix semaines,
          donc pose calée fin mai. Le client pose des congés, fait déposer son ancienne cuisine, mange sur une
          table de camping. Le 19 mai, le fournisseur annonce que les façades laquées partent en deuxième
          quinzaine de juin.
        </p>
        <p>
          À ce moment précis, vous êtes pris entre deux régimes qui n&apos;ont rien à voir. Devant votre
          client, vous êtes tenu par le Code de la consommation, qui est strict et chiffré. Devant votre
          fournisseur, vous êtes tenu par des conditions générales de vente qui, dans neuf cas sur dix,
          qualifient les délais d&apos;indicatifs et excluent toute indemnité.
        </p>

        <PullQuote>
          Vous portez une obligation ferme en aval, adossée à une promesse molle en amont. Tout le métier tient
          dans cet écart.
        </PullQuote>

        <ArticleImage
          src="/images/blog/retard-livraison-cuisine.jpg"
          alt="Chantier de cuisine à l'arrêt, caissons montés et emplacement vide en attente de livraison"
          caption="Un chantier arrêté faute d'une seule référence manquante : le cas le plus banal, et le plus coûteux."
        />

        <h2 id="ce-que-dit-la-loi">Ce que la loi impose côté client</h2>
        <p>
          Le cadre applicable aux contrats conclus depuis le 1<sup>er</sup> janvier 2022 tient dans les
          articles L216-1 et suivants du Code de la consommation. Deux principes seulement, mais ils sont
          durs.
        </p>
        <p>
          <strong>Premier principe.</strong> Le professionnel livre à la date convenue. À défaut
          d&apos;indication ou d&apos;accord sur cette date, il livre sans retard injustifié et au plus tard
          trente jours après la conclusion du contrat.
        </p>
        <p>
          <strong>Second principe.</strong> La livraison s&apos;entend du transfert au consommateur de la{' '}
          <strong>possession physique ou du contrôle</strong> du bien. Une cuisine stockée dans votre dépôt
          n&apos;est pas livrée. Une cuisine posée à 80 % n&apos;est pas livrée non plus.
        </p>

        <Callout variant="warning" title="Le réflexe qui se retourne contre vous">
          Beaucoup de devis n&apos;indiquent aucune date pour « ne pas s&apos;engager ». C&apos;est
          exactement l&apos;inverse qui se produit : sans date convenue, la loi en impose une, et elle est de
          trente jours. Autant dire intenable sur du mobilier fabriqué à la commande.
        </Callout>

        <h2 id="resolution">Mise en demeure et résolution</h2>
        <p>
          Quand la date passe, le client ne peut pas annuler d&apos;un claquement de doigts. Il doit
          d&apos;abord vous enjoindre de livrer dans un délai supplémentaire raisonnable. C&apos;est la mise
          en demeure, et c&apos;est votre fenêtre de rattrapage.
        </p>
        <p>
          L&apos;article L216-6 prévoit toutefois trois situations dans lesquelles le client peut résoudre le
          contrat <strong>immédiatement</strong>, sans passer par cette étape :
        </p>
        <ul>
          <li>vous avez refusé de livrer, ou déclaré ne pas pouvoir le faire ;</li>
          <li>la livraison dans le délai convenu est manifestement impossible ;</li>
          <li>
            la date de livraison constituait une <strong>condition essentielle</strong> du contrat, au regard
            des circonstances qui l&apos;entourent ou d&apos;une demande expresse du consommateur.
          </li>
        </ul>
        <p>
          Ce troisième cas est celui qui surprend. Un client qui vous a écrit « il me la faut absolument avant
          le 15 juin, on reçoit toute la famille » a constitué, par ce simple mail, un élément de preuve. La
          mise en demeure reçue met alors fin au contrat au jour de sa réception.
        </p>

        <Callout variant="tip" title="Répondez toujours par écrit, et proposez une date">
          Le pire réflexe face à une mise en demeure est le silence, ou le téléphone seul. Une réponse écrite
          qui reconnaît le retard, donne une date ferme et propose une contrepartie tangible transforme
          souvent une procédure naissante en négociation. Gardez la trace.
        </Callout>

        <h2 id="majorations">Le remboursement qui grimpe à +50 %</h2>
        <p>
          Si le contrat est résolu, vous remboursez la <strong>totalité</strong> des sommes versées dans un
          délai maximal de quatorze jours. Acompte compris, y compris si vous avez déjà payé votre
          fournisseur, y compris si le mobilier est fabriqué et stocké chez vous.
        </p>
        <p>
          Passé ce délai, l&apos;article L241-4 du Code de la consommation majore automatiquement les sommes
          dues. Cette progression est méconnue, et elle est brutale.
        </p>

        <StatGrid
          stats={[
            { value: '14 j', label: 'pour rembourser', sub: 'à compter de la résolution' },
            { value: '+10 %', label: 'retard jusqu\'à 14 jours', sub: 'après l\'échéance' },
            { value: '+20 %', label: 'retard jusqu\'à 30 jours', sub: 'après l\'échéance' },
            { value: '+50 %', label: 'au-delà de 30 jours', sub: 'de plein droit' },
          ]}
        />

        <p>
          Sur un acompte de 6 000 €, deux mois de tergiversation coûtent <strong>3 000 €</strong> de
          majoration. Ce n&apos;est pas une pénalité que le client doit réclamer devant un juge : elle
          s&apos;applique de plein droit.
        </p>

        <Callout variant="insight" title="La décision à prendre vite">
          Quand un dossier part en résolution, la seule bonne décision est rapide. Rembourser dans les quatorze
          jours et récupérer le mobilier coûte presque toujours moins cher que de jouer la montre en espérant
          que le fournisseur livre. C&apos;est contre-intuitif quand la trésorerie est tendue — c&apos;est
          pourtant arithmétique.
        </Callout>

        <h2 id="cote-fournisseur">Ce que le fournisseur vous doit (et ne vous doit pas)</h2>
        <p>
          Passons de l&apos;autre côté. Vos achats relèvent du droit commercial, pas du droit de la
          consommation. Concrètement, aucune règle d&apos;ordre public ne vient corriger un déséquilibre en
          votre défaveur : ce sont les CGV signées qui font loi.
        </p>

        <ComparisonTable
          headers={['Clause type dans les CGV fabricant', 'Ce que ça veut dire pour vous']}
          rows={[
            ['« Les délais sont donnés à titre indicatif »', 'Aucun engagement de date. Vous ne pouvez rien réclamer sur la seule base du dépassement.'],
            ['« Aucune indemnité ne sera due en cas de retard »', 'Exclusion contractuelle des pénalités. Valable entre professionnels, sauf déséquilibre significatif.'],
            ['« Les livraisons partielles sont autorisées »', 'Le fournisseur peut solder la commande en trois fois sans être en faute.'],
            ['« Réclamation sous 48 h à réception »', 'Passé ce délai, les manquants et les casses ne sont plus à sa charge. C\'est la clause la plus chère à négliger.'],
            ['« Les commandes spéciales ne sont ni reprises ni échangées »', 'Une résolution côté client vous laisse le mobilier sur les bras.'],
          ]}
          highlightCol={1}
        />

        <p>
          Trois leviers existent, et ils sont tous contractuels, donc à activer avant la commande, pas
          pendant le retard :
        </p>
        <ol>
          <li>
            <strong>Négocier une clause de délai ferme</strong> sur les références critiques. Un fabricant qui
            tient à un revendeur accepte souvent de s&apos;engager sur les façades, à défaut de s&apos;engager
            sur tout.
          </li>
          <li>
            <strong>Obtenir un engagement de dédommagement</strong>, même symbolique : un avoir forfaitaire par
            semaine de retard au-delà d&apos;un seuil. Ça change les priorités en interne chez eux.
          </li>
          <li>
            <strong>Exiger une date de confirmation de commande</strong> et non une fourchette. Tant que la
            confirmation n&apos;est pas revenue avec une date, vous n&apos;avez pas de délai : vous avez une
            espérance.
          </li>
        </ol>

        <Callout variant="warning" title="La clause des 48 heures">
          C&apos;est celle qui fait perdre le plus d&apos;argent, et elle n&apos;a rien à voir avec le retard.
          Un chantier livré le vendredi, contrôlé le mardi suivant : les deux façades rayées sont déjà à votre
          charge. Le contrôle à réception, palette par palette, n&apos;est pas une formalité administrative.
          C&apos;est une ligne de marge.
        </Callout>

        <h2 id="ecrire-le-delai">Écrire le délai sur le devis</h2>
        <p>
          Le vrai travail se fait ici, en trente secondes de rédaction, des mois avant le problème. Voici les
          quatre éléments qui protègent, dans l&apos;ordre d&apos;importance.
        </p>

        <ChecklistCard
          title="La clause de délai qui tient"
          items={[
            { label: 'Un délai exprimé en semaines à compter d\'un événement précis', help: '« 10 à 12 semaines à compter de la validation du relevé de mesures définitif », et non « à compter de la commande ».' },
            { label: 'Le point de départ défini sans ambiguïté', help: 'Validation du plan technique, réception de l\'acompte, ou levée des réserves du relevé. C\'est vous qui choisissez, mais il doit être écrit.' },
            { label: 'La borne haute réaliste, pas optimiste', help: 'Annoncez la durée que vous tenez neuf fois sur dix, pas votre meilleur cas. Livrer en avance ne vous a jamais coûté un client.' },
            { label: 'Les conditions de décalage identifiées', help: 'Modification demandée après validation, accès chantier indisponible, travaux tiers non terminés : chaque cas repousse le délai d\'autant, si c\'est écrit.' },
            { label: 'La date de pose confirmée séparément', help: 'Le délai de livraison et la date d\'intervention sont deux engagements distincts. Ne les fusionnez pas dans une seule phrase.' },
          ]}
        />

        <Callout variant="tip" title="La phrase la plus utile du devis">
          « Le délai court à compter de la validation écrite du relevé de mesures définitif. » Elle déplace le
          point de départ après la phase qui dérape le plus souvent — celle où le client hésite encore sur la
          teinte des façades — et elle est parfaitement loyale, puisqu&apos;on ne peut pas lancer une
          fabrication sur un projet non figé.
        </Callout>

        <h2 id="protocole">Le protocole de suivi qui change tout</h2>
        <p>
          Un retard n&apos;est presque jamais une surprise. Il est visible deux à quatre semaines à
          l&apos;avance, dans un accusé de réception qui n&apos;est jamais revenu ou dans une confirmation qui
          a glissé. Le problème n&apos;est pas le retard : c&apos;est de l&apos;apprendre trop tard pour
          l&apos;absorber.
        </p>

        <h3>Les quatre points de contrôle</h3>
        <ol>
          <li>
            <strong>J+2 après commande — l&apos;accusé de réception.</strong> Pas d&apos;AR sous 48 h, vous
            relancez. Une commande non confirmée est une commande qui n&apos;existe pas.
          </li>
          <li>
            <strong>À la confirmation — la date ferme.</strong> Vous la notez dans le dossier, et vous
            recalculez la date de pose à partir d&apos;elle, pas à partir de votre estimation initiale.
          </li>
          <li>
            <strong>À mi-parcours — le point fabrication.</strong> Un appel, cinq minutes. C&apos;est là que
            se détectent les ruptures de teinte et les références remplacées.
          </li>
          <li>
            <strong>J-10 avant livraison — la confirmation d&apos;expédition.</strong> Le dernier moment où un
            décalage reste gérable sans déplacer les poseurs.
          </li>
        </ol>

        <p>
          Ce protocole ne demande pas d&apos;outil sophistiqué. Il demande qu&apos;une date butoir par
          fournisseur existe quelque part et qu&apos;elle remonte toute seule, plutôt que de dépendre de la
          mémoire de la personne qui a passé la commande.
        </p>

        <Callout variant="insight" title="Ce que ça donne dans un outil">
          Dans AVRA, chaque commande fournisseur porte sa propre date butoir, et le dossier passe en alerte
          quand une échéance approche sans confirmation. Le retard remonte à l&apos;écran avant que le client
          n&apos;appelle — ce qui laisse le choix entre prévenir et subir.
        </Callout>

        <h2 id="quand-ca-derape">Quand le retard est déjà là</h2>
        <p>
          Il reste à gérer ceux qu&apos;on n&apos;a pas vus venir. L&apos;ordre des gestes compte plus que leur
          contenu.
        </p>

        <ol>
          <li>
            <strong>Prévenir avant que le client ne découvre.</strong> Un appel de votre part la veille vaut
            dix explications le lendemain. C&apos;est le seul moment où vous avez encore la main sur le récit.
          </li>
          <li>
            <strong>Donner une date, pas une excuse.</strong> « Le fournisseur a du retard » n&apos;est pas une
            information. « Les façades partent le 12, pose le 19 » en est une.
          </li>
          <li>
            <strong>Poser ce qui peut l&apos;être.</strong> Caissons montés, évier raccordé, plan provisoire :
            un client qui peut cuisiner attend beaucoup mieux qu&apos;un client qui campe.
          </li>
          <li>
            <strong>Écrire le nouvel accord.</strong> Un mail récapitulatif accepté par retour vaut avenant.
            Sans écrit, la date d&apos;origine reste la référence.
          </li>
          <li>
            <strong>Proposer une contrepartie mesurée.</strong> Un geste chiffré et immédiat coûte toujours
            moins cher qu&apos;une résolution, et infiniment moins qu&apos;un avis en ligne.
          </li>
        </ol>

        <h2 id="cout-reel">Le coût réel d&apos;un retard</h2>
        <p>
          Le retard n&apos;a pas qu&apos;un coût juridique. Il a un coût d&apos;exploitation que la plupart des
          entreprises ne chiffrent jamais, parce qu&apos;il se répartit sur trois ou quatre lignes
          différentes.
        </p>

        <ComparisonTable
          headers={['Poste', 'Ce que ça coûte réellement']}
          rows={[
            ['Équipe de pose immobilisée', 'Deux poseurs qu\'on ne peut pas replacer à 48 h : une journée sèche, chaque fois.'],
            ['Replanification du dossier', 'Le créneau libéré est rarement repris. Il est décalé, et décale tout ce qui suit.'],
            ['Solde encaissé plus tard', 'Le solde tombe à la pose. Un mois de retard, c\'est un mois de trésorerie en moins sur le dossier.'],
            ['Stockage du mobilier livré', 'De la place occupée, un risque de casse, parfois une manutention en double.'],
            ['Geste commercial', 'La variable d\'ajustement, souvent décidée sous pression, donc mal calibrée.'],
            ['Réputation locale', 'Le poste le plus cher, le seul qui ne se rattrape pas.'],
          ]}
          highlightCol={1}
        />

        <p>
          Mis bout à bout, un retard d&apos;un mois sur un dossier moyen consomme facilement l&apos;équivalent
          d&apos;un à deux points de marge. C&apos;est dans cet ordre de grandeur qu&apos;il faut juger le temps
          passé à relancer un fournisseur : quinze minutes de suivi hebdomadaire sont très largement
          rentables.
        </p>

        <h2 id="faq">Questions fréquentes</h2>
        <FAQ items={FAQ_ITEMS.map(({ q, a }) => ({ q, a }))} />

        <Callout variant="info" title="Un mot de prudence">
          Cet article présente le cadre général applicable aux ventes aux consommateurs et les usages du
          métier. Un dossier contentieux dépend toujours de la rédaction exacte de vos documents et des
          échanges avec le client : faites relire vos CGV et votre clause de délai par un professionnel du
          droit avant de les généraliser.
        </Callout>

        <FinalCTA
          title="Voir les retards arriver, pas les subir"
          subtitle="Dates butoirs par commande fournisseur, alertes automatiques sur les dossiers en risque, historique des échanges client : AVRA suit vos délais à votre place. Bêta privée gratuite pendant 90 jours."
        />

        <RelatedArticles
          items={[
            { href: '/blog/5-erreurs-marge-cuisiniste', title: '5 erreurs qui plombent la marge', description: 'Les retards fournisseurs en font partie — voici les quatre autres.', tag: 'Rentabilité' },
            { href: '/blog/devis-cuisine-modele-mentions-legales', title: 'Devis cuisine : mentions obligatoires', description: 'Où écrire le délai, et les 13 autres mentions qui protègent.', tag: 'Réglementation' },
            { href: '/blog/tva-cuisine-10-ou-20', title: 'TVA cuisine : 10 %, 5,5 % ou 20 % ?', description: 'La ventilation ligne par ligne, et ce qui se passe en cas de contrôle.', tag: 'Réglementation' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'Retard de livraison : ce que vous devez au client, ce que le fournisseur vous doit',
        description: "Delai de 30 jours, mise en demeure, resolution, remboursement majore jusqu'a 50 % : le cadre legal du retard de livraison en agencement, et la methode pour l'anticiper.",
        image: 'https://avra-app.fr/images/blog/retard-livraison-cuisine.jpg',
        datePublished: '2026-09-25',
        dateModified: '2026-09-27',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/retard-livraison-cuisine-droits-recours' },
        articleSection: 'Réglementation',
        keywords: 'retard de livraison cuisine, delai livraison cuisine, L216-1, mise en demeure, resolution contrat, penalites retard fournisseur',
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
          { '@type': 'ListItem', position: 3, name: 'Retard de livraison', item: 'https://avra-app.fr/blog/retard-livraison-cuisine-droits-recours' },
        ],
      }) }} />
    </>
  );
}
