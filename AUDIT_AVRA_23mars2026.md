# AUDIT COMPLET DU PROJET AVRA
> Rapport d'audit technique — 23 mars 2026

---

## 1. ÉTAT GÉNÉRAL DU PROJET

**AVRA** est un ERP SaaS pour professionnels de l'agencement (cuisinistes, architectes d'intérieur, menuisiers, agenceurs). Le projet est structuré en **monorepo Turborepo** avec deux applications : une API NestJS et un frontend Next.js 14.

### Diagnostic global

| Dimension | État | Note |
|---|---|---|
| Architecture & structure | ✅ Solide | /10 → **8/10** |
| Backend (NestJS) | ⚠️ Partiel | **5/10** — CRUD incomplet sur plusieurs modules |
| Frontend (Next.js) | 🔴 Découplé | **3/10** — Fonctionne en démo locale uniquement (store mock) |
| Base de données (Prisma) | ✅ Excellent | **9/10** — Schéma très complet |
| Sécurité | ⚠️ Insuffisant | **4/10** — Guards existants mais non appliqués |
| DevOps / Config | ⚠️ Basique | **5/10** — Déploiement partiellement préparé |
| Tests | 🔴 Absent | **0/10** — Zéro test |

---

## 2. ARCHITECTURE & MONOREPO

### Structure actuelle
```
avra/
├── apps/
│   ├── api/          → NestJS + Prisma (port 3001)
│   └── web/          → Next.js 14 App Router (port 3000)
├── packages/
│   └── types/        → JwtPayload, enums, pagination partagés
├── prisma/
│   ├── schema.prisma → 34 modèles, 23 enums, 871 lignes
│   └── seed.ts       → Données de démo
├── turbo.json        → Pipeline build/dev/lint
└── package.json      → Scripts db:*, pnpm workspaces
```

### Points forts
- Isolation nette frontend/backend via API REST
- Prisma à la racine = accessible aux deux apps
- `@avra/types` partagé entre front et back ✅
- Chaque module NestJS autonome (controller + service + module + DTOs) ✅

### Point critique ❗
- **Le frontend ne consomme PAS le backend** : il fonctionne entièrement via `useAVRAStore` (données mock en `localStorage`). L'API NestJS et le frontend Next.js sont deux projets parallèles qui ne se parlent pas encore.

---

## 3. ANALYSE BACKEND — MODULE PAR MODULE

