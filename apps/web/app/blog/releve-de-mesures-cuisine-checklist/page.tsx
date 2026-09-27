'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles, ArticleImage,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'ou-ca-se-joue', label: 'Une cuisine se rate au métré' },
  { id: 'materiel', label: 'Le matériel qui suffit' },
  { id: 'les-cotes', label: 'Les cotes qu\'on prend toujours' },
  { id: 'defauts-du-bati', label: 'Mesurer les défauts du bâti' },
  { id: 'reseaux', label: 'Les réseaux : le vrai sujet' },
  { id: 'obstacles', label: 'Les obstacles qu\'on ne voit pas' },
  { id: 'acces', label: 'L\'accès : le poste qu\'on oublie' },
  { id: 'photos', label: 'Le protocole photo' },
  { id: 'validation', label: 'Faire valider, et geler le projet' },
  { id: 'checklist', label: 'La checklist récapitulative' },
  { id: 'erreurs', label: '10 erreurs qui coûtent une journée' },
  { id: 'faq', label: 'Questions fréquentes' },
];

const FAQ_ITEMS = [
  {
    q: 'Combien de temps faut-il prévoir pour un relevé de mesures sérieux ?',
    texte:
      "Entre quarante-cinq minutes et une heure trente pour une cuisine standard, hors discussion "
      + "commerciale. Un relevé bâclé en vingt minutes se paie systématiquement : soit en reprise de plan, "
      + "soit en adaptation sur chantier le jour de la pose, avec deux poseurs immobilisés. Le métré est le "
      + "moment où l'on achète de la certitude au prix du temps passé.",
    a: (
      <p>
        Entre <strong>45 minutes et 1 h 30</strong> pour une cuisine standard, hors discussion commerciale. Un
        relevé bâclé en vingt minutes se paie systématiquement : en reprise de plan, ou en adaptation le jour
        de la pose avec deux poseurs immobilisés. Le métré, c&apos;est le moment où l&apos;on achète de la
        certitude au prix du temps passé.
      </p>
    ),
  },
  {
    q: 'Faut-il faire le relevé avant ou après la dépose de l\'ancienne cuisine ?',
    texte:
      "Idéalement les deux. Un premier relevé avant dépose pour concevoir et chiffrer, puis un contrôle après "
      + "dépose avant de lancer la fabrication, quand les murs sont enfin visibles. C'est après la dépose "
      + "qu'apparaissent les faux aplombs masqués par les anciens meubles, les carrelages qui s'arrêtent au "
      + "ras de l'ancien mobilier et les saignées rebouchées à l'arrache.",
    a: (
      <>
        <p>
          Idéalement les deux. Un premier relevé avant dépose pour concevoir et chiffrer, puis un contrôle
          après dépose <strong>avant de lancer la fabrication</strong>.
        </p>
        <p>
          C&apos;est après la dépose qu&apos;apparaissent les faux aplombs masqués par les anciens meubles, le
          carrelage qui s&apos;arrête net au ras de l&apos;ancien mobilier, et les saignées rebouchées à
          l&apos;arrache. Sur une rénovation d&apos;immeuble ancien, ce second passage n&apos;est pas un luxe.
        </p>
      </>
    ),
  },
  {
    q: 'Quelle tolérance accepter sur une longueur de mur ?',
    texte:
      "Aucune, au sens où l'on ne retient jamais une seule valeur. On mesure la longueur au sol, à hauteur de "
      + "plan de travail et en haut, et on retient la plus courte pour dimensionner l'implantation. Sur un "
      + "mur de 4 mètres dans de l'ancien, un écart de 2 à 4 cm entre le haut et le bas est courant. Si vous "
      + "avez dimensionné sur la cote la plus longue, la dernière colonne ne rentre pas.",
    a: (
      <>
        <p>
          Aucune, au sens où l&apos;on ne retient jamais une seule valeur. On mesure{' '}
          <strong>à trois hauteurs</strong> — au sol, à hauteur de plan, en haut — et on dimensionne sur la
          plus courte.
        </p>
        <p>
          Sur un mur de 4 mètres dans de l&apos;ancien, un écart de 2 à 4 cm entre le haut et le bas est
          banal. Si vous avez dimensionné sur la cote la plus longue, la dernière colonne ne rentre pas, et
          vous le découvrez à 16 h le jour de la pose.
        </p>
      </>
    ),
  },
  {
    q: 'Le télémètre laser suffit-il, ou faut-il garder le mètre ruban ?',
    texte:
      "Les deux, et ils ne servent pas aux mêmes choses. Le laser est excellent sur les grandes longueurs et "
      + "les hauteurs sous plafond, mais il devient imprécis dans les angles, sur les surfaces brillantes et "
      + "sur les courtes distances. Le mètre ruban reste roi pour les niches, les entraxes de réseaux et "
      + "tout ce qui se mesure sous 50 cm.",
    a: (
      <p>
        Les deux, pour des usages différents. Le laser est imbattable sur les grandes longueurs et les hauteurs
        sous plafond ; il devient approximatif dans les angles, sur les surfaces brillantes et sous 50 cm. Le
        mètre ruban reste roi pour les niches, les entraxes de réseaux et les petites cotes. Le laser ne
        remplace pas le ruban, il lui fait gagner du temps.
      </p>
    ),
  },
  {
    q: 'Comment gérer un mur qui n\'est pas d\'équerre ?',
    texte:
      "On le mesure avant de le subir. La méthode courante consiste à reporter 60 cm sur un mur, 80 cm sur "
      + "l'autre et à mesurer l'hypoténuse : si elle vaut 100 cm, l'angle est droit. Tout écart se traduit "
      + "ensuite par une joue de finition, un jeu calculé derrière le plan de travail ou une découpe sur "
      + "mesure — à condition d'avoir prévu la pièce à la commande, pas de l'improviser le jour de la pose.",
    a: (
      <>
        <p>
          On le mesure avant de le subir. Reportez <strong>60 cm</strong> sur un mur,{' '}
          <strong>80 cm</strong> sur l&apos;autre, mesurez l&apos;hypoténuse : si elle vaut{' '}
          <strong>100 cm</strong>, l&apos;angle est droit. Sinon, notez l&apos;écart.
        </p>
        <p>
          Ce défaut se rattrape ensuite par une joue de finition, un jeu calculé derrière le plan de travail ou
          une découpe sur mesure. Toutes ces solutions ont un point commun : elles se commandent. Improvisées
          le jour de la pose, elles coûtent un second déplacement.
        </p>
      </>
    ),
  },
  {
    q: 'Quelle hauteur retenir quand le sol n\'est pas de niveau ?',
    texte:
      "On repère le point haut du sol sur toute l'emprise de la cuisine, et c'est lui qui sert de référence "
      + "pour la ligne de plan de travail. Les pieds réglables rattrapent ensuite vers le bas. Travailler à "
      + "partir du point bas conduit à un meuble qui ne peut plus descendre, donc à une plinthe qui ne joint "
      + "plus, ou pire, à un plan de travail qui bute sous une fenêtre.",
    a: (
      <p>
        On repère le <strong>point haut</strong> du sol sur toute l&apos;emprise, et c&apos;est lui qui donne
        la ligne de plan de travail. Les pieds réglables rattrapent ensuite vers le bas. Partir du point bas
        mène à un meuble qui ne peut plus descendre : plinthe qui ne joint plus, ou plan de travail qui bute
        sous l&apos;appui de fenêtre.
      </p>
    ),
  },
  {
    q: 'Faut-il faire signer le relevé par le client ?',
    texte:
      "Oui, et c'est autant un outil commercial qu'une protection. Un plan d'implantation validé et daté fixe "
      + "le projet, déclenche le délai de fabrication et clarifie ce qui relève d'une modification payante. "
      + "Sans validation écrite, chaque changement d'avis se négocie à partir de rien et ronge la marge sans "
      + "laisser de trace.",
    a: (
      <>
        <p>
          Oui, et c&apos;est autant un outil commercial qu&apos;une protection. Un plan d&apos;implantation
          validé et daté fixe le projet, <strong>déclenche le délai de fabrication</strong> et rend lisible ce
          qui relève d&apos;une modification payante.
        </p>
        <p>
          Sans validation écrite, chaque changement d&apos;avis se renégocie à partir de rien, et ronge la
          marge sans laisser de trace comptable.
        </p>
      </>
    ),
  },
  {
    q: 'Que faire si le chantier n\'est pas terminé au moment du relevé ?',
    texte:
      "On relève quand même, mais on note explicitement ce qui n'est pas définitif : cloison non montée, "
      + "chape non coulée, carrelage non posé, doublage à venir. Chaque élément manquant modifie une cote "
      + "finie. Le relevé devient alors provisoire et doit être confirmé avant lancement de la fabrication, "
      + "avec une mention claire sur le document remis au client.",
    a: (
      <p>
        On relève quand même, mais on note ce qui n&apos;est <strong>pas définitif</strong> : cloison non
        montée, chape non coulée, carrelage non posé, doublage à venir. Chacun de ces éléments modifie une
        cote finie — un doublage de 13 mm, c&apos;est 26 mm sur la largeur utile d&apos;une niche. Le relevé
        reste provisoire, mention écrite sur le document remis, et doit être confirmé avant fabrication.
      </p>
    ),
  },
];

