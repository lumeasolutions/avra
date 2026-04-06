# ANALYSE COMPLÈTE DU PROJET AVRA
> Rapport d'analyse technique — 14 mars 2026

---

## 1. VISION D'ENSEMBLE

**AVRA** est un ERP SaaS métier destiné aux professionnels de l'agencement : architectes d'intérieur, cuisinistes, menuisiers, agenceurs. Il se présente comme un **monorepo Turborepo** structuré autour de deux applications principales et d'un package de types partagés.

**Stack technique :**
- Frontend : Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- Backend : NestJS, Prisma ORM, PostgreSQL
- Auth : JWT stateless, multi-tenant, RBAC (rôles)
- Gestion de monorepo : Turborepo + pnpm workspaces
- IA : stockage de jobs, upload local de fichiers (OpenAI / Gemini prévus)
- Signature : intégration Yousign / DocuSign (à connecter)
- Paiements : Stripe (prévu)

---

## 2. ARCHITECTURE DU MONOREPO

```
avra/
├── apps/
│   ├── api/          → NestJS (port 3001/api)
│   └── web/          → Next.js 14 (port 3000)
├── packages/
│   └── types/        → Types partagés (JwtPayload, enums, pagination)
├── prisma/
│   ├── schema.prisma → 30+ modèles, 40+ enums
│   └── seed.ts       → Données de demo
├── package.json      → Orchestration + scripts db
└── turbo.json        → Pipeline Turborepo
```

**Points forts architecturaux :**
- Isolation nette backend / frontend via l'API REST
- Prisma place le schéma à la racine (accessible aux deux apps)
- Types partagés dans `@avra/types` — bonne pratique monorepo
- Chaque module NestJS (auth, projects, clients…) est autonome (controller + service + module + DTOs)

---

## 3. SCHÉMA DE DONNÉES — ANALYSE

Le schéma Prisma est extrêmement complet et bien pensé pour un SaaS métier. Il couvre :

### Tenancy & Utilisateurs
- `Workspace` — l'unité SaaS (slug unique, plan, trial/subscription)
- `User` — global (email unique, passwordHash bcrypt)
- `UserWorkspace` — table de jonction avec le rôle RBAC par workspace
- `WorkspaceSettings` — configuration par workspace (TVA, devise, seuils, feature flags)

### CRM
- `Client` (PARTICULIER / PROFESSIONNEL), `Contact` (multi-contact par client), `Address` (BILLING / SITE / OTHER)

### Projets
- `Project` — cycle de vie complet : DRAFT → VENTE → SIGNE → EN_CHANTIER → RECEPTION → SAV → CLOTURE / PERDU / ARCHIVE
- `ProjectFolder` — arborescence récursive (auto-relation parentFolderId), templates par métier
- `ProjectStageData` — données structurées par étape (clé/valeur JSON versionnées)
- `ProjectCustomFieldValue` — champs custom typés (texte, nombre, date, booléen, JSON)

### Documents & Fichiers
- `StoredFile` — stockage physique (storageKey, checksum, publicUrl)
- `Document` — métadonnées (kind, version, visibilité client, partage externe)
- `DocumentShare` — partage tokenisé avec expiration

### Planning & Événements
- `Event` — double calendrier (PERSONAL / GESTION), 10 types d'événement
- `EventIntervenant` — association intervenants ↔ événements
- `Reminder` — rappels liés à projet / dossier / événement

### Intervenants
- `Intervenant` — 11 types (poseur, électricien, maçon…), mini-portal activable
- `IntervenantRequest` / `IntervenantResponse` — workflow de demande avec statuts détaillés
- `ProjectIntervenant` — liaison projet ↔ intervenant

### Commercial
- `Quote` / `QuoteLine` — devis avec lignes, versioning, statuts
- `SupplierOrder` / `SupplierOrderLine` — commandes fournisseurs
- `Supplier` — base fournisseurs
- `StockItem` / `ProjectStockItem` — gestion de stock avec réservation
- `PaymentRequest` — ACOMPTE / SOLDE / FACTURE avec provider Stripe
- `SignatureRequest` — signature électronique avec provider Yousign/DocuSign

### IA
- `IaJob` — file de jobs IA (5 types : rendu, couleur, édition, comparaison plan, assistant texte)

### Transversal
- `Notification` — notifications par scope et par type
- `AutomationRule` — règles d'automatisation (triggerKey + configJson)
- `AuditLog` — traçabilité complète des actions

**Observations schéma :**
- Index bien placés (workspaceId sur toutes les tables, champs de tri/filtre)
- Decimal(12,2) cohérent pour tous les montants
- Cascade delete bien pensé (workspace → tout ; client → Restrict sur project)
- `refreshToken` absent du schéma alors qu'il est mentionné dans `.env.example`

---

## 4. BACKEND — MODULE PAR MODULE

