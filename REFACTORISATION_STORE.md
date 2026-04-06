# Refactorisation du Store Zustand - AVRA

## Vue d'ensemble

Le store monolithique `useAVRAStore.ts` (1387 lignes) a été refactorisé en **8 stores spécialisés** organisés par domaine métier, suivant les best practices Zustand.

## Structure avant et après

### AVANT
```typescript
import { useAVRAStore } from '@/store/useAVRAStore';

const { dossiers, factures, planning, stock } = useAVRAStore();
```

### APRÈS
```typescript
import {
  useDossierStore,
  useFacturationStore,
  usePlanningStore,
  useStockStore
} from '@/store';

const dossiers = useDossierStore(state => state.dossiers);
const invoices = useFacturationStore(state => state.invoices);
const planningEvents = usePlanningStore(state => state.planningEvents);
const stockItems = useStockStore(state => state.stockItems);
```

## Nouveaux stores créés

### 1. **useDossierStore.ts** (11.7 KB)
**Responsabilité:** Gestion des dossiers clients (état ET signés ET perdus)

**Données:**
- `dossiers`: Dossiers en cours de vente
- `dossiersSignes`: Dossiers signés avec suivis
- `dossiersPerdus`: Dossiers perdus
- `datesButoiresSignes`: Dates limite par dossier
- `confirmations`: Confirmations fournisseurs par dossier

**Actions principales:**
- `addDossier()`, `updateDossierStatus()`, `updateDossierNotes()`
- `signerDossier()`, `perdreDossier()`
- `addSubfolder()`, `updateDossierSigneDateButoires()`
- Gestion des confirmations fournisseurs (Point 8)

**Persistance:** `avra-dossier-store`

---

### 2. **useFacturationStore.ts** (16.3 KB)
**Responsabilité:** Devis, factures, paiements, apporteurs d'affaires

**Données:**
- `invoices`: Factures simple
- `invoiceDetails`: Factures détaillées (avec lignes)
- `devis`: Devis
- `payments`: Paiements reçus
- `apporteurs`: Apporteurs d'affaires (Point 2)
- Compteurs: `_invoiceCounter`, `_devisCounter`

**Actions principales:**
- Factures: `addInvoice()`, `addInvoiceDetail()`, `updateInvoiceStatus()`, `deleteInvoice()`
- Devis: `addDevis()`, `updateDevisStatut()`, `sendDevisForSignature()`, `markDevisSigned()`, `convertDevisToFacture()`
- Paiements: `addPayment()`, `updatePaymentStatus()`
- Apporteurs: `addApporteur()`, `updateApporteur()`, `toggleApporteurActif()`

**Persistance:** `avra-facturation-store`

---

### 3. **usePlanningStore.ts** (3.5 KB)
**Responsabilité:** Événements de planning et gestion de chantier

**Données:**
- `planningEvents`: Événements planning classique
- `gestEvents`: Événements de gestion de chantier (pose, livraison, électricien, etc.)

**Actions principales:**
- `addPlanningEvent()`, `deletePlanningEvent()`
- `addGestEvent()`, `deleteGestEvent()`

**Persistance:** `avra-planning-store`

---

### 4. **useStockStore.ts** (5.4 KB)
**Responsabilité:** Gestion des stocks et commandes fournisseurs

**Données:**
- `stockItems`: Articles en stock
- `commandes`: Commandes passées aux fournisseurs

**Actions principales:**
- Stock: `addStockItem()`, `updateStockDot()`, `updateStockItem()`, `deleteStockItem()`
- Commandes: `addCommande()`, `updateCommandeStatut()`, `deleteCommande()`

**Persistance:** `avra-stock-store`

---

### 5. **useIntervenantStore.ts** (3.3 KB)
**Responsabilité:** Poseurs, électriciens, maçons et autres intervenants

**Données:**
- `intervenants`: Liste des intervenants avec leurs dossiers

**Actions principales:**
- `addIntervenant()`, `removeIntervenant()`, `updateIntervenant()`
- `updateIntervenantDossierStatut()`

**Persistance:** `avra-intervenant-store`

---

### 6. **useUIStore.ts** (2.7 KB)
**Responsabilité:** États d'interface utilisateur

**Données:**
- `alerts`: Alertes système (limite 20)
- `sidebarOpen`: État de la sidebar
- `modalOpen`: Modale ouverte actuellement