export default function ReleveDeMesuresCuisine() {
  return (
    <>
      <ArticleShell
        category="Méthode"
        title="Relevé de mesures cuisine : la checklist complète du métré"
        subtitle="Un plan faux se détecte le jour de la pose, quand deux poseurs sont déjà sur place. Voici la méthode de relevé qui supprime la reprise, point par point."
        date="27 septembre 2026"
        readTime="17 min"
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            'Chaque longueur se mesure à trois hauteurs, et c\'est la plus courte qui sert à dimensionner.',
            'Le sol donne la référence par son point haut, jamais par son point bas.',
            'L\'équerrage se vérifie au 3-4-5 : un angle supposé droit ne l\'est presque jamais dans l\'ancien.',
            'Les réseaux se relèvent en cotes depuis un angle fixe, pas « à peu près au milieu ».',
            'Le relevé validé et daté par le client est le point de départ du délai de fabrication.',
          ]}
        />

        <h2 id="ou-ca-se-joue">Une cuisine se rate au métré</h2>
        <p>
          Demandez à un poseur expérimenté ce qui fait dérailler une journée. Il ne vous parlera pas de
          mobilier défectueux ni de client difficile. Il vous parlera d&apos;une colonne qui ne passe pas de
          deux centimètres, d&apos;une évacuation vingt centimètres plus à droite que sur le plan, d&apos;un
          coffre de volet roulant que personne n&apos;avait noté.
        </p>
        <p>
          Trois défauts qui ont tous la même origine : une donnée absente du relevé. Et trois défauts qui
          coûtent la même chose — une demi-journée à deux, une pièce à recommander, un client qui commence à
          douter.
        </p>

        <PullQuote>
          Une erreur de conception se corrige en deux clics. La même erreur découverte sur chantier coûte une
          journée de pose et six semaines de délai sur la pièce à refaire.
        </PullQuote>

        <ArticleImage
          src="/images/blog/releve-de-mesures-cuisine.jpg"
          alt="Relevé de mesures dans une cuisine en rénovation, télémètre laser et carnet de cotes"
          caption="Le métré n'est pas une formalité avant la vente. C'est l'étape qui détermine si la pose durera deux jours ou trois."
          priority
        />

        <h2 id="materiel">Le matériel qui suffit</h2>
        <p>
          Rien d&apos;exotique, mais tout doit être dans le sac à chaque fois. Un relevé fait avec le mètre
          emprunté au client est un relevé qu&apos;il faudra refaire.
        </p>

        <ul>
          <li><strong>Télémètre laser</strong> — longueurs, hauteurs sous plafond, diagonales.</li>
          <li><strong>Mètre ruban 5 m</strong> — tout ce qui fait moins de 50 cm, niches, entraxes.</li>
          <li><strong>Niveau à bulle 60 cm ou laser croix</strong> — planéité du sol, aplomb des murs.</li>
          <li><strong>Détecteur de métaux et de câbles</strong> — avant toute promesse de fixation ou de saignée.</li>
          <li><strong>Équerre de maçon</strong>, ou la méthode 3-4-5 au ruban, qui vaut mieux.</li>
          <li><strong>Appareil photo</strong> — le téléphone suffit, à condition d&apos;avoir un protocole.</li>
          <li><strong>Une feuille de relevé pré-imprimée</strong> — la même à chaque fois, avec les cases vides qui sautent aux yeux.</li>
        </ul>

        <Callout variant="tip" title="La feuille pré-imprimée n'est pas un détail">
          Un relevé noté sur une feuille blanche est un relevé où l&apos;on oublie ce à quoi on n&apos;a pas
          pensé. Une trame fixe avec des champs obligatoires force à constater qu&apos;une case est vide. C&apos;est
          le seul dispositif qui fonctionne contre l&apos;oubli, y compris chez les gens expérimentés.
        </Callout>

        <h2 id="les-cotes">Les cotes qu&apos;on prend toujours</h2>

        <h3>Les longueurs, à trois hauteurs</h3>
        <p>
          Pour chaque mur recevant du mobilier : une mesure <strong>au sol</strong> (environ 10 cm du
          plancher), une <strong>à hauteur de plan de travail</strong> (environ 90 cm), une{' '}
          <strong>en haut</strong> (environ 200 cm). Trois valeurs notées séparément, jamais moyennées.
        </p>
        <p>
          C&apos;est la plus courte qui commande l&apos;implantation. Et c&apos;est l&apos;écart entre les
          trois qui vous dit si vous avez affaire à un mur banal ou à un mur qui va demander des joues de
          finition.
        </p>

        <h3>Les hauteurs</h3>
        <p>
          Hauteur sous plafond mesurée en <strong>quatre points</strong> au minimum, aux extrémités de chaque
          mur concerné. Dans de l&apos;ancien, un écart de 3 à 5 cm sur une pièce n&apos;a rien
          d&apos;exceptionnel — et il décide du choix entre une colonne standard et une colonne recoupée.
        </p>

        <h3>Les cotes de référence à consigner</h3>
        <ComparisonTable
          headers={['Cote', 'Valeur usuelle', 'Pourquoi on la note']}
          rows={[
            ['Hauteur de plan de travail finie', '86 à 95 cm selon l\'utilisateur', 'Se cale sur la taille du client, pas sur un standard. À valider avec lui, devant le mur.'],
            ['Retombée sous les meubles hauts', '50 à 60 cm au-dessus du plan', 'Conditionne le choix de la crédence et le dégagement au-dessus de la plaque.'],
            ['Profondeur caisson bas', '56 à 58 cm', 'Vérifier le passage devant : couloir de circulation, îlot, ouverture de porte.'],
            ['Débord du plan de travail', '2 à 4 cm en façade', 'Change la cote finie de la pièce et la position des poignées.'],
            ['Hauteur de plinthe / socle', '10 à 15 cm', 'C\'est la réserve de réglage disponible pour rattraper le sol.'],
            ['Hauteur hotte au-dessus des foyers', 'selon notice fabricant', 'Distance mini différente entre induction et gaz. Se vérifie à la notice, pas de mémoire.'],
          ]}
          highlightCol={1}
        />

        <Callout variant="info" title="La hauteur de plan se décide sur place, avec le client">
          Faire poser au client les mains à plat sur un support à la hauteur envisagée prend trente secondes et
          règle une insatisfaction sur laquelle on ne revient plus une fois le mobilier fabriqué. C&apos;est le
          seul réglage de la cuisine qui dépend d&apos;un corps et pas d&apos;un mur.
        </Callout>

        <h2 id="defauts-du-bati">Mesurer les défauts du bâti</h2>
        <p>
          Un mur droit, de niveau, d&apos;équerre, ça existe : dans les catalogues. Sur le terrain, le travail
          consiste à chiffrer l&apos;écart pour le rattraper en conception plutôt qu&apos;en bricolage.
        </p>

        <h3>L&apos;équerrage, au 3-4-5</h3>
        <p>
          Reportez 60 cm le long du premier mur, 80 cm le long du second, mesurez la diagonale entre les deux
          repères. <strong>100 cm exactement</strong> : l&apos;angle est droit. 97 ou 104 : il ne l&apos;est
          pas, et vous venez d&apos;apprendre quelque chose qui vaut une joue de finition.
        </p>

        <h3>L&apos;aplomb des murs</h3>
        <p>
          Niveau plaqué verticalement à plusieurs endroits. Un mur qui fuit vers l&apos;extérieur en hauteur
          décolle les meubles hauts du mur ; un mur qui rentre coince les caissons bas. Dans les deux cas
          l&apos;écart se compense au montage — mais seulement s&apos;il est connu.
        </p>

        <h3>La planéité du sol</h3>
        <p>
          Règle ou laser sur toute l&apos;emprise. On cherche le point haut, on note l&apos;écart maximal, on
          le compare à la course de réglage des pieds. Au-delà de ce que les pieds rattrapent, c&apos;est un
          ragréage à chiffrer dans le devis, pas une mauvaise surprise à absorber le jour J.
        </p>

        <StatGrid
          stats={[
            { value: '3', label: 'hauteurs par longueur', sub: 'sol, plan, haut' },
            { value: '4', label: 'points de hauteur', sub: 'sous plafond, minimum' },
            { value: '3-4-5', label: 'la vérification d\'équerre', sub: '60 / 80 / 100 cm' },
            { value: '1', label: 'point haut du sol', sub: 'la référence, toujours' },
          ]}
        />

        <h2 id="reseaux">Les réseaux : le vrai sujet</h2>
        <p>
          C&apos;est là que se logent les surprises chères, parce qu&apos;un réseau mal relevé ne se rattrape
          pas avec une joue : il se rattrape avec un plombier ou un électricien, donc avec un second
          déplacement et une journée de décalage.
        </p>
        <p>
          La règle unique : <strong>toute cote de réseau se prend depuis un angle fixe de la pièce</strong>, en
          horizontal et en vertical. Jamais « au milieu du mur », jamais « derrière l&apos;évier ».
        </p>

        <ChecklistCard
          title="Ce qu'on relève sur les réseaux"
          items={[
            { label: 'Arrivées eau chaude et froide', help: 'Cote depuis l\'angle, hauteur depuis le sol fini, type de raccord et diamètre.' },
            { label: 'Évacuation', help: 'Cote, hauteur, diamètre, et surtout le sens de la pente. C\'est ce qui décide si l\'évier peut être déplacé.' },
            { label: 'Alimentation gaz et robinet d\'arrêt', help: 'Position exacte, accessibilité après pose. Un robinet inaccessible n\'est pas conforme.' },
            { label: 'Prises, interrupteurs, ligne dédiée plaque', help: 'Chaque point relevé en cote et en hauteur, avec l\'ampérage de la ligne si lisible.' },
            { label: 'Tableau électrique', help: 'Sa position, et s\'il reste accessible une fois le mobilier posé.' },
            { label: 'Sortie de hotte ou VMC', help: 'Diamètre, position, et parcours possible de la gaine. Le point qui bloque le plus souvent une implantation d\'îlot.' },
            { label: 'Attente lave-vaisselle et lave-linge', help: 'Arrivée, évacuation, prise. Trois éléments, pas un seul.' },
            { label: 'Radiateur et ses raccords', help: 'À déplacer ou à conserver. Un sèche-serviette oublié derrière une colonne, c\'est le classique.' },
          ]}
        />

        <Callout variant="warning" title="La gaine de hotte sur un îlot">
          C&apos;est la contrainte n° 1 des projets avec îlot, et elle se détecte au métré ou jamais. Faux
          plafond disponible ? Hauteur de retombée acceptable ? Distance jusqu&apos;à la sortie ? Si la réponse
          est non, c&apos;est une hotte à recyclage ou un plan à revoir — et mieux vaut le savoir avant
          d&apos;avoir vendu un îlot avec hotte suspendue.
        </Callout>

        <h2 id="obstacles">Les obstacles qu&apos;on ne voit pas</h2>
        <p>
          Ceux-là ne se mesurent pas, ils se remarquent. La différence entre un métreur expérimenté et un
          débutant tient presque entièrement dans cette liste.
        </p>

        <ul>
          <li>
            <strong>Le débattement des ouvrants.</strong> Fenêtre à la française qui s&apos;ouvre sur le plan
            de travail, porte qui bute contre un caisson, porte de four qui croise un passage.
          </li>
          <li>
            <strong>Le coffre de volet roulant.</strong> Invisible fenêtre fermée, fatal pour un meuble haut.
          </li>
          <li>
            <strong>Les appuis et tablettes de fenêtre.</strong> Leur hauteur décide si le plan passe dessous
            ou vient buter.
          </li>
          <li>
            <strong>Les descentes et colonnes techniques.</strong> Une descente EU dans un angle, c&apos;est un
            caisson à recouper ou un faux caisson à prévoir.
          </li>
          <li>
            <strong>Les poutres et retombées.</strong> Fréquentes en maison ancienne, elles cassent une ligne
            de meubles hauts.
          </li>
          <li>
            <strong>Les plinthes et moulures existantes.</strong> Trois centimètres derrière chaque caisson si
            elles ne sont pas déposées.
          </li>
          <li>
            <strong>Le sens d&apos;ouverture voulu par le client.</strong> Gaucher, droitier, poubelle du
            même côté que l&apos;évier : ça se décide au relevé, pas en atelier.
          </li>
        </ul>

        <h2 id="acces">L&apos;accès : le poste qu&apos;on oublie</h2>
        <p>
          Les cotes sont bonnes, le plan est juste, la cuisine est fabriquée. Et le plan de travail de 3,20 m
          ne passe pas dans la cage d&apos;escalier.
        </p>
        <p>
          L&apos;accès se relève comme le reste, et il conditionne parfois la conception elle-même : un plan
          en deux parties avec un joint, ou un plan monobloc, ce n&apos;est pas la même vente.
        </p>

        <ChecklistCard
          title="Le relevé d'accès, en six points"
          items={[
            { label: 'Largeur et hauteur de la porte d\'entrée', help: 'Et celle du palier, et de chaque porte traversée.' },
            { label: 'Escalier : largeur, giron, hauteur sous limon, présence de quart tournant', help: 'Le quart tournant est le point bloquant le plus fréquent pour un plan de travail long.' },
            { label: 'Ascenseur : dimensions intérieures et hauteur utile', help: 'Y compris la diagonale : c\'est elle qui compte pour un panneau.' },
            { label: 'Distance de portage depuis le point de déchargement', help: 'Au-delà de 30 mètres ou d\'un étage sans ascenseur, ça se chiffre.' },
            { label: 'Stationnement du camion', help: 'Zone de livraison, autorisation de voirie, horaires imposés en centre-ville.' },
            { label: 'Contraintes de copropriété', help: 'Horaires de travaux, réservation d\'ascenseur, protection des parties communes.' },
          ]}
        />

        <Callout variant="insight" title="Le calcul qui sauve un plan de travail">
          Pour savoir si un panneau passe dans un escalier, ce n&apos;est pas la largeur des marches qui
          compte, c&apos;est la diagonale disponible dans le volume au point le plus contraint. Mesurez-la une
          fois, notez-la dans le dossier, et vous ne referez plus jamais le calcul en urgence au téléphone
          depuis le camion.
        </Callout>

        <h2 id="photos">Le protocole photo</h2>
        <p>
          Les photos ne remplacent aucune cote. Elles servent à répondre, trois semaines plus tard, à la
          question « est-ce qu&apos;il y avait une prise à gauche de la fenêtre ? » sans reprendre la route.
        </p>
        <p>
          Prenez toujours la même série, dans le même ordre. Une vingtaine de clichés, deux minutes.
        </p>
        <ol>
          <li>Une vue d&apos;ensemble depuis chaque angle de la pièce, quatre photos.</li>
          <li>Chaque mur de face, en entier.</li>
          <li>Chaque réseau en gros plan, avec un mètre déplié dans le cadre pour donner l&apos;échelle.</li>
          <li>Le tableau électrique, ouvert.</li>
          <li>Les sols et les plinthes existantes.</li>
          <li>La sortie de hotte et son environnement.</li>
          <li>L&apos;accès : porte d&apos;entrée, palier, escalier, place de livraison.</li>
        </ol>

        <Callout variant="tip" title="Le mètre déplié dans le cadre">
          Une photo de prise électrique sans échelle ne vaut rien. La même photo avec un mètre déplié à côté
          permet de retrouver une cote qu&apos;on avait oublié de noter. C&apos;est le réflexe le plus rentable
          du métier, et il ne coûte rien.
        </Callout>

        <h2 id="validation">Faire valider, et geler le projet</h2>
        <p>
          Le relevé se termine par un document : plan d&apos;implantation coté, liste des contraintes
          identifiées, travaux préparatoires nécessaires. Ce document est daté et validé par le client, par
          signature ou par simple retour de mail explicite.
        </p>
        <p>
          Cette validation joue trois rôles à la fois, et c&apos;est ce qui la rend précieuse :
        </p>
        <ul>
          <li>
            elle <strong>déclenche le délai de fabrication</strong>, qui ne court plus depuis la signature du
            devis mais depuis un projet figé ;
          </li>
          <li>
            elle <strong>trace les contraintes connues</strong> — un faux aplomb signalé et accepté ne devient
            jamais un litige ;
          </li>
          <li>
            elle <strong>rend lisibles les modifications</strong> : après validation, tout changement est un
            avenant chiffré, et le client l&apos;a compris d&apos;avance.
          </li>
        </ul>

        <Callout variant="insight" title="Le lien avec le délai">
          Faire partir le délai de fabrication de la validation du relevé, et non de la signature du devis, est
          l&apos;une des clauses les plus protectrices du métier. Elle déplace le point de départ après la
          phase où le client hésite encore, et elle est parfaitement loyale : on ne lance pas une fabrication
          sur un projet non figé.
        </Callout>

        <h2 id="checklist">La checklist récapitulative</h2>
        <p>
          À imprimer, à garder dans le sac, à cocher sur place. Un relevé incomplet se voit au premier coup
          d&apos;œil sur une trame fixe.
        </p>

        <ChecklistCard
          title="Relevé de mesures — checklist terrain"
          items={[
            { label: 'Longueurs de chaque mur, à trois hauteurs', help: 'Sol, 90 cm, 200 cm. Trois valeurs notées séparément.' },
            { label: 'Hauteur sous plafond en quatre points' },
            { label: 'Équerrage de chaque angle, méthode 3-4-5' },
            { label: 'Aplomb des murs concernés' },
            { label: 'Point haut du sol et écart maximal' },
            { label: 'Position cotée de tous les réseaux depuis un angle fixe' },
            { label: 'Sortie de hotte / VMC : diamètre, position, parcours' },
            { label: 'Ouvrants : débattement de chaque porte et fenêtre' },
            { label: 'Coffres de volet, appuis, poutres, descentes' },
            { label: 'Plinthes et moulures existantes : déposées ou conservées' },
            { label: 'Hauteur de plan validée avec le client, sur place' },
            { label: 'Accès : porte, escalier, ascenseur, stationnement' },
            { label: 'Série photo complète, avec échelle sur les gros plans' },
            { label: 'Travaux préparatoires listés et chiffrés' },
            { label: 'Plan d\'implantation validé et daté par le client' },
          ]}
        />

        <h2 id="erreurs">10 erreurs qui coûtent une journée</h2>
        <ol>
          <li><strong>Une seule mesure par mur.</strong> La mère de toutes les reprises.</li>
          <li><strong>Supposer l&apos;angle droit.</strong> Il ne l&apos;est pas, et ça se vérifie en dix secondes.</li>
          <li><strong>Partir du point bas du sol.</strong> Les pieds ne remontent pas.</li>
          <li><strong>Relever les réseaux « à peu près ».</strong> Une évacuation à 15 cm près, c&apos;est un plombier à rappeler.</li>
          <li><strong>Oublier le débattement de la porte d&apos;entrée</strong> de la cuisine, qui vient buter sur la première colonne.</li>
          <li><strong>Ne pas ouvrir le tableau électrique.</strong> On découvre le jour de la pose qu&apos;il n&apos;y a pas de ligne disponible.</li>
          <li><strong>Ignorer le coffre de volet roulant</strong>, invisible quand le volet est ouvert.</li>
          <li><strong>Ne pas relever l&apos;accès.</strong> Le plan de travail monobloc qui ne monte pas au troisième.</li>
          <li><strong>Photographier sans échelle.</strong> Vingt photos inexploitables.</li>
          <li><strong>Ne rien faire valider.</strong> Chaque modification devient une discussion, et chaque discussion un rabais.</li>
        </ol>

        <Callout variant="insight" title="Ce que ça change d'avoir le relevé dans le dossier">
          Un relevé qui vit dans un carnet ne sert qu&apos;à celui qui l&apos;a écrit. Rattaché au dossier
          client, avec ses photos et son plan validé, il sert au poseur trois semaines plus tard, au SAV six
          mois plus tard, et au commercial quand le client rappelle pour ajouter une colonne. C&apos;est
          exactement ce que fait AVRA : le relevé, les photos et la validation client restent attachés au
          dossier, accessibles depuis le chantier.
        </Callout>

        <h2 id="faq">Questions fréquentes</h2>
        <FAQ items={FAQ_ITEMS.map(({ q, a }) => ({ q, a }))} />

        <Callout variant="info" title="Sur les cotes citées">
          Les valeurs indiquées dans cet article sont les usages courants du métier. Les distances de sécurité
          des appareils — hotte au-dessus des foyers en particulier — relèvent des notices fabricant et des
          règles d&apos;installation applicables : vérifiez-les appareil par appareil, elles varient.
        </Callout>

        <FinalCTA
          title="Le relevé, les photos et le plan validé au même endroit"
          subtitle="AVRA rattache le relevé de mesures au dossier client, avec ses photos et la validation datée — consultable depuis le chantier, par le poseur comme par le commercial. Bêta privée gratuite pendant 90 jours."
        />

        <RelatedArticles
          items={[
            { href: '/blog/retard-livraison-cuisine-droits-recours', title: 'Retard de livraison : le cadre légal', description: 'Pourquoi faire partir le délai de la validation du relevé change tout.', tag: 'Réglementation' },
            { href: '/blog/5-erreurs-marge-cuisiniste', title: '5 erreurs qui plombent la marge', description: 'Les reprises de chantier font partie des fuites les plus coûteuses.', tag: 'Rentabilité' },
            { href: '/blog/logiciel-menuisier-2026', title: 'Logiciel menuisier 2026', description: 'Plan technique, planning chantier, pose mobile : les 10 critères de choix.', tag: 'Guide' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'Relevé de mesures cuisine : la checklist complète du métré',
        description: "Cotes a trois hauteurs, equerrage, faux aplombs, reseaux, acces au chantier : la methode de releve qui evite les reprises, et les dix erreurs qui coutent une journee de pose.",
        image: 'https://avra-app.fr/images/blog/releve-de-mesures-cuisine.jpg',
        datePublished: '2026-09-27',
        dateModified: '2026-09-27',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/releve-de-mesures-cuisine-checklist' },
        articleSection: 'Méthode',
        keywords: 'releve de mesures cuisine, metre cuisine, checklist releve cuisine, prise de cotes cuisine, implantation cuisine',
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
          { '@type': 'ListItem', position: 3, name: 'Relevé de mesures cuisine', item: 'https://avra-app.fr/blog/releve-de-mesures-cuisine-checklist' },
        ],
      }) }} />
    </>
  );
}
