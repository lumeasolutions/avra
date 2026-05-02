# Guide des Pages Métiers AVRA

## Structure générale

Les 5 pages métiers suivent une architecture cohérente :

```
apps/web/app/
├── (marketing)/
│   ├── metiers/page.tsx        # Page hub — recommande les 4 métiers
│   ├── components/
│   │   ├── Nav.tsx             # Navigation principale
│   │   ├── Footer.tsx          # Pied de page
│   │   └── ScrollReveal.tsx    # Animations au scroll
│   └── marketing.css           # Design system CSS
├── cuisiniste/page.tsx         # Page dédiée cuisiniste
├── menuisier/page.tsx          # Page dédiée menuisier
├── architecte-interieur/page.tsx  # Page dédiée architecte
└── agenceur/page.tsx           # Page dédiée agenceur
```

## Conventions utilisées

### Imports

Pour les pages **métier** (cuisiniste, menuisier, etc.) :
```typescript
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import '../(marketing)/marketing.css';
```

Pour la page **hub** (/metiers) :
```typescript
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
```

### Métadonnées

Chaque page exporte une Metadata unique :
```typescript
export const metadata: Metadata = {
  title: '...',
  description: '...',
  alternates: { canonical: 'https://avra.fr/...' },
  openGraph: { ... },
};
```

### JSON-LD

Chaque page **métier** contient un JSON-LD `SoftwareApplication` :
```typescript
<script type="application/ld+json" dangerouslySetInnerHTML={{ __json: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AVRA — Logiciel [métier]',
  targetAudience: {
    '@type': 'Audience',
    audienceType: '[métier]',
  },
  // ... autres champs
}) }} />
```

## Architecture des sections

### Page Hub (/metiers)

1. **Hero**
   - Titre : "Un logiciel pensé pour votre métier"
   - 4 badges/links vers les pages métiers

2. **Grille métiers**
   - 4 cartes (2x2 desktop, 1 colonne mobile)
   - Chaque carte avec icône, titre, sous-titre
   - Lien "En savoir plus →"

3. **Section commune**
   - "Ce qui est commun à tous"
   - 4 fonctionnalités universelles
   - Avec icônes Check

4. **CTA final**
   - Boutons : "Essai gratuit" + "Témoignages"

### Page Métier (exemple /cuisiniste)

1. **Hero**
   - Badge "Pour les [métier]"
   - H1 accrocheur
   - CTA primaire
   - Couleur gradient vert

2. **Problèmes typiques**
   - Section blanche
   - Titre : "Vous reconnaissez-vous ?"
   - 4 cartes avec icône, titre, description
   - Icônes significatives du métier

3. **Solutions AVRA**
   - Section crème
   - Titre : "Votre allié digital"
   - 4 features (2x2 grid) avec :
     - Icône dans cadre doré
     - Titre H3
     - Description
     - 4 sous-points avec Check

4. **Section spécialisée**
   - Diffère selon le métier
   - Exemple : "IA Studio" pour cuisiniste
   - 2 colonnes : texte + mockup/image

5. **Témoignage**
   - Section fond vert (dark)
   - Citation en italique
   - Auteur + rôle
   - Styling quote icon

6. **CTA final**
   - Fond gradient vert
   - H2 + description
   - 2 boutons : primaire + secondaire

7. **Internal links**
   - Liens vers autres métiers
   - Lien vers page hub
   - Boutons outline

## Icônes Lucide React utilisées

### Page Hub
- `ChefHat` — Cuisiniste
- `Hammer` — Menuisier
- `Pencil` — Architecte d'intérieur
- `Layout` — Agenceur
- `Check` — Fonctionnalités communes

### Pages Métiers

**Cuisiniste :**
- `Clock`, `FileX`, `Users`, `TrendingDown` — Problèmes
- `Ruler`, `Truck`, `Calendar`, `Sparkles` — Solutions
- `Quote` — Témoignage

**Menuisier :**
- `FileCheck`, `Package`, `Clock`, `DollarSign` — Problèmes
- `Layers`, `AlertCircle`, `BarChart3`, `Package2` — Solutions
- `Quote` — Témoignage

**Architecte d'intérieur :**
- `Folder`, `TrendingUp`, `DollarSign`, `Users` — Problèmes
- `PaletteIcon`, `DollarSign`, `FileText`, `Share2` — Solutions
- `Quote` — Témoignage

**Agenceur :**
- `Building2`, `BarChart3`, `Network`, `ClipboardList` — Problèmes
- `MapPin`, `BarChart3`, `Network`, `Zap` — Solutions
- `Quote` — Témoignage

## Classes CSS principales

De `marketing.css` :
- `.section` — Padding 100px 5%
- `.container` — Max-width 1200px, margin auto
- `.btn-primary` — Bouton or avec gradient
- `.btn-secondary` — Bouton blanc transparent
- `.btn-outline` — Bouton outline vert
- `.card` — Fond blanc, ombre, border
- `.section-label` — Badge or/crème
- `.reveal` — Animation scroll reveal

