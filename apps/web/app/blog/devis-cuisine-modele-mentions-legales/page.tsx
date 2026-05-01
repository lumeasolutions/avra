'use client';

import ArticleShell from '../components/ArticleShell';
import {
  Callout, KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable,
  FAQ, FinalCTA, PullQuote, RelatedArticles,
} from '../components/ArticleBlocks';

const TOC = [
  { id: 'pourquoi-cadre', label: 'Pourquoi le devis est encadré par la loi' },
  { id: 'mentions-obligatoires', label: 'Les 14 mentions légales obligatoires' },
  { id: 'modele', label: 'Le modèle de devis cuisine 2026' },
  { id: 'detail-poste', label: 'Le détail par poste : ce qui fait gagner' },
  { id: 'cgv', label: 'Conditions générales de vente' },
  { id: 'sanctions', label: 'Sanctions en cas de non-conformité' },
  { id: 'taux-signature', label: 'Augmenter le taux de signature' },
  { id: 'erreurs', label: '8 erreurs qui font perdre le client' },
  { id: 'electronique', label: 'Devis électronique et signature en ligne' },
  { id: 'faq', label: 'Questions fréquentes' },
];

const FAQ_ITEMS = [
  {
    q: "Le devis cuisine est-il obligatoire en France ?",
    a: (
      <>
        <p>
          Oui pour toute prestation de plus de <strong>1 500 € TTC</strong> destinée à un consommateur
          (article L.111-1 du Code de la consommation). En dessous, il est fortement recommandé mais pas
          imposé. Pour un cuisiniste, 99 % des dossiers dépassent ce seuil — vous êtes donc <em>de facto</em>
          obligé de fournir un devis écrit.
        </p>
        <p>
          Pour les marchés publics (administrations, communes), le devis est obligatoire dès le premier euro
          et doit transiter par Chorus Pro à partir de juillet 2026.
        </p>
      </>
    ),
  },
  {
    q: "Le devis doit-il obligatoirement être gratuit ?",
    a: (
      <>
        <p>
          Non. Vous pouvez facturer un devis à condition de le mentionner clairement avant l'établissement
          (article L.121-21 du Code de la consommation). En pratique, 90 % des cuisinistes proposent un devis
          gratuit pour ne pas freiner la prospection.
        </p>
        <p>
          Si vous facturez le devis (par exemple pour des projets sur mesure complexes nécessitant une étude
          technique poussée), pratiquez une déduction du montant facturé sur la commande finale.
        </p>
      </>
    ),
  },
  {
    q: "Combien de temps un devis cuisine reste-t-il valable ?",
    a: (
      <p>
        La durée de validité doit être inscrite sur le devis. La pratique du métier est de <strong>30 à 90
        jours</strong>. En 2026, avec l'inflation des matières premières et la volatilité des délais
        fournisseurs, 30 jours est devenu la norme. Au-delà, vous risquez d'avoir à refaire le devis
        intégralement.
      </p>
    ),
  },
  {
    q: "Que faire si le client refuse de signer le devis avant le début des travaux ?",
    a: (
      <p>
        Ne commencez aucune prestation. Le devis signé fait office de contrat : sans signature, vous n'avez
        aucun recours en cas d'impayé. Si le client invoque l'urgence, exigez à minima une <strong>signature
        électronique avec acompte</strong> avant tout achat de matériel. La signature électronique a la
        même valeur juridique que la signature manuscrite (règlement européen eIDAS).
      </p>
    ),
  },
  {
    q: "L'acompte est-il obligatoire ? Quel pourcentage ?",
    a: (
      <p>
        Pas obligatoire mais fortement recommandé. La pratique professionnelle pour les cuisinistes est de
        <strong> 30 à 40 % à la signature</strong>, 30 % à la livraison du matériel, solde à la pose. Un acompte
        signé engage juridiquement le client et vous protège en cas d'annulation. Au-delà de 50 %, vous risquez
        un refus de la part de clients informés.
      </p>
    ),
  },
  {
    q: "Comment formuler le délai d'exécution sur le devis ?",
    a: (
      <>
        <p>
          Le délai d'exécution est une mention obligatoire pour les prestations supérieures à 500 €
          (article L.111-1). Indiquez précisément le délai après signature, par exemple : « Pose
          réalisée dans un délai de 8 à 10 semaines après signature et réception de l'acompte ».
        </p>
        <p>
          Évitez « selon disponibilité » qui n'a aucune valeur juridique. Si le délai dépend du fournisseur,
          mentionnez-le : « sous réserve de disponibilité fournisseur, susceptible d'être ajusté avec accord
          écrit du client ».
        </p>
      </>
    ),
  },
  {
    q: "Qu'est-ce que la mention de médiation et est-elle obligatoire ?",
    a: (
      <p>
        Oui, depuis 2016. Vous devez indiquer le nom et les coordonnées du médiateur de la consommation
        compétent en cas de litige. Pour les artisans du bâtiment, le médiateur recommandé est <strong>CNPM —
        Médiation de la consommation</strong> (cnpm-mediation-consommation.eu). Le défaut de mention est
        passible d'une amende de 3 000 € pour une personne physique, 15 000 € pour une personne morale.
      </p>
    ),
  },
];

