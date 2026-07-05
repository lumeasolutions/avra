# Audit complet AVRA — 5 juillet 2026

Audit A→Z réalisé par 6 revues parallèles (sécurité backend, sécurité frontend, data/Prisma, bugs backend, bugs frontend, config/déploiement) + vérifications manuelles. Findings consolidés, dédupliqués, re-priorisés.

**Verdict global.** Fondations saines : isolation multi-tenant `workspaceId` appliquée systématiquement (aucun IDOR cross-workspace réel), auth JWT solide (HS256 épinglé, anti-timing, anti-énumération, bcrypt 12), CSRF double-submit, CORS/Helmet stricts, zéro SQL brut, arithmétique devis/factures en `Decimal`. **Mais** plusieurs défauts à fort impact business/légal/sécurité listés ci-dessous, dont une **fuite de secret active** à traiter immédiatement.

---

## P0 — Critique / à traiter tout de suite

| # | Sujet | Fichier(s) | Impact |
|---|-------|-----------|--------|
| P0-1 | **Clé API Anthropic RÉELLE commitée** (+ dans l'historique git) | `CLAUDE_API_INTEGRATION.md:10,17`, `INTEGRATION_COMPLETE.md:17`, `IA_INTEGRATION_COMPLETE.md`, `QUICK_START.md:40` | Détournement de facturation Anthropic, coût illimité. **Fuite active.** |
| P0-2 | **TVA 5,5 % enregistrée en 5 %** (`parseInt("5.5")===5`) | `facturation/components/LignesEditor.tsx:64`, `facturation/page.tsx:117,169` | TVA fausse sur devis/factures réels (taux réno = cœur de cible) |
| P0-3 | **Numérotation factures via `count()+1`** — non atomique, régresse après delete, `reference` non `@unique` | `quotes.service.ts:56`, `invoices.service.ts:63`, `schema.prisma:1179,1230` | Numéros dupliqués → **non-conformité légale** (séquence unique obligatoire) |
| P0-4 | **Deux chemins devis→facture divergents** (`convertToInvoice` vs `convertFromQuote`) qui collisionnent sur `F-…` | `quotes.service.ts:156`, `invoices.service.ts:168` | Doublons de numéros entre systèmes, incohérence comptable |
| P0-5 | **Cascade destructive Project→Quote/Invoice/Payment/Signature** (`onDelete: Cascade`) | `schema.prisma:1201,1254,1293,1325` | Supprimer un dossier **efface les factures** → violation conservation légale 10 ans |
| P0-6 | **Facture d'AVOIR à montants positifs** (pas d'inversion de signe) | `invoices.service.ts:168-227` | Avoir gonfle le CA au lieu de le réduire |
| P0-7 | **jsPDF vulnérable** (Path Traversal/LFI ≥4.0.0, HTML Injection ≥4.2.1) | `apps/web/package.json` | Génération PDF devis/factures exposée |
| P0-8 | **Token e-facturation ni `@unique` ni indexé** + frontend charge TOUS les docs puis `.find()` client par token | `schema.prisma:1189,1243`, `e-facturation/[token]/page.tsx:124,148` | Fuite de tout le dataset au client, collision de tokens → mauvais doc servi |

**Actions P0**
1. **Révoquer la clé Anthropic** sur console.anthropic.com **maintenant**, retirer les 4 `.md`, purger l'historique (BFG/`git filter-repo`), force-push coordonné.
2. `parseInt` → `parseFloat` sur tous les champs TVA.
3. `@@unique([workspaceId, reference])` + compteur de séquence atomique (table compteur ou `SELECT … FOR UPDATE`) ; unifier sur un seul chemin de conversion.
4. Passer les FK Project→Quote/Invoice/Payment/Signature en `onDelete: SetNull` (comme Document/Event/SupplierOrder le font déjà).
5. Négativer les totaux des `AVOIR`.
6. `pnpm --filter @avra/web up jspdf@latest` (≥4.2.1), retester la génération.
7. `token String? @unique` + lookup serveur `findFirst({where:{token}})`.