## Styles inline importants

### Couleurs
```typescript
// Vert gradient (hero, CTA final)
background: 'linear-gradient(135deg, var(--green-deep) 0%, var(--green) 100%)'

// Fond crème
background: 'var(--cream-light)'

// Icones
color: 'var(--gold)'
```

### Typography
```typescript
// H1
fontSize: 'clamp(2.2rem, 5.5vw, 4rem)'
fontWeight: 800

// H2
fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)'
fontWeight: 700

// H3
fontSize: '1.2rem'
fontWeight: 600
```

### Layout
```typescript
// Grid 4 colonnes responsive
display: 'grid'
gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
gap: '24px'

// 2 colonnes équilibrées
gridTemplateColumns: '1fr 1fr'
gap: '60px'
alignItems: 'center'
```

## Responsive design

Tous les grids utilisent `repeat(auto-fit, minmax(...))` pour automatiquement :
- **Desktop** : 4 colonnes ou 2x2 grid
- **Tablette** : 2-3 colonnes
- **Mobile** : 1 colonne

Les valeurs `minmax` varient par section :
- Cartes métiers : `minmax(260px, 1fr)`
- Problèmes : `minmax(240px, 1fr)`
- Solutions : grid 2 colonnes fixe

## SEO et metadata

### Titre (55-60 caractères max)
Exemples :
- "Logiciel cuisiniste — Gérez vos projets cuisine de A à Z avec AVRA"
- "Logiciel menuisier — Devis, planning et facturation pour menuisiers"

### Description (155-160 caractères max)
Exemples :
- "AVRA est le logiciel pensé pour les cuisinistes : devis sur mesure, plans, commandes fournisseurs, planification des poses, rendus IA FLUX Pro. Essai gratuit 14j."

### Canonical URL
```typescript
alternates: { canonical: 'https://avra.fr/[slug]' }
```

### OpenGraph
```typescript
openGraph: {
  title: '...',
  description: '...',
  url: 'https://avra.fr/[slug]',
}
```

## CTA et copy

### CTA primaire
Toujours : **"Essai gratuit 14 jours →"** ou **"Commencer l'essai gratuit 14 jours →"**

### CTA secondaire
Optionnel : "Voir comment ça marche", "Lire les témoignages"

### Tagline métier
Exemple cuisiniste : "Le logiciel qui libère les cuisinistes des tâches administratives"

### Section problèmes
Titre : **"Vous reconnaissez-vous ?"**

### Section solutions
Titre : **"Votre allié digital"**

## Témoignages

Structure :
```typescript
{
  text: "Citation du client...",
  author: "Prénom Nom",
  role: "Titre professionnel, Ville"
}
```

Clients utilisés :
- Cuisiniste : Pierre M., Bordeaux
- Menuisier : Julien T., Nantes
- Architecte : Amélie F., Paris
- Agenceur : Nathalie P., Marseille

## Navigation interne

Chaque page métier linke vers :
1. `/cuisiniste`
2. `/menuisier`
3. `/architecte-interieur`
4. `/agenceur`
5. `/metiers` (page hub)

Format button :
```typescript
<a href="/[métier]">
  <button className="btn-outline" style={{ width: '100%', ... }}>
    {label}
  </button>
</a>
```

## Performance et accessibilité

- Toutes les icônes ont `strokeWidth={1.5}` pour lisibilité
- Images/mockups placeholder avec gradient et opacity
- Alt text implicite via structure sémantique H1-H3
- Contraste couleur validé (or sur vert = bon contraste)
- Mobile-first responsive design

## Maintenance et mises à jour

Pour modifier une page métier :

1. Garder la structure (hero → problèmes → solutions → CTA)
2. Maintenir les mêmes icônes Lucide React
3. Mettre à jour metadata et canonical URL
4. Mettre à jour JSON-LD targetAudience
5. Vérifier les internal links vers autres métiers
6. Tester la responsive sur mobile

Pour ajouter un nouveau métier :

1. Créer `/apps/web/app/[nouveau-metier]/page.tsx`
2. Copier structure d'une page existante
3. Adapter le contenu pour le métier
4. Ajouter les icônes Lucide React adaptées
5. Créer metadata SEO unique
6. Ajouter JSON-LD SoftwareApplication
7. Ajouter la carte à la page hub `/metiers`
8. Ajouter les liens internes

## Validation

Avant de merger :
- [ ] Code TypeScript sans erreurs
- [ ] Imports corrects
- [ ] Metadata exportée
- [ ] JSON-LD valide
- [ ] Aucun emoji (Lucide React only)
- [ ] Responsive design testé
- [ ] Links fonctionnels
- [ ] CTA visibles et cliquables