**Actions principales:**
- Alertes: `addAlert()`, `dismissAlert()`
- UI: `toggleSidebar()`, `setSidebarOpen()`, `openModal()`, `closeModal()`

**Persistance:** NON persisté (interface state)

---

### 7. **useConfigStore.ts** (6.9 KB)
**Responsabilité:** Configuration générale, paramètres, société, équipe

**Données:**
- `societe`: Infos entreprise
- `preferences`: Langue, devise, format date
- `numerotation`: Préfixes et compteurs (F-, D-, AV-)
- `facturationConfig`: Conditions paiement, mentions légales, IBAN
- `notifConfig`: Notifications (email, SMS)
- `relanceConfig`: Délais de relance (acompte, solde)
- `members`: Équipe (ADMIN, VENDEUR, POSEUR)

**Actions principales:**
- `updateSociete()`, `updatePreferences()`, `updateNumerotation()`
- `updateFacturationConfig()`, `updateNotifConfig()`, `updateRelanceConfig()`
- Membres: `addMember()`, `toggleMemberActive()`, `removeMember()`, `updateMemberRole()`

**Persistance:** `avra-config-store`

---

### 8. **useHistoryStore.ts** (7.8 KB)
**Responsabilité:** Logs d'activité et système de relances

**Données:**
- `historyLogs`: Historique des actions (max 50 logs)
- `relances`: Relances automatiques + manuelles

**Actions principales:**
- Logs: `addLog()`
- Relances: `addRelance()`, `resolveRelance()`, `snoozeRelance()`
- `getActiveRelances()`, `checkAndCreateRelances(dossiersSignes)`

**Persistance:** `avra-history-store`

---

## index.ts - Point d'entrée unique

```typescript
// imports de tous les stores
export { useDossierStore } from './useDossierStore';
export { useFacturationStore } from './useFacturationStore';
// ... etc

// Réexport de tous les types
export type { Dossier, DossierSigne, DossierStatus } from './useDossierStore';
export type { Invoice, Devis, Payment } from './useFacturationStore';
// ... etc
```

**Usage:**
```typescript
import { useDossierStore, useFacturationStore } from '@/store';
```

---

## Fichiers mis à jour (31 fichiers)

### Pages principales
- ✓ `/app/(app)/dossiers/page.tsx`
- ✓ `/app/(app)/dossiers/nouveau/page.tsx`
- ✓ `/app/(app)/dossiers/[id]/page.tsx`
- ✓ `/app/(app)/dossiers-signes/page.tsx`
- ✓ `/app/(app)/facturation/page.tsx`
- ✓ `/app/(app)/stock/page.tsx`
- ✓ `/app/(app)/planning/page.tsx`
- ✓ `/app/(app)/planning-gestion/page.tsx`
- ✓ `/app/(app)/intervenants/page.tsx`
- ✓ `/app/(app)/epaiement/page.tsx`
- ✓ `/app/(app)/parametres/page.tsx`
- ✓ `/app/(app)/historique/page.tsx`
- ✓ `/app/(app)/dashboard/page.tsx`
- ✓ `/app/(app)/assistant/page.tsx`
- ✓ `/app/(app)/ia-studio/page.tsx`
- ✓ `/app/(app)/statistiques/page.tsx`
- ✓ `/app/(app)/portail-architecte/page.tsx`
- ✓ `/app/(app)/portail-cuisiniste/page.tsx`
- ✓ `/app/(app)/portail-menuisier/page.tsx`

### Composants et hooks
- ✓ `/components/layout/AlertsPanel.tsx`
- ✓ `/components/layout/Sidebar.tsx`
- ✓ `/components/layout/AssistantPanel.tsx`
- ✓ `/app/(app)/dossiers-signes/hooks/useDossiersSignes.ts`
- ✓ `/app/(app)/facturation/components/ModalDevis.tsx`
- ✓ `/app/(app)/facturation/hooks/useFacturation.ts`
- ✓ `/app/(app)/ia-studio/hooks/useIAStudio.ts`
- ✓ `/app/(app)/parametres/hooks/useParametres.ts`
- ✓ `/app/(app)/stock/hooks/useStock.ts`
- ✓ `/app/(app)/statistiques/hooks/useStatistiques.ts`
- ✓ `/hooks/useRelanceEngine.ts`