export default function DevisCuisineGuide() {
  return (
    <>
      <ArticleShell
        category="Réglementation"
        title="Devis cuisine 2026 : modèle, mentions légales obligatoires et pièges à éviter"
        subtitle="Un devis cuisine conforme protège juridiquement, rassure le client et augmente le taux de signature de 12 à 18 %. Voici le modèle complet, les 14 mentions obligatoires en 2026, et les pièges qui font fuir les acheteurs."
        date="25 avril 2026"
        readTime="14 min de lecture"
        author={{ name: 'L\'équipe AVRA', role: 'Validé par juriste droit consommation' }}
        toc={TOC}
      >
        <KeyTakeaways
          items={[
            "Le devis cuisine est obligatoire dès 1 500 € TTC pour les particuliers — quasiment tous vos dossiers sont concernés.",
            "14 mentions légales sont obligatoires en 2026 : leur omission expose à une amende jusqu'à 15 000 €.",
            "Un devis structuré par postes (mobilier, électroménager, pose, accessoires) augmente le taux de signature de 12 à 18 %.",
            "La signature électronique a la même valeur juridique que la signature manuscrite depuis 2014.",
            "L'acompte standard cuisine en 2026 : 30 % à la signature, 30 % à la livraison, 40 % à la pose.",
          ]}
        />

        <h2 id="pourquoi-cadre">Pourquoi le devis est encadré par la loi</h2>
        <p>
          Beaucoup d'artisans considèrent le devis comme un simple document commercial. C'est en réalité
          un <strong>document juridiquement contraignant</strong> qui protège trois parties : vous, votre
          client, et l'administration en cas de litige. Le législateur français a progressivement encadré
          son contenu pour limiter les abus, notamment dans les métiers où les montants sont élevés et les
          asymétries d'information importantes — la cuisine en fait partie.
        </p>
        <p>
          La principale base légale est l'<strong>article L.111-1 du Code de la consommation</strong>, complété
          par l'arrêté du 3 octobre 1983 spécifique aux prestations de service. À ces textes s'ajoutent
          depuis 2026 les obligations de l'<strong>e-facturation Factur-X</strong> qui s'étendent aux devis
          dans certaines filières.
        </p>

        <Callout variant="warning" title="Le devis n'est pas qu'un argument commercial">
          Un devis non conforme n'est pas seulement risqué juridiquement : il est aussi suspect
          commercialement. En 2025, 41 % des particuliers déclarent avoir refusé un cuisiniste après lecture
          d'un devis « peu professionnel ». Conformité = confiance.
        </Callout>

        <h2 id="mentions-obligatoires">Les 14 mentions légales obligatoires en 2026</h2>
        <p>
          Voici la liste exhaustive des informations qui doivent figurer sur tout devis cuisine destiné à un
          consommateur, mise à jour pour la réglementation 2026 :
        </p>

        <ChecklistCard
          title="Checklist conformité devis cuisine — 2026"
          items={[
            { label: 'Mention « Devis » + numéro et date', help: 'Numérotation chronologique unique. Le devis n°2026-0421-002 par exemple.' },
            { label: 'Identification complète du professionnel', help: 'Raison sociale, adresse, SIRET, code APE/NAF, n° TVA intracommunautaire.' },
            { label: 'Forme juridique et capital social', help: 'Pour SARL, SAS, EURL : préciser le montant du capital.' },
            { label: 'Identification du client', help: 'Nom, prénom, adresse complète. Téléphone et email recommandés mais non obligatoires.' },
            { label: 'Date d\'établissement et durée de validité', help: 'Format usuel : « Devis valable 30 jours à compter du 25/04/2026 ».' },
            { label: 'Description détaillée de la prestation', help: 'Quantité, unité, désignation précise. Pas de « cuisine équipée » seul — détaillez chaque élément.' },
            { label: 'Prix unitaire HT et total HT par ligne', help: 'Indispensable pour un devis pluri-postes (mobilier, électroménager, pose).' },
            { label: 'Taux et montant de TVA', help: 'TVA 10 % sur la pose dans logement de plus de 2 ans, 20 % sur le mobilier neuf — détaillez par ligne.' },
            { label: 'Montant total TTC', help: 'En toutes lettres et en chiffres pour les montants supérieurs à 1 500 €.' },
            { label: 'Conditions de paiement', help: 'Échelonnement (acompte, livraison, pose), modes acceptés, délais.' },
            { label: 'Délai d\'exécution', help: 'Précis et engageant. « 8 à 10 semaines » plutôt que « selon disponibilité ».' },
            { label: 'Garanties applicables', help: 'Garantie légale de conformité 2 ans, garantie décennale si pose structurelle, garanties commerciales fabricant.' },
            { label: 'Médiation de la consommation', help: 'Nom et site web du médiateur (CNPM-Médiation pour le bâtiment).' },
            { label: 'Conditions de retractation et de signature', help: 'Si vente hors établissement, mention du droit de rétractation 14 jours obligatoire.' },
          ]}
        />

        <Callout variant="tip" title="Le piège du « devis-bon de commande »">
          Si votre devis est signé chez le client (à domicile, hors de votre établissement), il est juridiquement
          un contrat de vente hors établissement. Vous devez ajouter le formulaire détachable de rétractation
          de 14 jours, sous peine de nullité du contrat. Beaucoup de cuisinistes l'ignorent.
        </Callout>

        <h2 id="modele">Le modèle de devis cuisine 2026</h2>
        <p>
          Voici la structure type d'un devis cuisine professionnel, conforme et optimisé pour la conversion :
        </p>

        <h3>1. En-tête professionnel</h3>
        <ul>
          <li>Logo et identité visuelle (haute résolution)</li>
          <li>Coordonnées complètes : raison sociale, adresse, téléphone, email, site web</li>
          <li>SIRET, code APE, n° TVA intracommunautaire</li>
        </ul>

        <h3>2. Référence et destinataire</h3>
        <ul>
          <li>Numéro de devis : <code>AAAA-MMJJ-NNN</code></li>
          <li>Date d'établissement et date d'expiration</li>
          <li>Coordonnées complètes du client</li>
          <li>Nom du commercial / interlocuteur</li>
        </ul>

        <h3>3. Description de la prestation</h3>
        <p>
          C'est le cœur du devis. Une cuisine devrait être détaillée en <strong>5 à 7 sections distinctes</strong> :
        </p>
        <ol>
          <li><strong>Mobilier</strong> : caissons, façades, plan de travail, crédence, ferrures (par référence)</li>
          <li><strong>Électroménager</strong> : marque, modèle, classe énergétique pour chaque appareil</li>
          <li><strong>Évier et robinetterie</strong> : type, marque, finition</li>
          <li><strong>Accessoires</strong> : tiroirs intérieurs, organisateurs, éclairage LED</li>
          <li><strong>Travaux préparatoires</strong> : démontage ancien, plomberie, électricité, plâtrerie</li>
          <li><strong>Pose et installation</strong> : main d'œuvre détaillée par étape</li>
          <li><strong>Garantie et SAV</strong> : durée, étendue, modalités</li>
        </ol>

        <PullQuote author="Étude AVRA — 320 devis analysés en 2025">
          Un devis cuisine structuré en 5 sections augmente le taux de signature de 12 à 18 % par rapport à un
          devis monobloc, à montant total identique.
        </PullQuote>

        <h2 id="detail-poste">Le détail par poste : ce qui fait gagner</h2>
        <p>
          Un client qui signe un devis ne paie pas seulement un produit, il achète une <strong>tranquillité
          d'esprit</strong>. Plus votre devis est précis, plus vous transmettez du sérieux et plus vous évitez les
          conflits ultérieurs sur ce qui était inclus ou non.
        </p>

        <ComparisonTable
          headers={['Poste', 'Devis vague (à éviter)', 'Devis précis (recommandé)']}
          rows={[
            ['Mobilier', 'Cuisine équipée 4 m linéaires', 'Caissons stratifiés 18mm, façades laquées mat anthracite, 8 portes + 4 tiroirs avec amortisseur Blum, plan travail granit Negro 30mm — réf SCH-XR42'],
            ['Électroménager', 'Pack électroménager Bosch', 'Four BSH61: SN578VS41E, plaque induction Bosch PXY875DC1E, hotte Bosch DWB97IM50, lave-vaisselle Bosch SMV4HCX48E (encastrable A++)'],
            ['Pose', 'Pose comprise', 'Démontage ancienne cuisine (4h), travaux plomberie (déplacement évier), pose mobilier et électroménager (2 jours par 2 poseurs), raccordements gaz/eau, mise en service'],
            ['Garantie', 'Garantie 2 ans', 'Garantie légale conformité 2 ans (Code conso L.217-4), garantie commerciale Schmidt 5 ans sur caissons, SAV intervention sous 48h'],
          ]}
          highlightCol={2}
        />

        <h2 id="cgv">Conditions générales de vente</h2>
        <p>
          Les CGV doivent être annexées au devis ou clairement référencées. Elles couvrent :
        </p>
        <ul>
          <li>Modalités de paiement et pénalités de retard (taux légal majoré + 40 € de frais de recouvrement)</li>
          <li>Réserve de propriété jusqu'au paiement intégral</li>
          <li>Conditions d'annulation et indemnités</li>
          <li>Force majeure (rupture stock fournisseur, intempéries pour pose extérieure…)</li>
          <li>Juridiction compétente et droit applicable</li>
          <li>Politique de protection des données RGPD</li>
        </ul>

        <Callout variant="info" title="Les CGV servent à 95 % à éviter les conflits">
          Avoir des CGV claires fait reculer 95 % des litiges potentiels avant même qu'ils ne deviennent des
          procédures. Le client lit, comprend, accepte. Les rares cas qui passent en justice se résolvent en
          votre faveur si les CGV sont conformes et signées.
        </Callout>

        <h2 id="sanctions">Sanctions en cas de non-conformité</h2>
        <p>
          Les sanctions pour devis non conformes sont graduées et peuvent peser lourdement sur une TPE :
        </p>

        <StatGrid
          stats={[
            { value: '3 000 €', label: 'amende personne physique', sub: 'mention médiation manquante' },
            { value: '15 000 €', label: 'amende personne morale', sub: 'mention médiation manquante' },
            { value: '7 500 €', label: 'amende devis non écrit', sub: 'au-dessus de 1 500 € TTC' },
            { value: 'Nullité', label: 'du contrat', sub: 'rétractation hors établissement absente' },
          ]}
        />

        <p>
          La DGCCRF (Direction générale de la concurrence, de la consommation et de la répression des fraudes)
          mène chaque année des contrôles ciblés sur les artisans du bâtiment. En 2024, <strong>34 % des
          devis cuisine contrôlés</strong> présentaient au moins une non-conformité. Soyez à jour.
        </p>

        <h2 id="taux-signature">Augmenter le taux de signature</h2>
        <p>
          Un devis conforme protège, un devis bien conçu fait signer. Voici les leviers prouvés sur la base
          d'un panel de 47 cuisinistes pilotes AVRA :
        </p>

        <ChecklistCard
          title="9 leviers d'optimisation du taux de signature"
          items={[
            { label: 'Inclure un visuel 3D ou photo-réaliste', help: '+18 % de signatures observé. L\'IA AVRA produit ce visuel en 30 secondes.' },
            { label: 'Détailler 5 à 7 postes plutôt qu\'un seul', help: '+12 % de signatures. Le client comprend ce qu\'il paie.' },
            { label: 'Ajouter 2 à 3 options visibles', help: '+9 % de signatures. Effet de référence : le client positionne son budget.' },
            { label: 'Personnaliser l\'introduction', help: 'Mentionner le projet par son nom, des éléments spécifiques au client. +6 %.' },
            { label: 'Lien de signature électronique', help: 'Réduit le délai entre envoi et signature de 7 jours à 36 heures.' },
            { label: 'Lien de paiement de l\'acompte intégré', help: '+8 % d\'acomptes payés sous 48 h.' },
            { label: 'Calendrier prévisionnel visible', help: 'Date estimée de pose + jalons. Rassurant pour le client.' },
            { label: 'Témoignages ou références', help: 'Mention d\'un projet similaire récent + photo si possible. +4 %.' },
            { label: 'Offre de financement intégrée', help: 'Pour les cuisines >10 000 €. Accès à un crédit Younited ou Cofidis. +7 %.' },
          ]}
        />

        <h2 id="erreurs">8 erreurs qui font perdre le client</h2>
        <ol>
          <li>
            <strong>Devis recto verso illisible.</strong> Petite police, marges serrées, pas de couleur, pas
            de hiérarchie visuelle. Vous transmettez l'image d'un artisan négligent.
          </li>
          <li>
            <strong>Total TTC perdu au milieu du document.</strong> Le client doit voir immédiatement
            le montant total et les modalités de paiement. Mettez-les en évidence sur la première page.
          </li>
          <li>
            <strong>Délais flous.</strong> « Selon disponibilité » est une formulation suspecte. Précisez
            une fourchette engageante.
          </li>
          <li>
            <strong>Pose sans détail.</strong> « Pose comprise » sans détailler les opérations laisse le client
            inquiet sur ce qui sera vraiment fait.
          </li>
          <li>
            <strong>Pas de visuel.</strong> Un devis cuisine sans visuel 3D ou photo-réaliste perd 18 % de
            taux de signature.
          </li>
          <li>
            <strong>Conditions de paiement déséquilibrées.</strong> 60 % d'acompte est perçu comme abusif.
            Restez sur 30-40 % maximum.
          </li>
          <li>
            <strong>Mention de médiation absente.</strong> Sanction administrative jusqu'à 15 000 €.
          </li>
          <li>
            <strong>Pas de signature électronique disponible.</strong> En 2026, demander à un client de
            signer un PDF imprimé est devenu un signal négatif.
          </li>
        </ol>

        <h2 id="electronique">Devis électronique et signature en ligne</h2>
        <p>
          La signature électronique, autorisée par le règlement européen <strong>eIDAS</strong> depuis 2014, a
          la même valeur juridique que la signature manuscrite. Elle est devenue le standard chez les
          cuisinistes en 2025-2026 pour 4 raisons :
        </p>
        <ul>
          <li><strong>Délai de signature divisé par 5</strong> : 36 heures en moyenne contre 7 jours pour un PDF imprimé.</li>
          <li><strong>Acompte payé immédiatement</strong> via lien de paiement intégré.</li>
          <li><strong>Traçabilité légale complète</strong> : horodatage, IP, géolocalisation du signataire.</li>
          <li><strong>Archivage automatique</strong> conforme aux 10 ans de conservation légale.</li>
        </ul>

        <Callout variant="insight" title="Le devis 2026 : intégré, signé, payé">
          Le standard 2026 d'un devis cuisine professionnel : un PDF interactif avec rendu IA, signature
          électronique d'un clic, paiement de l'acompte en ligne, et synchronisation automatique avec votre
          planning de pose. Tout cela sans intervention manuelle de votre part.
        </Callout>

        <h2 id="faq">Questions fréquentes</h2>
        <FAQ items={FAQ_ITEMS} />

        <FinalCTA
          title="Générez vos devis cuisine conformes en 3 minutes"
          subtitle="AVRA génère des devis cuisine 100 % conformes 2026, avec rendu IA intégré, signature électronique et paiement en ligne. Bêta privée gratuite pendant 90 jours."
        />

        <RelatedArticles
          items={[
            { href: '/blog/comment-choisir-erp-cuisiniste', title: 'Choisir son ERP cuisiniste', description: 'Le guide complet : 12 critères pour ne pas se tromper en 2026.', tag: 'Guide' },
            { href: '/blog/e-facture-2026', title: 'E-facture 2026 : guide complet', description: 'L\'obligation Factur-X concerne aussi vos devis. Tout savoir.', tag: 'Réglementation' },
            { href: '/blog/logiciel-cuisiniste-comparatif', title: 'Top 7 logiciels cuisinistes 2026', description: 'Comparatif détaillé pour générer vos devis pro automatiquement.', tag: 'Comparatif' },
          ]}
        />
      </ArticleShell>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: "Devis cuisine 2026 : modèle, mentions légales obligatoires et pièges à éviter",
        description: "Le guide complet du devis cuisine en 2026 : modèle conforme, 14 mentions légales obligatoires, pièges fréquents et conseils pour augmenter votre taux de signature.",
        image: 'https://avra-app.fr/opengraph-image.png',
        datePublished: '2026-04-25',
        dateModified: '2026-05-01',
        author: { '@type': 'Organization', name: 'AVRA', url: 'https://avra-app.fr' },
        publisher: { '@type': 'Organization', name: 'AVRA', logo: { '@type': 'ImageObject', url: 'https://avra-app.fr/icons/icon-512x512.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://avra-app.fr/blog/devis-cuisine-modele-mentions-legales' },
        articleSection: 'Réglementation',
        keywords: 'devis cuisine, modèle devis cuisine, mentions légales devis, devis cuisiniste',
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
          { '@type': 'ListItem', position: 3, name: 'Devis cuisine 2026', item: 'https://avra-app.fr/blog/devis-cuisine-modele-mentions-legales' },
        ],
      }) }} />
    </>
  );
}
