# Code Splitting Implementation - Projet Avra

## Vue d'ensemble

Ce document décrit l'implémentation du code splitting avec `next/dynamic()` pour optimiser les performances du bundle JavaScript de l'application Avra.

## Modifications Effectuées

### 1. Layout Principal : `/app/(app)/layout.tsx`

**Objectif** : Rendre les composants AsAsistant (FAB et Panel) chargés de manière lazy pour réduire le bundle initial.

**Changements** :
```tsx
import dynamic from 'next/dynamic';

/* Dynamic import pour code splitting */
const AssistantFAB = dynamic(
  () => import('@/components/layout/AssistantFAB').then(mod => mod.AssistantFAB),
  { ssr: false, loading: () => null }
);

/* Dynamic import pour code splitting */
const AssistantPanel = dynamic(
  () => import('@/components/layout/AssistantPanel').then(mod => mod.AssistantPanel),
  { ssr: false, loading: () => null }
);
```

**Raison** : AssistantFAB et AssistantPanel sont des composants côté client lourds qui ne sont pas critiques au premier rendu.

---

### 2. Page Facturation : `/app/(app)/facturation/page.tsx`

**Objectif** : Extraire les modales lourdes et les charger dynamiquement.

**Modales refactorisées** :
1. **ModalFacture** - Formulaire création facture
2. **ModalConvertir** - Conversion devis → facture
3. **ModalSignature** - Gestion signature électronique

**Changements** :
```tsx
import dynamic from 'next/dynamic';
import { ModalDevis } from './components/ModalDevis';

/* Dynamic import pour code splitting */
const ModalFactureLoading = () => <div className="animate-pulse bg-gray-100 rounded h-96" />;
const ModalFacture = dynamic(
  () => import('./components/ModalFacture').then(mod => mod.ModalFacture),
  { ssr: false, loading: ModalFactureLoading }
);

/* Dynamic import pour code splitting */
const ModalConvertir = dynamic(
  () => import('./components/ModalConvertir').then(mod => mod.ModalConvertir),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 rounded h-96" /> }
);

/* Dynamic import pour code splitting */
const ModalSignature = dynamic(
  () => import('./components/ModalSignature').then(mod => mod.ModalSignature),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 rounded h-96" /> }
);
```

---

### 3. Nouveaux Fichiers Créés

#### `/app/(app)/facturation/components/ModalFacture.tsx`
- Formulaire de création de facture
- Import: `useDossierStore` pour l'état
- Export: `ModalFacture` (named export)
- Loading state: animate-pulse skeleton

#### `/app/(app)/facturation/components/ModalConvertir.tsx`
- Modal conversion devis → facture
- Sélection du type de facture et du pourcentage
- Export: `ModalConvertir` (named export)

#### `/app/(app)/facturation/components/ModalSignature.tsx`
- Gestion signature électronique
- Email client, pièces jointes, message
- Export: `ModalSignature` (named export)

#### Mise à jour `/app/(app)/facturation/components/index.ts`
```tsx
export { LignesEditor } from './LignesEditor';
export { ModalDevis } from './ModalDevis';
export { ModalFacture } from './ModalFacture';
export { ModalConvertir } from './ModalConvertir';
export { ModalSignature } from './ModalSignature';
```

---

## Patterns Utilisés

### Named Exports + Dynamic Import

Pour les composants avec named exports :
```tsx
const Component = dynamic(
  () => import('./Component').then(mod => mod.ComponentName),
  { ssr: false, loading: () => <LoadingComponent /> }
);
```

### Loading States

Tous les composants dynamiques lourds ont un loading state :
```tsx
const ModalLoadingState = () => (
  <div className="animate-pulse bg-gray-100 rounded h-96" />
);
```

### SSR Configuration

- `ssr: false` pour tous les composants lourds (pas nécessaires au serveur)
- Réduit le bundle server-side
- Les composants sont hydratés côté client uniquement

---

## Bénéfices

1. **Réduction du bundle initial**
   - AssistantFAB/Panel ne chargés que si nécessaire
   - Modales factures chargées lazy au clic

2. **Meilleure performance**
   - First Paint réduit
   - Time to Interactive amélioré
   - Moins de JavaScript à parser au chargement

3. **Code mieux organisé**
   - Modales extraites en composants séparés
   - Plus facile à maintenir et tester
   - Séparation des responsabilités

4. **Pas de rupture UX**
   - Loading states smooth avec animations
   - Pas de flickering
   - Transitions fluides

---

## Fichiers Affectés

```
Modified:
- /app/(app)/layout.tsx
- /app/(app)/facturation/page.tsx
- /app/(app)/facturation/components/index.ts

Created:
- /app/(app)/facturation/components/ModalFacture.tsx
- /app/(app)/facturation/components/ModalConvertir.tsx
- /app/(app)/facturation/components/ModalSignature.tsx
```

---

## Recommandations Futures

1. **ia-studio** : Extraire les composants de rendu lourd
2. **statistiques** : Lazy load les calculs complexes
3. **parametres** : Dynamic imports pour les formulaires lourds
4. **Monitoring** : Ajouter Web Vitals pour mesurer l'impact réel

---

## Checklist de Vérification

- [x] Imports dynamiques avec `.then(mod => mod.ComponentName)`
- [x] `ssr: false` pour tous les composants lourds
- [x] Loading states appropriés (animate-pulse)
- [x] Named exports sur tous les composants dynamiques
- [x] Commentaires /* Dynamic import pour code splitting */
- [x] Pas de rupture de navigation existante
- [x] Pas de régression fonctionnelle

---

## Notes Techniques

- Utilisé `React.memo()` sur les modales pour éviter re-renders inutiles
- Les modales sont chargées lors du `.then()` dynamiquement
- Loading states utilisent Tailwind `animate-pulse` pour cohérence visuelle
- Tous les composants restent compatibles avec les props existantes