### AuthModule ✅ Solide
- Login bcrypt + JWT stateless
- `validateUser` re-vérifie le UserWorkspace à chaque requête (sécurité correcte)
- Seul workspaceId dans le JWT → mono-workspace par token (limite à noter)
- Endpoint `POST /auth/me` au lieu de `GET` — choix inhabituel mais fonctionnel
- **Manque** : refresh token (prévu en .env mais non implémenté)
- **Manque** : endpoint d'inscription / création de workspace

### ProjectsModule ✅ Bien structuré
- CRUD complet + endpoint spécial `/sign`
- Multi-tenant correctement géré via workspaceId
- `findAll` charge tous les projets d'un workspace sans pagination → **risque perf** en production
- `createWithClient` crée client + projet en deux requêtes séparées, pas de transaction Prisma → **risque d'incohérence** si la 2ème requête échoue
- `create(workspaceId, dto)` ne passe pas `workspaceId` dans le DTO mais dans data directement ✅

### DocumentsModule ⚠️ Partiel
- Lecture et suppression OK
- **Manque** : pas d'endpoint d'upload de fichier (l'upload est dans IaModule mais pas de route documents génériques)
- La suppression supprime le `Document` mais pas le `StoredFile` associé → **fuite de fichiers**

### IaModule ⚠️ Squelette
- Upload OK (écriture locale sur disque)
- Création de job OK (QUEUED) mais **le worker/processeur de job n'existe pas**
- Les jobs restent en QUEUED indéfiniment — aucune intégration OpenAI / Gemini réelle
- Stockage local (`uploads/` sur disque) non compatible avec déploiement multi-instance ou cloud

### StockModule ✅ CRUD complet
- Pas de gestion de quantités réservées automatique lors des liaisons ProjectStockItem

### OrdersModule ⚠️ Read only
- Uniquement `findByProject` et `findByWorkspace`
- **Manque** : création, mise à jour, lignes de commande

### PaymentsModule ⚠️ Read only
- Idem orders — lecture seule
- **Manque** : création de PaymentRequest, intégration Stripe

### SignatureModule ⚠️ Read only
- Idem — lecture seule
- **Manque** : création de demande de signature, intégration Yousign

### NotificationsModule ✅ Minimal mais fonctionnel
- findForUser + markAsRead

### StatsModule ⚠️ Naïf
- Charge **tous** les projets en mémoire pour calculer les stats → **N+1 / full scan** sur grosse DB
- À remplacer par des agrégations Prisma (`_count`, `_sum`, `groupBy`)

### AuditModule ✅ Lecture OK
- **Manque** : aucun service n'écrit de log d'audit — les logs ne sont jamais créés automatiquement

### IntervenantsModule ✅ CRUD complet

### EventsModule — non lu en détail mais présent

### UsersModule — minimal (pas de route de gestion utilisateurs)

---

## 5. FRONTEND — PAGE PAR PAGE

### Structure Next.js 14
- App Router avec route group `(app)` protégée par `AppGuard`
- `AppGuard` : protection côté client uniquement (localStorage token) → **pas de protection SSR**
- Layout (app) : Sidebar fixe + Topbar + zone de contenu

### Dashboard ⚠️
- KPIs chargés depuis `/stats/global` ✅
- "Tâches du jour" et "Alertes" sont **hardcodées** — non connectées à la DB

### Dossiers (liste) ✅
- Chargement des projets avec table responsive
- Filtre UI présent mais **non fonctionnel** (bouton sans action)
- Lien "Voir les autres dossiers du client" pointe sur `?clientId=` mais la page ne filtre pas par clientId

### Dossier (détail) ✅
- Affichage complet : client, owner, folders, documents, intervenants
- Action "Transformer en signé" fonctionnelle
- Navigation vers planning/signature contextuelle

### IA Studio ⚠️
- Upload + création de job UI bien faite
- Jobs listés mais status toujours QUEUED (pas de worker)
- `useEffect([loading])` pour recharger les jobs est fragile (boucle potentielle)

### Autres pages (planning, stock, commandes, statistiques, signature, intervenants, historique, parametres, notifications)
- Toutes présentes dans le router Next.js
- Non lues en détail mais visiblement des squelettes à compléter

---

## 6. AUTHENTIFICATION & SÉCURITÉ

| Point | Statut |
|---|---|
| Bcrypt passwords (cost 12) | ✅ |
| JWT stateless | ✅ |
| Whitelist + forbidNonWhitelisted sur DTOs | ✅ |
| CORS restreint | ✅ |
| Multi-tenant isolation via workspaceId | ✅ |
| RBAC guard disponible | ✅ |
| RBAC guard **utilisé** dans les controllers | ❌ (aucun controller n'applique @Roles) |
| Refresh token | ❌ manquant |
| Rate limiting (throttler) | ❌ manquant |
| Helmet (headers sécurité) | ❌ manquant |
| Validation taille fichiers upload | ✅ (10MB limit) |
| Protection CSRF | ❌ non applicable (JWT Bearer) |

---

## 7. BUGS & PROBLÈMES IDENTIFIÉS

### Critiques
1. **Pas de transaction dans `createWithClient`** — si la création projet échoue après la création client, un client orphelin est créé en base.
2. **Suppression de Document ne supprime pas le StoredFile** — fuite de fichiers sur disque / S3.
3. **Jobs IA bloqués en QUEUED** — aucun worker n'existe, les jobs ne s'exécutent jamais.
4. **Stockage fichiers local** — incompatible avec déploiement cloud / multi-instance.

### Majeurs
5. **Pas de pagination** sur `findAll` projects, documents, notifications — risque de timeout sur gros volumes.
6. **Stats calculées en JS** sur tous les projets — doit être une agrégation SQL.
7. **RolesGuard déclaré mais jamais appliqué** — n'importe quel utilisateur authentifié peut appeler n'importe quel endpoint.
8. **Filtre "Voir les autres dossiers du client"** ne fonctionne pas côté frontend.
9. **Tâches du jour hardcodées** dans le dashboard.
10. **Refresh token manquant** — les sessions expirent après 7 jours sans possibilité de renouvellement silencieux.

### Mineurs
11. `POST /auth/me` devrait être `GET /auth/me`.
12. `useEffect([loading])` dans IA Studio peut provoquer des appels en boucle.
13. Le seed crée un client `prisma.client.create` à chaque exécution (sans upsert) — erreur si seed relancé.
14. Aucun AuditLog n'est jamais écrit malgré le module complet.
15. `AutomationRule` définie en base mais aucun moteur d'automatisation n'existe.

---

## 8. FONCTIONNALITÉS MANQUANTES (PRIORITAIRES)

### Backend
- [ ] **Inscription / onboarding** (création workspace + user)
- [ ] **Refresh token** endpoint
- [ ] **Worker IA** (BullMQ ou equivalent) avec vraie intégration OpenAI/Gemini
- [ ] **Upload S3/R2** pour les fichiers
- [ ] **CRUD complet** : Orders, Payments, Signatures (création + mise à jour)
- [ ] **Pagination** sur tous les `findMany` exposés
- [ ] **Application des RolesGuard** sur les endpoints sensibles
- [ ] **Écriture automatique des AuditLogs** dans les services
- [ ] **Helmet + ThrottlerModule** pour sécurité HTTP
- [ ] **Transaction Prisma** pour `createWithClient`
- [ ] **Agrégation stats** SQL plutôt que calcul JS

### Frontend
- [ ] **Filtres fonctionnels** sur la liste des dossiers
- [ ] **Dashboard dynamique** : tâches et alertes depuis la DB
- [ ] **Gestion du refresh token** dans `api.ts`
- [ ] **Pages à compléter** : planning interactif, stock CRUD, commandes CRUD, statistiques visuelles, signature workflow, paramètres workspace
- [ ] **Formulaires d'édition** de projet, client, intervenant
- [ ] **Visualisation résultats IA** (images générées)
- [ ] **Erreurs 401** → redirect automatique vers /login

---

## 9. QUALITÉ DU CODE

**Points forts :**
- Architecture NestJS très propre et modulaire
- Typage TypeScript rigoureux (DTOs, types partagés, Prisma generated)
- Schéma Prisma remarquablement complet et bien indexé
- Isolation multi-tenant cohérente
- Design system Tailwind cohérent (variables `avra-primary`, `avra-accent`, etc.)
- Composants de layout réutilisables (Sidebar, Topbar, AppGuard)

**Points à améliorer :**
- Absence de tests (unitaires, e2e)
- Absence de documentation Swagger/OpenAPI
- Certains services sont des read-only stubs
- Couplage du stockage fichiers au système de fichiers local

---

## 10. PRIORITÉS RECOMMANDÉES POUR LE WEEK-END

### Priorité 1 — Fonctionnement de base complet
1. Corriger la transaction `createWithClient`
2. Ajouter pagination sur les `findAll`
3. Compléter CRUD Orders + Payments + Signatures
4. Ajouter Helmet + ThrottlerModule
5. Implémenter refresh token

### Priorité 2 — Frontend opérationnel
6. Rendre les filtres de la liste dossiers fonctionnels
7. Connecter le dashboard (tâches du jour, alertes dynamiques)
8. Pages de gestion : planning, stock CRUD, commandes CRUD
9. Gestion erreur 401 → redirect login automatique

### Priorité 3 — IA & Features avancées
10. Intégrer un worker (BullMQ) pour les jobs IA
11. Connecter OpenAI pour PHOTOREALISM_ENHANCE et COLOR_VARIATION
12. Upload S3/R2 pour les fichiers
13. Workflow signature Yousign complet

### Priorité 4 — Robustesse & Production
14. Appliquer RolesGuard sur les endpoints sensibles
15. Écrire les AuditLogs automatiquement dans les services
16. Stats SQL agrégées
17. Tests unitaires + e2e sur les modules critiques

---

*Rapport généré automatiquement par analyse statique du code source — AVRA v0.1 (monorepo)*