---

## Avantages de la refactorisation

### 1. **Séparation des préoccupations**
- Chaque store gère un domaine métier spécifique
- Logique métier centralisée et facile à trouver
- Moins de dépendances intra-store

### 2. **Performance améliorée**
- Les composants ne s'abonnent qu'aux données qu'ils utilisent
- Moins de re-rendus inutiles
- Chaque store a sa propre personne de localStorage

### 3. **Maintenabilité**
- Code plus petit et plus facile à comprendre
- Localisation rapide des fonctionnalités
- Tests unitaires plus simples

### 4. **Évolutivité**
- Facile d'ajouter de nouvelles actions par domaine
- Possible de refactoriser chaque store indépendamment
- Réutilisation des patterns à travers les stores

### 5. **Typage TypeScript fort**
- Types isolés par domaine
- Moins de conicts de noms de types
- IntelliSense plus précis

---

## Patterns utilisés

### Pattern Zustand standard
```typescript
interface MyState {
  data: Data[];
  actions: Action;
}

export const useMyStore = create<MyState>()(
  persist(
    (set, get) => ({
      data: INITIAL_DATA,
      actions: (payload) => {
        // modify state
        set(s => ({ data: [...] }));
      }
    }),
    { name: 'my-store-key' }
  )
);
```

### Selectors recommandés
```typescript
// Pour un seul champ
const dossiers = useDossierStore(state => state.dossiers);

// Pour plusieurs champs (faire un useShallow si réactivity très sensible)
const { dossiers, addDossier } = useDossierStore(state => ({
  dossiers: state.dossiers,
  addDossier: state.addDossier,
}));
```

---

## Backup de l'ancien store

L'ancien store monolithique a été conservé en tant que sauvegarde:
- **Chemin:** `/apps/web/store/useAVRAStore.old.ts`
- **Statut:** Sauvegarde de référence (ne pas utiliser en production)

---

## Points d'amélioration futurs

1. **Middleware de logging**
   - Ajouter zustand middleware pour tracer les actions

2. **Sérialisation personnalisée**
   - Gérer les dates comme objets Date au lieu de strings

3. **Validations de schéma**
   - Ajouter Zod pour valider les données persistes

4. **Immer intégration**
   - Utiliser Immer pour mutations implicites

5. **Subscriptions avancées**
   - useShallow pour les sélections complexes
   - useReactiveSubscriptions pour les patterns réactifs

---

## Checklist de validation

- [x] Tous les stores créés avec le bon domaine métier
- [x] Toutes les données migrées sans perte
- [x] Tous les actions migrées correctement
- [x] Persistance localStorage configurée par store
- [x] Types TypeScript exportés depuis index.ts
- [x] Tous les 31 fichiers clients mis à jour
- [x] Pas de traces de `useAVRAStore` en production
- [x] Backup de l'ancien store préservé
- [x] Tests compilent sans erreur

---

## Comment utiliser les nouveaux stores

### Import
```typescript
import {
  useDossierStore,
  useFacturationStore,
  useConfigStore,
  // ... autres stores au besoin
} from '@/store';
```

### Utilisation dans un composant React
```typescript
export default function MyComponent() {
  // Sélectionner les données dont vous avez besoin
  const dossiers = useDossierStore(state => state.dossiers);
  const addDossier = useDossierStore(state => state.addDossier);
  const invoices = useFacturationStore(state => state.invoices);

  return (
    <div>
      {dossiers.map(d => (...))}
    </div>
  );
}
```

### Utilisation dans un hook custom
```typescript
export function useMyLogic() {
  const dossiers = useDossierStore(state => state.dossiers);
  const updateStatus = useDossierStore(state => state.updateDossierStatus);
  const devis = useFacturationStore(state => state.devis);

  // Votre logique ici...
  return { /* ... */ };
}
```

---

## Conclusion

La refactorisation est **terminée et fonctionnelle**. L'application maintient la même fonctionnalité tout en gagnant en clarté, maintenabilité et performance. Le code est maintenant prêt pour des améliorations futures et l'ajout de nouvelles fonctionnalités.

**Taille totale:** ~65 KB (stores) vs 62 KB (ancien store) - la structure domine maintenant la taille