---

## P1 — Élevé

### Sécurité
- **P1-1 — `chat-marketing` sans auth ni rate-limit** (`app/api/chat-marketing/route.ts:57`) : drain du budget OpenAI par script, `messages` non borné. → rate-limit IP + borner `messages`.
- **P1-2 — Rate-limiting IP inopérant sur Vercel** (`lib/server/rate-limit.ts:73`) : `getClientIp` ne lit `x-forwarded-for` que si `TRUSTED_PROXY=true` (absent) → toutes les requêtes = `'unknown'`, compteur global unique. Anti-spam waitlist/demo/contact = 3-5/h **pour la planète** (DoS trivial). → lire `x-forwarded-for` par défaut sur Vercel.
- **P1-3 — SSRF résiduel** `copyExternalImageToIaRenders` sans allowlist (`lib/server/supabase-storage.ts:94`), utilisé par 4 routes IA. → appliquer `isAllowedUrl` + `redirect:'manual'`.
- **P1-4 — Bypass HMAC webhook YouSign hors prod** (`signature.controller.ts:37`) : sans secret + `NODE_ENV!=='production'`, webhook traité sans signature → forcer un doc à `SIGNED`. → exiger le secret sauf localhost strict.
- **P1-5 — Secrets HMAC par défaut** pour tokens publics demandes + iCal (`demandes.service.ts:432`, `ical-feed.service.ts:21`), + **tokens publics sans expiration**. → `throw` si secret absent, ajouter `exp`.
- **P1-6 — Blacklist refresh tokens + throttler en mémoire** (inopérants en serverless multi-instance) (`token-blacklist.service.ts`, `app.module.ts:40`). → Redis/Upstash avant bêta publique.

### Bugs métier
- **P1-7 — Facture SOLDE : acomptes non bornés** (`invoices.service.ts:180`) : pas de vérif Σacomptes ≤ total, solde négatif non géré.
- **P1-8 — Acompte calculé ligne à ligne avec arrondi intermédiaire** (`invoices.service.ts:180`) : somme des acomptes ≠ X % du total. → appliquer le % sur le total.
- **P1-9 — Stats `Decimal → Number`** puis accumulation float (`stats.service.ts:33,44`) : CA/marge/taux imprécis. → rester en `Decimal`.
- **P1-10 — Stock sans `@Min(0)`** (`create-stock-item.dto.ts`, `stock.service.ts:11,86`) : quantités/prix négatifs acceptés.

### Frontend justesse données
- **P1-11 — Montants arrondis à l'euro au stockage vs PDF aux centimes** (`facturation/page.tsx:256,258`) : TTC liste ≠ NET À PAYER PDF.
- **P1-12 — TVA mono-taux sur documents multi-taux** (`facturation/page.tsx:531,1198`, `dossiers/[id]/page.tsx:1440`, `useDataSync.ts:435` `tva:20` hardcodé) : TTC faux dès qu'un doc mélange 0/5,5/10/20 %.
- **P1-13 — Signature dossier : redirection « succès » dans un `finally`** (`dossiers/[id]/page.tsx:464`) : redirige vers `/dossiers-signes` même si l'API échoue.
- **P1-14 — Aperçu doc croisé (race sur URL signée)** (`dossiers/[id]/page.tsx:274`) : doc A peut s'afficher pour doc B (docs confidentiels).

### Config
- **P1-15 — `env.validation` inopérant** (`skipMissingProperties:true`, `config/env.validation.ts`) : les vars « obligatoires » ne sont jamais validées si absentes.
- **P1-16 — Divergence des 3 configs Vercel** : `apps/web/vercel.json` (config active) **omet `functions.includeFiles: apps/api/dist/**` et les `crons`** → risque `/api/v1/*` en 500 et cron relances 9h qui ne tourne pas.
- **P1-17 — Références facture non atomiques (concurrence)** — voir P0-3 (même racine).

