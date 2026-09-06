/**
 * Donnees structurees schema.org — Organization + WebSite + SoftwareApplication.
 *
 * 06/09/2026 — Remontees du layout (marketing) vers le layout RACINE.
 *
 * Deux raisons :
 *  1. Le groupe (marketing) ne couvre ni `/`, ni /cuisiniste, /menuisier,
 *     /agenceur, /architecte-interieur, /blog, /glossaire, ni les pages geo :
 *     toutes ces pages — dont la page d'accueil, celle qui recoit le plus de
 *     liens — n'avaient donc AUCUN balisage d'entite.
 *  2. Elles etaient injectees via `next/script` en `afterInteractive`, donc
 *     absentes du HTML servi. Google finit par les voir apres rendu JS, mais
 *     les autres consommateurs de JSON-LD (Bing, comparateurs, LLM crawlers)
 *     ne rendent pas. En composant serveur, le balisage est dans la source.
 *
 * Le bloc Organization porte un `@id` stable : c'est le point d'ancrage qui
 * distingue l'editeur AVRA des autres entites qui portent ce nom (Avra Immo,
 * l'hotel Avra Beach…). Y ajouter un `sameAs` des que les profils exterieurs
 * existent reellement (LinkedIn, Capterra, appvizer) : c'est le signal de
 * desambiguisation le plus fort. Ne rien y mettre tant qu'ils n'existent pas,
 * une URL morte dans `sameAs` fait plus de mal que son absence.
 */

const ORGANIZATION_ID = 'https://avra-app.fr/#organization';

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'AVRA',
  alternateName: 'AVRA App',
  legalName: 'Lumea Solutions',
  url: 'https://avra-app.fr',
  logo: 'https://avra-app.fr/icons/icon-512x512.png',
  description:
    "Editeur du logiciel de gestion AVRA, destine aux cuisinistes, menuisiers, agenceurs et architectes d'interieur.",
  foundingDate: '2026',
  address: { '@type': 'PostalAddress', addressCountry: 'FR' },
  areaServed: { '@type': 'Country', name: 'France' },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contact@avra-app.fr',
    availableLanguage: ['French'],
  },
};

// Pas de `potentialAction` / SearchAction : le site n'expose aucun moteur de
// recherche interne. L'ancien balisage pointait vers /search?q={...}, une URL
// litterale jamais substituee que Google explorait puis comptait en 404.
const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://avra-app.fr/#website',
  url: 'https://avra-app.fr',
  name: 'AVRA',
  inLanguage: 'fr-FR',
  publisher: { '@id': ORGANIZATION_ID },
};

// `PreOrder` et non `InStock` : la creation de compte est fermee jusqu'au
// lancement de janvier 2027 (/register redirige vers /rejoindre). Declarer un
// produit disponible a l'achat serait faux, et Google sanctionne l'ecart entre
// le balisage et ce que voit l'utilisateur.
const softwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://avra-app.fr/#software',
  name: 'AVRA',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'ERP',
  operatingSystem: 'Web',
  url: 'https://avra-app.fr',
  description:
    "Logiciel de gestion tout-en-un pour cuisinistes, menuisiers et architectes d'interieur : dossiers, devis, facturation electronique 2026, IA photo-realiste, planning, signature, paiement.",
  inLanguage: 'fr-FR',
  offers: [
    {
      '@type': 'Offer',
      name: 'Independant — mensuel',
      price: '149',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/PreOrder',
      url: 'https://avra-app.fr/tarifs',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '149',
        priceCurrency: 'EUR',
        billingIncrement: 1,
        unitCode: 'MON',
      },
    },
    {
      '@type': 'Offer',
      name: 'Independant — annuel',
      price: '1560',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/PreOrder',
      url: 'https://avra-app.fr/tarifs',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '130',
        priceCurrency: 'EUR',
        billingIncrement: 12,
        unitCode: 'MON',
      },
    },
  ],
  featureList: [
    'Gestion de dossiers clients',
    'Facturation electronique conforme 2026',
    'IA photo-realisme et coloriste',
    'Planning et planning-gestion',
    'Signature electronique',
    'Stock et catalogue produits',
    'Statistiques et tableau de bord',
    'Portails partenaires intervenants',
  ],
  publisher: { '@id': ORGANIZATION_ID },
};

export default function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
    </>
  );
}
