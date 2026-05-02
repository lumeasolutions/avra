# AVRA - ACTIONS IMMÉDIATES (QUICK WINS)

## Top 3 Priorités - Gain 40-50% en 3-4 jours

### 1️⃣ EXTRAIRE IMAGES BASE64 (2-3h)

**Fichiers à traiter:**
```
components/layout/Sidebar.tsx       → 44.6 KB
components/layout/AssistantPanel.tsx → 63.9 KB
components/layout/AlertsPanel.tsx   → 63.9 KB
components/layout/AssistantFAB.tsx  → 19.2 KB
TOTAL: 191.6 KB enlevés du bundle JS
```

**Procédure:**
```bash
# 1. Créer dossier images
mkdir -p apps/web/public/images

# 2. Extraire base64 vers fichiers (outil en ligne ou Node script)
# Exemple: node script/extractBase64.js components/layout/Sidebar.tsx

# 3. Remplacer dans Sidebar.tsx (ligne ~37):
# ❌ const OWL_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
# ✅ Importer avec next/image

import Image from 'next/image';
import sidebarOwl from '@/public/images/sidebar-owl.jpg';

# 4. Utiliser dans JSX:
<Image
  src={sidebarOwl}
  alt="Sidebar owl"
  width={400}
  height={900}
  priority={false}
/>

# 5. Répéter pour 3 autres fichiers
```

**Résultat:** Bundle JS: -191 KB, FCP: -200-300ms

---

### 2️⃣ AJOUTER CODE SPLITTING DYNAMIQUE (1-2 jours)

**Cibles (pages 1000+ lignes):**
```
facturation/page.tsx    → 1351 lignes → 3-4 dynamic() imports
ia-studio/page.tsx      → 1147 lignes → 2-3 dynamic() imports
statistiques/page.tsx   → 1007 lignes → 2 dynamic() imports
parametres/page.tsx     → 1114 lignes → 2 dynamic() imports
dossiers-signes/page.tsx → 1004 lignes → 1 dynamic() import
```

**Exemple (facturation/page.tsx):**

```typescript
// apps/web/app/(app)/facturation/page.tsx

'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

// ✅ Code split les modales et tabs lourds
const InvoiceForm = dynamic(() => import('./components/InvoiceForm'), {
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse" />,
  ssr: false,
});

const DevisModal = dynamic(() => import('./components/DevisModal'), {
  loading: () => null,
  ssr: false,
});

const InvoiceList = dynamic(() => import('./components/InvoiceList'), {
  loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" />,
});

export default function FacturationPage() {
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Facturation" />

      <Suspense fallback={<div>Chargement...</div>}>
        {showForm && <InvoiceForm />}
      </Suspense>

      {showModal && <DevisModal />}

      <InvoiceList />
    </div>
  );
}
```

**Créer composant séparé (components/InvoiceForm.tsx):**
```typescript
// apps/web/app/(app)/facturation/components/InvoiceForm.tsx
'use client';

// Déplacer la logique complexe ici (300+ lignes)
export default function InvoiceForm() {
  // ... le contenu du formulaire
}
```

**Résultat:** Bundle initial: -40-50%, FCP: -500-1000ms

---

### 3️⃣ OPTIMISER PRISMA QUERIES (1-2 jours)

**Stratégie:** Remplacer `include: { relation: true }` par `select:` ciblé

**Exemple 1 (projects/projects.service.ts, ligne 81-90):**

```typescript
// ❌ AVANT
async findOne(workspaceId: string, id: string) {
  return this.prisma.project.findFirst({
    where: { id, workspaceId },
    include: {
      client: true,  // Charge 50+ champs du client
      owner: { select: { id: true, firstName: true, lastName: true } },
      folders: { orderBy: { position: 'asc' } },  // Toute la structure
      documents: { take: 50 },
      projectIntervenants: { include: { intervenant: true } },  // Entité complète
    },
  });
}

// ✅ APRÈS (select ciblé)
async findOne(workspaceId: string, id: string) {
  return this.prisma.project.findFirst({
    where: { id, workspaceId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      owner: { select: { id: true, firstName: true, lastName: true } },
      folders: {
        select: {
          id: true,
          name: true,
          position: true,
        },
        orderBy: { position: 'asc' },
      },
      documents: {
        select: {
          id: true,
          title: true,
          kind: true,
          createdAt: true,
        },
        take: 50,
      },
      projectIntervenants: {
        select: {
          id: true,
          intervenant: {
            select: {
              id: true,
              companyName: true,
              type: true,
            },
          },
        },
      },
    },
  });
}
```