### 3.1 AppModule / main.ts
- ✅ GlobalPrefix `/api` configuré
- ✅ ValidationPipe avec whitelist + forbidNonWhitelisted
- ✅ CORS restreint à `WEB_URL`
- ❌ **Helmet absent** (headers sécurité HTTP manquants)
- ❌ **ThrottlerModule absent** (pas de rate limiting)
- ❌ **Swagger/OpenAPI absent** (aucune documentation d'API)

### 3.2 AuthModule ⚠️ Partiel
- ✅ Login bcrypt (comparaison correcte)
- ✅ JWT stateless, payload `{sub, email, workspaceId, role}`
- ✅ `validateUser` re-vérifie UserWorkspace à chaque requête
- ✅ `lastLoginAt` mis à jour à chaque login
- ❌ `POST /auth/me` → devrait être `GET /auth/me`
- ❌ **Refresh token absent** (présent dans `.env.example`, non implémenté)
- ❌ **Inscription / onboarding absent** (impossible de créer un workspace)
- ❌ **Un seul workspace par token** (multi-workspace non géré)

### 3.3 ProjectsModule ✅ Le plus complet
- ✅ CRUD complet (create, findAll, findOne, update, delete)
- ✅ `findAll` supporte filtres `status` et `tradeType` via Query params
- ✅ Endpoint `/sign` pour passer en statut SIGNE
- ✅ Multi-tenant via workspaceId systématique
- ❌ **`createWithClient` sans transaction Prisma** → client orphelin possible si `project.create` échoue
- ❌ **Pas de pagination** sur `findAll` → timeout sur gros volumes
- ❌ **`ownerId` non transmis** dans `create` (uniquement dans `createWithClient`)

### 3.4 ClientsModule ✅ Complet
- ✅ CRUD complet, multi-tenant
- ✅ `findOne` inclut adresses + projets (take: 20)
- ❌ Pas de pagination sur `findAll`

### 3.5 DocumentsModule ⚠️ Partiel
- ✅ `findByProject` avec filtre folderId
- ✅ `create` présent
- ✅ `remove` présent
- ❌ **Suppression document ne supprime PAS le StoredFile** → fuite de fichiers disque/S3
- ❌ Pas d'endpoint d'upload générique (seulement via IaModule)
- ❌ Pas de partage de document (DocumentShare non exposé)

### 3.6 IaModule ⚠️ Squelette fonctionnel
- ✅ Upload fichier (écriture locale + StoredFile + Document créés)
- ✅ `createJob` crée un IaJob en statut QUEUED
- ✅ `findJobsByWorkspace` avec includes complets
- ❌ **Worker IA inexistant** → les jobs restent QUEUED indéfiniment
- ❌ **Stockage local** (`uploads/` sur disque) incompatible cloud/multi-instance
- ❌ Aucune intégration OpenAI / Gemini réelle

### 3.7 StockModule ✅ CRUD complet
- ✅ Create, findAll (avec filtre status), findOne, update, remove
- ❌ Pas de gestion automatique des quantités réservées (ProjectStockItem)

### 3.8 OrdersModule 🔴 Read only
- ✅ `findByWorkspace` + `findByProject`
- ❌ **Pas de création de commande**
- ❌ **Pas de gestion des lignes (SupplierOrderLine)**
- ❌ **Pas de mise à jour de statut**

### 3.9 PaymentsModule 🔴 Read only
- ✅ `findByProject` + `findByWorkspace`
- ❌ **Pas de création de PaymentRequest**
- ❌ **Aucune intégration Stripe**
- ❌ **Pas de gestion des statuts**

### 3.10 SignatureModule 🔴 Read only
- ✅ `findByProject` + `findByWorkspace`
- ❌ **Pas de création de demande de signature**
- ❌ **Aucune intégration Yousign / DocuSign**

### 3.11 StatsModule 🔴 Naïf
- ❌ **Charge TOUS les projets en mémoire** pour calculer les KPIs
- ❌ Calcul JS au lieu d'agrégations SQL (`_count`, `_sum`, `groupBy`)
- ❌ Risque de timeout / OOM sur une base de données volumineuse

### 3.12 AuditModule ⚠️ Lecture seulement
- ✅ `findByWorkspace` avec filtre projectId optionnel
- ❌ **Aucun AuditLog n'est jamais créé** → le module existe mais reste vide en base

### 3.13 NotificationsModule ✅ Minimal fonctionnel
- ✅ `findForUser` avec filtre unreadOnly
- ✅ `markAsRead`
- ❌ Pas de création de notification depuis les autres services

### 3.14 IntervenantsModule ✅ CRUD complet
- ✅ CRUD complet, filtrage par type
- ✅ `findOne` inclut projets et requests

### 3.15 EventsModule — non audité en détail (présent)

---

## 4. ANALYSE FRONTEND — PAGE PAR PAGE

### 4.1 Problème fondamental : déconnexion backend
**L'ensemble du frontend fonctionne via `useAVRAStore` (Zustand + localStorage)**, avec des données mockées. Le store contient des types et données totalement différents de ceux de l'API :
- Front : `DossierStatus = 'URGENT' | 'EN COURS' | 'FINITION' | 'A VALIDER'`
- Back : `ProjectLifecycleStatus = DRAFT | VENTE | SIGNE | EN_CHANTIER | ...`
- Front : `Commande.statut = 'EN ATTENTE' | 'CONFIRMÉE' | 'LIVRÉE' | 'ANNULÉE'`
- Back : `SupplierOrder` sans statut équivalent

Il faudra **aligner les types** ou **mapper les données** lors de la connexion réelle.

### 4.2 Page Login ✅ Bien faite
- ✅ Connexion réelle via `authApi.login()`
- ✅ Fallback demo mode (token fictif si backend absent)
- ✅ Redirect si déjà connecté
- ❌ Pas de gestion du refresh token
- ❌ Pas de page d'inscription

### 4.3 AppGuard ⚠️
- ✅ Vérifie token en localStorage
- ❌ **Protection côté client uniquement** → pas de validation SSR
- ❌ **Pas de gestion 401** → pas de redirect auto si token expiré

### 4.4 Dashboard ⚠️ Fonctionnel en démo
- ✅ KPIs calculés depuis le store local
- ✅ "Planning du jour" depuis les gestEvents du store
- ✅ "Urgents & Alertes" depuis les dossiers du store
- ❌ **Tout vient du store mock** — aucun appel API réel
- ❌ Données calculées sur des statuts mock incompatibles avec l'API

### 4.5 Dossiers (liste) ✅ UI très complète
- ✅ Filtrage par statut (pills)
- ✅ Recherche live (nom, email, téléphone)
- ✅ Tri par priorité, date, nom
- ✅ Compteurs par statut
- ❌ **Données depuis le store mock** — aucun `GET /projects`

### 4.6 Dossier (détail) — Non relu en détail mais présent
### 4.7 Nouveau Dossier — Formulaire présent (connexion à vérifier)

### 4.8 IA Studio ⚠️ Simulé
- ✅ UI très bien faite (prompts, galerie, styles)
- ❌ **`generate()` fait un `setTimeout(2500ms)`** → fausse génération
- ❌ Aucun appel à `POST /ia/upload` ou `POST /ia/jobs`
- ❌ Données de galerie hardcodées

### 4.9 Statistiques ⚠️ Calculé localement
- ✅ PieChart et BarChart custom implémentés en SVG
- ❌ Données depuis le store mock

### 4.10 Planning ✅ Complet en local
- ✅ Calendrier hebdomadaire interactif (add/delete events)
- ❌ Non connecté à `EventsModule`

### 4.11 Autres pages (commandes, stock, signature, intervenants, notifications, paramètres, historique)
- Présentes dans le router
- Fonctionnent sur données mock
- À connecter progressivement à l'API

---

## 5. SCHÉMA PRISMA — ANALYSE

### Chiffres
- **34 modèles** (Workspace, User, Project, Client, Document, IaJob, StockItem, etc.)
- **23 enums** (rôles, statuts, types)
- **871 lignes** de schéma

### Points forts
- ✅ Index `workspaceId` sur toutes les tables → isolation multi-tenant performante
- ✅ `Decimal(12,2)` cohérent pour tous les montants
- ✅ Cascade delete bien pensé (workspace → tout ; client → Restrict sur project)
- ✅ `refreshToken` dans `.env.example` (même si non implémenté côté code)
- ✅ Arborescence `ProjectFolder` récursive (auto-relation)
- ✅ `AutomationRule` et `AuditLog` modélisés

### Points à corriger
- ❌ `refreshToken` absent du modèle `User` (présent dans .env mais non modélisé)
- ❌ `AutomationRule` : moteur d'automatisation inexistant
- ❌ `DocumentShare` : tokens de partage modélisés mais non exposés par l'API

---

## 6. SÉCURITÉ — TABLEAU DÉTAILLÉ

| Point | Statut | Détail |
|---|---|---|
| Bcrypt passwords (cost 12) | ✅ | |
| JWT stateless | ✅ | |
| Whitelist + forbidNonWhitelisted DTOs | ✅ | |
| CORS restreint à WEB_URL | ✅ | |
| Multi-tenant isolation workspaceId | ✅ | |
| JwtAuthGuard sur tous les controllers | ✅ | Appliqué correctement |
| RolesGuard déclaré | ✅ | Existe dans le code |
| **RolesGuard utilisé** | ❌ | **Aucun `@Roles()` dans aucun controller** |
| Refresh token | ❌ | Non implémenté |
| Rate limiting (ThrottlerModule) | ❌ | Absent |
| Helmet (headers HTTP) | ❌ | Absent |
| Validation taille fichiers | ✅ | 10MB limit dans IaController |
| Protection CSRF | N/A | JWT Bearer = non applicable |
| SSR auth guard | ❌ | Côté client uniquement |
| Token expiry 401 → redirect login | ❌ | Non géré dans `api.ts` |

**Conséquence critique :** n'importe quel utilisateur authentifié (même VIEWER) peut appeler n'importe quel endpoint, y compris DELETE et POST.

---

## 7. CONFIGURATION & DEVOPS

### Variables d'environnement
- ✅ `.env.example` complet (DB, JWT, S3, Stripe, IA, Yousign)
- ✅ `.env` à la racine pour Turborepo (`globalDependencies: [".env"]`)
- ⚠️ `apps/api/.env.production` présent (contenu à vérifier)
- ❌ Pas de validation des variables d'env au démarrage (ex: `@nestjs/config` avec `validationSchema`)

### Build & CI
- ✅ Turborepo avec cache (`.turbo/`)
- ✅ Scripts `db:migrate`, `db:seed`, `db:studio` à la racine
- ❌ Pas de pipeline CI/CD (GitHub Actions, Vercel CI)
- ❌ Pas de Dockerfile ou docker-compose pour le dev

### Déploiement
- ✅ `vercel.json` présent (déploiement frontend sur Vercel)
- ✅ `DEPLOIEMENT_CLOUD.md` présent (documentation)
- ❌ API NestJS : pas de configuration de déploiement (Railway, Render, Fly.io ?)
- ❌ Stockage fichiers local incompatible avec déploiement multi-instance

---

## 8. BUGS IDENTIFIÉS

### 🔴 Critiques (bloquants en production)
1. **`createWithClient` sans transaction** → client orphelin si `project.create` échoue
2. **Suppression Document ne supprime pas StoredFile** → fuite fichiers
3. **Jobs IA bloqués en QUEUED** → aucun worker, rien ne s'exécute jamais
4. **Stockage fichiers local** → incompatible cloud / multi-instance
5. **Frontend déconnecté du backend** → toutes les données sont mockées

### 🟠 Majeurs (sérieux mais non bloquants)
6. **Pas de pagination** sur `findAll` projects, clients, documents
7. **Stats calculées en JS** sur tous les projets (N+1 / full scan)
8. **RolesGuard jamais appliqué** → tout user authentifié = OWNER en pratique
9. **Refresh token absent** → sessions expirent silencieusement après 7 jours
10. **Types front/back incompatibles** → statuts, noms de champs divergents
11. **Helmet + ThrottlerModule absents** → surface d'attaque non protégée

### 🟡 Mineurs
12. `POST /auth/me` → devrait être `GET /auth/me`
13. `useEffect([loading])` dans IA Studio → boucle d'appels potentielle
14. `ownerId` non transmis dans `projects.create` (only in `createWithClient`)
15. `AuditLog` jamais écrit malgré module complet
16. `Notification` jamais créée depuis les autres services
17. Seed sans upsert → erreur si exécuté deux fois
18. `AutomationRule` modélisée mais sans moteur

---

## 9. FONCTIONNALITÉS MANQUANTES

### Backend prioritaire
- [ ] **Transaction Prisma** dans `createWithClient`
- [ ] **Pagination** (`skip`/`take` + total) sur tous les `findMany` exposés
- [ ] **Inscription / onboarding** — création workspace + user
- [ ] **Refresh token** endpoint
- [ ] **CRUD complet Orders** (create, update statut, lignes)
- [ ] **CRUD complet Payments** (create, Stripe webhook)
- [ ] **CRUD complet Signatures** (create, Yousign webhook)
- [ ] **Helmet + ThrottlerModule** dans main.ts
- [ ] **@Roles() décorateur** appliqué sur les endpoints sensibles
- [ ] **AuditLog automatique** dans les services (intercepteur ou décorateur)
- [ ] **Stats SQL** avec `groupBy`, `_count`, `_sum` Prisma
- [ ] **Worker IA** (BullMQ + Redis) avec vraie intégration OpenAI
- [ ] **Upload S3/R2** pour les fichiers (remplacer stockage local)
- [ ] **Suppression StoredFile** dans `DocumentsService.remove()`
- [ ] **Swagger/OpenAPI** pour documenter l'API

### Frontend prioritaire
- [ ] **Connecter Dashboard** à `GET /stats/global`
- [ ] **Connecter liste Dossiers** à `GET /projects` (aligner statuts)
- [ ] **Connecter détail Dossier** à `GET /projects/:id`
- [ ] **Connecter nouveau Dossier** à `POST /projects/with-client`
- [ ] **Gestion erreur 401** dans `api.ts` → redirect `/login` auto
- [ ] **Refresh token** dans `api.ts` (intercepteur de réponse)
- [ ] **IA Studio** → vrais appels `POST /ia/upload` + `POST /ia/jobs`
- [ ] **Aligner les types** front/back (statuts, enums)
- [ ] **Filtres fonctionnels** connectés aux query params API
- [ ] **Pages à compléter** : stock CRUD, commandes CRUD, planning (Events API), signature workflow, paramètres workspace

---

## 10. PLAN D'ACTION RECOMMANDÉ

### Phase 1 — Fondations (Semaine 1) 🚧
**Objectif : backend stable, frontend connecté sur les modules core**

1. Corriger `createWithClient` avec transaction Prisma
2. Ajouter Helmet + ThrottlerModule dans `main.ts`
3. Ajouter pagination sur Projects, Clients, Documents
4. Implémenter refresh token (endpoint + logique)
5. Implémenter inscription / création workspace
6. **Connecter Dashboard → `GET /stats/global`**
7. **Connecter liste Dossiers → `GET /projects`** (aligner statuts)
8. **Connecter détail Dossier → `GET /projects/:id`**
9. Gérer erreur 401 dans `api.ts` → redirect login

### Phase 2 — Modules métier (Semaine 2) 📦
**Objectif : CRUD complet sur les modules actuellement en read-only**

10. CRUD Orders (create, update, lignes)
11. CRUD Payments (create, statuts)
12. CRUD Signatures (create, statuts)
13. Stats SQL (groupBy, _count, _sum)
14. Connecter IA Studio à l'API réelle
15. Appliquer @Roles() sur endpoints sensibles (DELETE, admin)
16. Écriture automatique AuditLog (via intercepteur NestJS)

### Phase 3 — Intégrations externes (Semaine 3) 🔌
**Objectif : fonctionnalités avancées**

17. Worker IA avec BullMQ + intégration OpenAI
18. Upload S3/R2 (remplacer stockage local)
19. Intégration Stripe (PaymentRequest + webhooks)
20. Intégration Yousign (SignatureRequest + webhooks)
21. Swagger/OpenAPI

### Phase 4 — Robustesse & Production (Semaine 4) 🚀
**Objectif : qualité production**

22. Tests unitaires (auth, projects, stats)
23. Tests e2e (flow inscription → login → projet → document)
24. Pipeline CI/CD (GitHub Actions)
25. Dockerfile + docker-compose pour dev local
26. Validation des variables d'env au démarrage
27. Monitoring / alerting (Sentry)

---

## 11. RÉSUMÉ EXÉCUTIF

**Le projet AVRA a une excellente base architecturale** — schéma Prisma exemplaire, structure NestJS propre, design système cohérent. Cependant, il souffre de **deux problèmes majeurs** qui bloquent tout passage en production :

**1. Le frontend et le backend sont deux projets parallèles qui ne se parlent pas.** Le frontend fonctionne entièrement sur des données mockées (`useAVRAStore`) avec des types incompatibles avec l'API. Il faut brancher progressivement chaque page sur les vraies routes API.

**2. Plusieurs modules backend sont des stubs en lecture seule** (Orders, Payments, Signatures) et les fonctionnalités d'intégration clés (worker IA, Stripe, Yousign, S3) sont inexistantes.

**Estimation pour un MVP connectable :** 2-3 semaines de développement ciblé sur les phases 1 et 2.

---

*Audit généré le 23 mars 2026 — AVRA v0.1 (monorepo Turborepo)*