---

## P2 — Moyen

### Sécurité / RBAC
- **P2-1 — GET signature & `stats/global` sans `@Roles`** (`signature.controller.ts:110`, `stats.controller.ts:14`) : sur-exposition intra-workspace (VIEWER/INTERVENANT voient signatures & CA). *(Pas un IDOR — filtré par workspace du JWT.)*
- **P2-2 — `updateStatus` signature sans machine à états** (`signature.controller.ts:120`).
- **P2-3 — Virus scan fail-open** sans `CLOUDMERSIVE_API_KEY` (`virus-scan.service.ts`, `dossier-documents.service.ts:447`). → fail-closed en prod.
- **P2-4 — CSP `script-src 'unsafe-inline'`** (nonce généré mais non câblé) (`middleware.ts:105`, `next.config.js:38`). Risque XSS théorique aujourd'hui (aucun `dangerouslySetInnerHTML` sur input user).
- **P2-5 — `attachDocument` ne valide pas le workspace de la source** (`demandes.service.ts:965`) — référence pendante, download re-vérifie (pas d'exfiltration).
- **P2-6 — `CRON_SECRET` sans longueur minimale** (`demandes.controller.ts:283`).
- **P2-7 — Fuite `details` d'erreur backend au client** (`app/api/signature/route.ts:41`).

### Bugs
- **P2-8 — Paiement sans idempotence ni machine à états** (`payments.service.ts:123`) : `paidAt` écrasable, double paiement.
- **P2-9 — Race sur lock cron auto-reminders** (`demandes.controller.ts:306`) : lock posé après exécution → double envoi des relances.
- **P2-10 — Extraction IA : confiance moyennée non pondérée + coût non plafonné multi-appels ; 11-30 docs retombe en mode non fiable** (`ia/extraction.service.ts:127,380`).
- **P2-11 — Commandes fournisseurs en float, sans totaux/TVA** (`orders.service.ts:55`).
- **P2-12 — Suppressions financières non gardées** (facture émise/payée hard-deletable) (`invoices.service.ts:154`, `quotes.service.ts:147`, `payments.service.ts:142`).
- **P2-13 — Injection HTML dans les PDF** (données non échappées, `win.document.write`) (`facturation/page.tsx:610,793`).
- **P2-14 — Suppression intervenant local-only** (réapparaît au resync) (`intervenants/page.tsx:634`).
- **P2-15 — Email intervenant perdu silencieusement si `createDemande` échoue** (`planning-gestion/page.tsx:435`).
- **P2-16 — Catch vides sur synchros** (`dossiers/[id]/page.tsx:222`, `planning/page.tsx:225`).

### Data / perf
- **P2-17 — `seed-demo.ts` en drift** (colonnes `companyName/companyAddress/companyVat` inexistantes) → seed cassé (`prisma/seed-demo.ts:47`).
- **P2-18 — FK non indexées** (`StockItem.supplierId`, `SupplierOrder.projectId/supplierId`, `IaJob.sourceDocumentId/resultDocumentId`…).
- **P2-19 — `Reminder.folderId` / `Document.folderId` free-form** sans FK (orphelins silencieux).
- **P2-20 — bcrypt cost 10 vs 12** sur refresh (`token-rotation.service.ts:115`).
- **P2-21 — `IaJob.costEUR` en Float** (seul montant non-Decimal) (`schema.prisma:1360`).
- **P2-22 — `DemoRequest.email` non unique** (doublons/spam).
- **P2-23 — key={index} sur listes mutables** (docs, textures, PJ — 25 occurrences) : état rattaché au mauvais item.
- **P2-24 — Perf : `eventLayout` recalculé pendant le drag** (`planning*/page.tsx`), filtres/KPIs stock non mémoïsés, listes non paginées/virtualisées, composants monolithiques (`dossiers/[id]` 2910 l., `ia-studio` ~1800 l.).
- **P2-25 — Résultats IA stale** (pas d'`AbortController` sur générations 15s-3min) (`ia-studio/page.tsx`).

### CI / hygiène
- **P2-26 — CI ne bloque jamais** (`test`/`lint` en `continue-on-error:true`, actions v3, pnpm 8) (`.github/workflows/ci.yml`) ; pas de `pnpm audit` ni secret-scanning.
- **P2-27 — Pollution racine** : ~130 fichiers parasites trackés (59 `.md` d'audit, 10 `.bat`/`.ps1`, PDF de test, logos lourds dupliqués 2-2,7 Mo), + répertoires `.claude/worktrees/agent-*` commités (dupliquent tout l'arbre). *(Aucune donnée client réelle trackée — vérifié.)*
- **P2-28 — `path-to-regexp` ReDoS** (transitive via `@vercel/node`).
- **P2-29 — Formatage devise incohérent** (0 vs 2 décimales selon l'écran).

---

## P3 — Faible / durcissement (extrait)

- Rate-limit en mémoire non partagé (`rate-limit.ts`) ; `ia/download` fetch sans timeout.
- `findFirst({id,workspaceId})` puis `update({where:{id}})` : **pas un IDOR** (transaction + IDs uniques), mais ajouter `workspaceId` au `where` par défense.
- `payments.create` ignore silencieusement `description/dueDate/reference` du DTO (`payments.service.ts:84`).
- Catch email/notif `noop` sans télémétrie (`demandes.service.ts`) ; `console` avec noms fichiers clients (RGPD mineur).
- `save-image` écrit sur FS serverless read-only (code mort) ; `build.sh` chemin absolu en dur non portable.
- `alert()/confirm()` natifs (ia-studio, intervenants) ; `avgMargin` = moyenne de % ; timezone `daysUntil` ±1 jour aux frontières.
- Champs `User.refreshToken` legacy dépréciés à nettoyer ; `.gitignore` `_tmp_*/` inefficace.

---

## Points positifs vérifiés (ne pas « corriger »)
- Auth : anti-énumération/timing, bcrypt 12, JWT HS256 épinglé, refresh à rotation `jti` hashé DB, forgot-password timing aplati + token sha256.
- Isolation `workspaceId` systématique et correcte (clients, projets, devis, factures, commandes, paiements, stock, events, demandes, documents, intervenants, notifications, stats, audit). Team : anti-escalade solide. Zéro SQL brut.
- CSRF double-submit, CORS strict (refus démarrage prod sans origins), Helmet, `ValidationPipe` global `whitelist+forbidNonWhitelisted+transform`.
- IA backend : contexte scoped workspace, pas de SSRF (docs via Supabase ownership-checked, images base64 inline), coûts bornés (`max_tokens`, `MAX_DOCS=30`, throttlers par route).
- `lib/api.ts` : 401→refresh dédupliqué + backoff, CSRF, retry 403. Token en cookie HttpOnly (pas localStorage). `error.tsx` de segment, intervals/listeners nettoyés. `commandes/page.tsx` exemplaire.
- Arithmétique devis/factures en `Decimal` ; reset token sha256 ; `icalToken/portalToken/DocumentShare.token` en `@unique` ; pagination audit/notifications ; `.env`/`.env.build`/`.env.example` sans vrai secret ; Next 14.2.35, NestJS 10.4, Prisma 5.22 alignés.

---

## Corrections appliquées le 2026-07-05 (working tree, non déployé)

> ⚠️ **2ᵉ secret trouvé pendant les correctifs** : la clé **`FAL_KEY`** (fal.ai) était aussi en clair dans `CLAUDE_API_INTEGRATION.md:26` et `QUICK_START.md:46`. **À révoquer/régénérer** sur fal.ai au même titre que la clé Anthropic.

| Finding | Correctif appliqué | Fichiers |
|---------|--------------------|----------|
| P0-1 | Clés Anthropic **et** FAL rédigées dans les 3 `.md` (working tree) | `CLAUDE_API_INTEGRATION.md`, `INTEGRATION_COMPLETE.md`, `QUICK_START.md` |
| P0-2 | `parseInt`→`parseFloat` sur TVA (3 occurrences) | `facturation/components/LignesEditor.tsx`, `facturation/page.tsx` |
| P0-3/P0-4 | Numérotation devis/factures **delete-safe** (max, plus count) + **verrou consultatif Postgres** partagé entre les 2 chemins `F-` (plus de doublon concurrent ni collision inter-tables) | `quotes.service.ts`, `invoices.service.ts` |
| P0-5 | `onDelete: Cascade`→`SetNull` (Quote/Invoice/Signature) et `Restrict` (PaymentRequest) + migration SQL | `prisma/schema.prisma`, `prisma/migrations/20260705_fk_setnull_token_unique/` |
| P0-6 | AVOIR → montants **négatifs** (normalisation idempotente des lignes) | `invoices.service.ts` |
| P0-8 | `token @unique` sur Quote/Invoice (migration ; base vérifiée sans doublon) | `prisma/schema.prisma` + migration |
| P1-1 | `chat-marketing` : rate-limit 15/min/IP + bornage messages (≤20, ≤8000 car., rôles validés) | `app/api/chat-marketing/route.ts` |
| P1-2 | `getClientIp` lit `x-forwarded-for`/`x-real-ip` sur Vercel | `lib/server/rate-limit.ts` |
| P1-7 | SOLDE : `montantDeja` borné au total TTC (net à payer ≥ 0) | `invoices.service.ts` |
| P1-9 | Stats en `Decimal` (fin de l'accumulation float) | `stats.service.ts` |
| P1-10 | `@Min(0)` sur quantity/prix stock | `stock/dto/create-stock-item.dto.ts` |
| P1-13 | Signature : redirection **uniquement sur succès** API (+ alerte sur échec) | `dossiers/[id]/page.tsx` |
| P1-16 | Bloc `crons` (relances 9h) rétabli dans la config Vercel active | `apps/web/vercel.json` |
| P2-20 | bcrypt refresh cost 10→12 | `token-rotation.service.ts` |

**Vérifié** : `pnpm --filter @avra/api build` OK, `tsc --noEmit` web 0 erreur.

### Ce qui reste à ta main (non fait automatiquement, par prudence)
1. **Révoquer** la clé Anthropic **et** la clé FAL, puis **purger l'historique git** (BFG/`git filter-repo`) — non fait car interdit de force-push `main`.
2. **Déployer** pour appliquer la migration Prisma (`migrate deploy` tourne au build Vercel) — base prod vérifiée compatible (0 devis/facture, 0 doublon token).
3. **P1-16 `includeFiles`** : laissé tel quel (le déploiement actuel fonctionne, NFT trace probablement l'API). À confirmer via un déploiement **Preview** que `/api/v1/health` répond.
4. **env.validation** : laissé tel quel (fail-fast déjà présent sur DATABASE_URL/JWT_SECRET). Optionnel : ajouter `WEB_URL`/`API_URL` au `REQUIRED` **après** avoir confirmé qu'elles sont bien définies sur Vercel.
5. Findings **non traités** (nécessitent décision/refonte) : P0-4 unification définitive des 2 chemins de conversion, P1-3 SSRF `copyExternalImageToIaRenders`, P1-4/P1-5 secrets webhook/tokens publics, P1-6 Redis (blacklist/throttler), P1-12 TVA multi-taux, P2-* (voir listes ci-dessus).

---
*Rapport généré le 2026-07-05. Localisations en `fichier:ligne`. Sévérités re-vérifiées manuellement — plusieurs « CRITIQUE IDOR » de la revue automatique ont été rétrogradés après relecture (isolation effective).*