**Services à mettre à jour (tous):**
1. `modules/projects/projects.service.ts` (5 queries)
2. `modules/clients/clients.service.ts` (1 query)
3. `modules/intervenants/intervenants.service.ts` (1 query)
4. `modules/orders/orders.service.ts` (3 queries)
5. `modules/payments/payments.service.ts` (2 queries)
6. `modules/documents/documents.service.ts` (1 query)
7. ... +8 autres services

**Checklist:**
```bash
# 1. Ouvrir chaque service
# 2. Identifier les include: { relation: true }
# 3. Remplacer par select: { field1: true, field2: true, ... }
# 4. Tester: npm run test (ou tester manuellement)
# 5. Comparer metrics: time avant/après
```

**Résultat:** API response: -60%, DB CPU: -70%, bandwidth: -60%

---

## Actions Phase 2 (Semaine 2)

### 4️⃣ React.memo sur 20 composants critiques (1 jour)

**Top composants à wrapper:**
```typescript
// components/layout/PageHeader.tsx
export const PageHeader = memo(function PageHeader({ icon, title, subtitle }) {
  return (...);
});

// components/layout/Topbar.tsx
export const Topbar = memo(function Topbar() { return (...); });

// components/planning/PlanningCalendar.tsx
export const PlanningCalendar = memo(function PlanningCalendar({ events }) {
  return (...);
});

// components/KPICard.tsx (créer)
export const KPICard = memo(function KPICard({ k }) {
  return (...);
});

// ... etc
```

### 5️⃣ Redis cache pour endpoints stats (1 jour)

```typescript
// modules/stats/stats.service.ts
async getGlobal(workspaceId: string) {
  const cacheKey = `stats-global:${workspaceId}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  // Calcul...
  const result = { ... };

  await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}
```

**Installation Redis (Docker):**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Checklist d'Implémentation

- [ ] **Jour 1:** Extraire 4 images base64
  - [ ] Sidebar.tsx
  - [ ] AssistantPanel.tsx
  - [ ] AlertsPanel.tsx
  - [ ] AssistantFAB.tsx

- [ ] **Jour 2:** Ajouter dynamic() sur pages 1000+ lignes
  - [ ] facturation/page.tsx
  - [ ] ia-studio/page.tsx
  - [ ] statistiques/page.tsx
  - [ ] parametres/page.tsx

- [ ] **Jour 3:** Créer composants séparés pour chaque page

- [ ] **Jour 4-5:** Optimiser Prisma queries (15 services)
  - [ ] projects.service.ts
  - [ ] clients.service.ts
  - [ ] intervenants.service.ts
  - [ ] ... (liste complète dans audit)

---

## Métriques à Tracker

Avant chaque action, exécuter:
```bash
# Mesurer bundle
npm run build
ls -lh .next/static/chunks/

# PageSpeed local (Lighthouse)
npm run build && npm start
# Ouvrir http://localhost:3000 dans Chrome Lighthouse

# API Performance (simpler)
curl -w "Time: %{time_total}s\n" http://localhost:3001/api/stats/global
```

**Cibles:**
```
Before: Bundle ~800KB, FCP ~2s
After Phase 1: Bundle ~400KB, FCP ~0.8s
```

---

## Ressources Utiles

- Extraction base64: https://www.base64decode.org/ (ou Node script)
- Next.js dynamic: https://nextjs.org/docs/advanced-features/dynamic-import
- React.memo: https://react.dev/reference/react/memo
- Prisma select: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#select
- NestJS cache: https://docs.nestjs.com/techniques/caching

---

## Support d'Implémentation

Pour chaque fichier modifié:
1. Créer branche feature: `git checkout -b perf/extract-base64`
2. Faire changements
3. Tester localement: `npm run dev`
4. Commit: `git commit -m "perf: extract base64 images to static files"`
5. PR pour revue

---

**Durée totale Phase 1+2:** ~3-5 jours
**Gain attendu:** 40-50% plus rapide
**Impact utilisateur:** UX fluidité, chargement instantané
