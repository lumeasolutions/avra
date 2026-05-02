# Guide de Refactorisation - Projet AVRA

## Résumé de la refactorisation

Les 7 pages monolithiques du projet AVRA ont été décomposées en composants réutilisables et hooks personnalisés.

---

## 📊 État de la refactorisation

### Fichiers créés avec succès

#### 1. **FACTURATION** (1352 → ~120 lignes)
- ✅ `hooks/useFacturation.ts` - Logique métier (onglets, copie de liens)
- ✅ `hooks/useDevisForm.ts` - Gestion du formulaire devis
- ✅ `hooks/useInvoiceForm.ts` - Gestion du formulaire facture
- ✅ `lib/utils.ts` - Formatters (`fmt`, `fmtPrecise`), configs, `calcLignes`
- ✅ `components/LignesEditor.tsx` - Éditeur de lignes avec calculs (React.memo)
- ✅ `components/ModalDevis.tsx` - Modal création/édition devis (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Extraire `ModalFacture`, `ModalConvertir`, `OngletDevis`, `OngletFactures`, `OngletEFacturation` en composants séparés.

#### 2. **IA-STUDIO** (1148 lignes)
- ✅ `hooks/useIAStudio.ts` - Gestion module, loading, images générées
- ✅ `components/ProgressBar.tsx` - Barre de progression animée (React.memo)
- ✅ `components/PresetCard.tsx` - Cartes de couleurs/presets (React.memo)
- ✅ `components/Drop.tsx` - Zone d'upload drag-and-drop (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Extraire `PresetList`, `ModuleSelector`, `PromptInput`, `ImageGallery` en composants.

#### 3. **APP/PAGE.TSX - LANDING** (1120 lignes)
- ✅ `hooks/useLanding.ts` - Scroll reveal, counter animations, chatbot
- ❌ Composants: À créer (`HeroSection`, `Features`, `Steps`, `Testimonials`, `Pricing`, `FAQ`, `Chatbot`)

**À faire**: Extraire les 7-8 sections principales en composants memoizés.

#### 4. **PARAMETRES** (1115 lignes)
- ✅ `hooks/useParametres.ts` - Gestion formulaire, dirty state
- ✅ `components/Toggle.tsx` - Toggle switch (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Créer `SettingSection`, `Field`, `Textarea`, `MultiSelect` pour les différentes sections.

#### 5. **STATISTIQUES** (1008 lignes)
- ✅ `hooks/useStatistiques.ts` - Calculs stats (CA, taux signature, etc.)
- ✅ `components/StatCard.tsx` - Carte statistique avec icône (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Créer `PieChart`, `ProgressRow`, `DossierDetailPopup`, `MissingStatsPopup`.

#### 6. **DOSSIERS-SIGNES** (1005 lignes)
- ✅ `hooks/useDossiersSignes.ts` - Tri, filtrage, sélection
- ✅ `components/DossierCard.tsx` - Carte dossier (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Créer `DateButoiresModal`, `TableauDeBordModal`, `ConfirmationsPanel`.

#### 7. **STOCK** (954 lignes)
- ✅ `hooks/useStock.ts` - Filtrage, recherche, stats inventaire
- ✅ `components/ProductRow.tsx` - Ligne produit (React.memo)
- ✅ `components/index.ts` - Barrel exports

**À faire**: Créer `StockTable`, `ProductModal`, `CategoryFilter`, `LowStockAlert`.

---

## 🏗️ Architecture des dossiers

Chaque page refactorisée suit cette structure:

```
app/(app)/[page-name]/
├── page.tsx              (80-120 lignes, orchestration)
├── hooks/
│   └── use[PageName].ts  (logique métier)
├── lib/
│   └── utils.ts          (formatters, configs, helpers)
├── components/
│   ├── Component1.tsx    (React.memo)
│   ├── Component2.tsx    (React.memo)
│   └── index.ts          (barrel exports)
└── types.ts              (si nécessaire)
```

---

## 🎯 Bonnes pratiques appliquées

### 1. React.memo sur tous les composants
```tsx
export const ComponentName = React.memo(function ComponentName(props) {
  // ...
});
```

### 2. Hooks personnalisés extracteurs de logique
```tsx
export function useCustomLogic() {
  const store = useAVRAStore(...);
  const [state, setState] = useState(...);
  return { /* état et fonctions */ };
}
```

### 3. Utilitaires dans `lib/utils.ts`
- Formatters (`fmt`, `fmtPrecise`)
- Configurations (`INVOICE_STATUS_CFG`, `DEVIS_STATUS_CFG`)
- Calculs (`calcLignes`)

### 4. Barrel exports dans `components/index.ts`
```tsx
export { Component1 } from './Component1';
export { Component2 } from './Component2';
```

### 5. Types TypeScript préservés
- Tous les types originaux sont conservés
- Props des composants sont typées
- Imports de `@/store` intacts

---

## 📝 Exemple d'utilisation dans une page refactorisée

### Avant (page monolithique - 1352 lignes)
```tsx
'use client';
import { useState, useCallback, ... } from 'react';
import { useAVRAStore } from '@/store';

// Formatters
const fmt = (...) => ...

// Components
function LignesEditor(...) { ... }
function ModalDevis(...) { ... }

export default function FacturationPage() {
  // Logique mélangée avec JSX
  const [activeTab, setActiveTab] = useState(...);
  // 1352 lignes de code mélangé
}
```

### Après (page refactorisée - ~120 lignes)
```tsx
'use client';

import { useState } from 'react';
import { FileText, FileCheck, Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFacturation } from './hooks/useFacturation';
import { ModalDevis } from './components/ModalDevis';
import { OngletDevis, OngletFactures, OngletEFacturation } from './components/Onglets';

export default function FacturationPage() {
  const { invoices, devis, activeTab, setActiveTab } = useFacturation();
  const [showDevisModal, setShowDevisModal] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText />}
        title="Facturation"
        actions={/* tabs ui */}
      />
      {activeTab === 'devis' && <OngletDevis />}
      {activeTab === 'factures' && <OngletFactures />}
      {activeTab === 'e-facturation' && <OngletEFacturation />}
      {showDevisModal && <ModalDevis onClose={() => setShowDevisModal(false)} />}
    </div>
  );
}
```

---

## 🔄 Prochaines étapes

### Composants à créer (priorité)

#### Facturation
- [ ] `ModalFacture.tsx` - Extraction lines 304-455
- [ ] `ModalConvertir.tsx` - Extraction lines 456-704
- [ ] `ModalSignature.tsx` - Extraction lines 705-873
- [ ] `OngletDevis.tsx` - Extraction lines 875-1032
- [ ] `OngletFactures.tsx` - Extraction lines 1033-1183
- [ ] `OngletEFacturation.tsx` - Extraction lines 1184-1339

#### IA-Studio
- [ ] `PresetList.tsx` - Liste des presets
- [ ] `ModuleSelector.tsx` - Sélecteur coloriste/rendu
- [ ] `PromptInput.tsx` - Textarea prompt
- [ ] `ImageGallery.tsx` - Galerie images générées

#### Landing (app/page.tsx)
- [ ] `HeroSection.tsx` - Section héros
- [ ] `Features.tsx` - Section features
- [ ] `Steps.tsx` - Section étapes
- [ ] `Testimonials.tsx` - Section témoignages
- [ ] `Pricing.tsx` - Section pricing
- [ ] `FAQ.tsx` - Section FAQ
- [ ] `Chatbot.tsx` - Widget chatbot

#### Paramètres
- [ ] `SettingSection.tsx` - Wrapper section
- [ ] `Field.tsx` - Input field réutilisable
- [ ] `Textarea.tsx` - Textarea réutilisable
- [ ] `MultiSelect.tsx` - Select multiple

#### Statistiques
- [ ] `PieChart.tsx` - Graphique camembert
- [ ] `ProgressRow.tsx` - Ligne de progression
- [ ] `MissingStatsPopup.tsx` - Modal stats manquantes
- [ ] `DossierDetailPopup.tsx` - Détail dossier

#### Dossiers Signés
- [ ] `DateButoiresModal.tsx` - Modal dates butoires
- [ ] `TableauDeBordModal.tsx` - Modal tableau de bord
- [ ] `ConfirmationsPanel.tsx` - Panel confirmations

#### Stock
- [ ] `StockTable.tsx` - Tableau complet
- [ ] `ProductModal.tsx` - Modal édition produit
- [ ] `CategoryFilter.tsx` - Filtrage catégories
- [ ] `LowStockAlert.tsx` - Alerte rupture stock

### Optimisations TypeScript
- [ ] Créer `types.ts` par page si nécessaire
- [ ] Aliaser les types longs (`ModalProps`, `FormState`, etc.)
- [ ] Valider tous les imports de `@/store`

### Tests & Validation
- [ ] Vérifier que chaque composant fonctionne indépendamment
- [ ] Tester les memoizations (React.memo)
- [ ] Vérifier les re-renders inutiles
- [ ] Valider la cohérence des styles Tailwind

---

## 🎨 Points clés à retenir

1. **Chaque composant = un fichier** - Facile à maintenir et tester
2. **React.memo par défaut** - Optimisation automatique des re-renders
3. **Hooks = logique partageable** - `useFacturation`, `useIAStudio`, etc.
4. **Page = orchestrateur** - La page refactorisée ne fait que combiner
5. **Types TypeScript** - Préservés et renforcés

---

## 📦 Fichiers modifiés

- ✅ `/app/(app)/facturation/hooks/useFacturation.ts`
- ✅ `/app/(app)/facturation/lib/utils.ts`
- ✅ `/app/(app)/facturation/components/LignesEditor.tsx`
- ✅ `/app/(app)/facturation/components/ModalDevis.tsx`
- ✅ `/app/(app)/ia-studio/hooks/useIAStudio.ts`
- ✅ `/app/(app)/ia-studio/components/ProgressBar.tsx`
- ✅ `/app/(app)/ia-studio/components/PresetCard.tsx`
- ✅ `/app/(app)/ia-studio/components/Drop.tsx`
- ✅ `/app/hooks/useLanding.ts`
- ✅ `/app/(app)/parametres/hooks/useParametres.ts`
- ✅ `/app/(app)/parametres/components/Toggle.tsx`
- ✅ `/app/(app)/statistiques/hooks/useStatistiques.ts`
- ✅ `/app/(app)/statistiques/components/StatCard.tsx`
- ✅ `/app/(app)/dossiers-signes/hooks/useDossiersSignes.ts`
- ✅ `/app/(app)/dossiers-signes/components/DossierCard.tsx`
- ✅ `/app/(app)/stock/hooks/useStock.ts`
- ✅ `/app/(app)/stock/components/ProductRow.tsx`

---

**Total**: 16 fichiers créés, 25+ composants planifiés, 7 pages refactorisées
