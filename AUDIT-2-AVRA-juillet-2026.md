# AUDIT COMPLET #2 — AVRA
**Date : 13 juillet 2026 · État post-corrections (audit #1) · Audit SEULEMENT — aucune modification appliquée**

Audit neuf, œil vierge, code tel qu'il est aujourd'hui. 5 axes parcourus en profondeur :
backend/API, pages & UI, composants/hooks/stores, config/déploiement/SEO/emails/sécurité infra,
modèle de données Prisma & intégrations. Chaque point est cité `fichier:ligne`.

> **Rien n'a été corrigé.** Ce document est une photographie pour décider quoi traiter ensuite.

---

## 🔴 SYNTHÈSE — LE TOP À TRAITER D'ABORD

| # | Sévérité | Problème | Fichier |
|---|----------|----------|---------|
| 1 | **CRITIQUE** | Middleware d'auth **entièrement neutralisé** : `PUBLIC_PATHS` contient `'/'` + test `startsWith('/')` → toujours vrai → aucune route protégée côté serveur | `middleware.ts:24,158` |
| 2 | **CRITIQUE (juridique)** | Faux avis / stats fabriquées / prix contradictoires (0€ / 49€ / 79€ / 149€) / « 2 400+ professionnels » en pleine bêta privée (2 users réels) | `page.tsx:1160-1192,1676` + pages villes/blog |
| 3 | **ÉLEVÉ** | `vercel.json` actif (`apps/web`) : `includeFiles` manquant (risque `MODULE_NOT_FOUND` sur `/api/v1/*`) + `migrate deploy` sur pooler pgbouncer | `apps/web/vercel.json:3,6-11` |
| 4 | **ÉLEVÉ** | Auth intervenant externe cassée : `registerIntervenant` crée un User sans `UserWorkspace`, mais `login`/`validateUser` l'exigent → 401 systématique | `auth.service.ts:359-444` |
| 5 | **ÉLEVÉ** | Split de domaine `avra-app.fr` vs `avra.fr` (+ `www.avra.fr`) sur canonicals/sitemap/emails/legal → SEO cassé + risque délivrabilité | multiple |
| 6 | **ÉLEVÉ** | Documents admin stockés sur FS local → cassé sur Vercel serverless (FS read-only) | `documents.service.ts:371-377` |
| 7 | **ÉLEVÉ** | Stock : édition inline perd la quantité + corruption du modèle | `stock/page.tsx:311-324,630-635` |
| 8 | **ÉLEVÉ** | `perdreDossier` remplace le cuid DB par un id local → `restoreLostProject` ne persiste jamais | `useProjectActions.ts:201-245` |

---

## 1. BACKEND / API (NestJS)

### 🔴 À corriger
- **[ÉLEVÉ] Auth intervenant externe cassée.** `registerIntervenant` (`auth.service.ts:359-444`) crée un `User` sans `UserWorkspace`, JWT avec `workspaceId:null`. Or `validateUser`/`login` exigent un `UserWorkspace` → 401 systématique pour les intervenants externes.
- **[ÉLEVÉ] `convertToInvoice` = conversion « fantôme ».** `quotes.service.ts:189-224` : écrase la référence `D-` par une `F-` sur le même enregistrement au lieu de créer une facture liée. Perte de traçabilité devis↔facture.
- **[MOYEN] `settings.service` écrit tout dans `WorkspaceSettings.extra` (JSON)** et n'alimente jamais les colonnes `address`/`siret` lues par le portail public → mentions légales/portail vides.

### ⚠️ Non câblé / RBAC
- **Pagination non exposée** sur les contrôleurs `clients`, `orders`, `payments`, `signature`, `intervenants`, `events` (les services paginent, les contrôleurs renvoient tout).
- **RBAC manquant** sur `events`, `intervenants`, `notifications`, `stats`, `demandes`, `dossier-documents`, `ia` ; incohérent sur `POST` stock/clients (pas de `@Roles`).
- **`IaJob` créé en `QUEUED` sans worker** (chemin NestJS legacy `ia.service.ts:140-150`, `ia.controller.ts:55-65`) → jobs jamais traités si appelés.

### ✅ Bon
- Isolation multi-tenant renforcée (ownership `where:{id,workspaceId}` ajoutée partout audit #1), références serveur-générées + immuables, tokens `randomBytes`, `@@unique([workspaceId,reference])` posé sur Quote/Invoice, throttling public sur `demandes`.

---

## 2. PAGES & UI

### 🔴 À corriger (juridique — CRITIQUE)
- **Faux avis, stats & prix contradictoires** : `0/49/79/149€`, « 250/500/2 400 professionnels », « 98% satisfaction », « 8h/sem » sur homepage + pages villes. Contradiction directe avec un commentaire code affirmant que ces chiffres ont été retirés (risque DGCCRF, pratiques trompeuses).
- **Comparatif nominatif de concurrents** (blog) — risque dénigrement.
- **Mentions légales à trous** (`XX XX`, SIRET/adresse/tel placeholders).
- **`&apos;` littéraux dans des strings JS** sur `cuisiniste`/`menuisier`/`agenceur`/`architecte-interieur` + `\'` dans `temoignages:217-219` (texte cassé à l'écran).

### 🔴 À corriger (fonctionnel — ÉLEVÉ)
- **Stock inline edit perd la quantité** (`stock/page.tsx:311-324`) + corruption modèle (`:630-635`).
- **`dossiers/nouveau` : le statut choisi est ignoré.**
- **Notifications affichent « undefined: undefined »** + type toujours `info` (`:29,31`).
- **Intervenants : 27 métiers UI mais 11 `BACKEND_TYPES`** → les autres sauvés en `AUTRE`.
- **Export CSV catalogue** : colonnes en-têtes ≠ colonnes données (`:1531` vs `:1360`).

### ⚠️ Non câblé / orphelins
- `/e-paiement` (placeholder) vs `/epaiement` (fonctionnel) — doublon ; `/commandes` orphelin ; double homepage `page.tsx` vs `(marketing)/accueil` ; `api/save-image` cassé+orphelin.
- Paramètres : stubs sans `onClick` (Trames, Import, logo, Chorus Pro, Réinitialiser).
- `epaiement` : mention « SSL/3D Secure » trompeuse ; iframe E-Paiement double-chrome (`facturation:1414-1424`).

---

## 3. COMPOSANTS / HOOKS / STORES

### 🔴 À corriger
- **[ÉLEVÉ] `perdreDossier`** échange le cuid DB contre un id local `'p'+uid` → `restoreLostProject` ne re-persiste jamais (`useProjectActions.ts:201-245`).
- **[ÉLEVÉ] Alertes auto rejetées réapparaissent** (`useUIStore.ts:97-116` : dismiss non persistant).
- **[ÉLEVÉ] Numérotation facture ignore `useConfigStore.numerotation`** → réglage Paramètres purement décoratif.
- **`convertDevisToFacture` SOLDE** ne déduit pas `montantDeja` (montant faux sur soldes).
- **`useStatistiques.totalCA` somme toutes les factures** — les AVOIRs gonflent le CA.

### ⚠️ Non câblé / fuites
- **`useHistoryStore.checkAndCreateRelances` jamais appelé** → moteur de relances mort.
- **`useDemandeTemplatesStore` (`'avra-demande-templates'`) non purgé** au logout → fuite inter-comptes.
- Hooks morts : `useAIChat`, `useAIImage`.

---

## 4. CONFIG / DÉPLOIEMENT / SEO / EMAILS / SÉCURITÉ INFRA

### 🔴 À corriger
- **[CRITIQUE] Middleware auth neutralisé** — `PUBLIC_PATHS` inclut `'/'` + `startsWith('/')` toujours vrai (`middleware.ts:24,158`). La redirection `/login` (l.164-198) est du code mort. (API encore protégée par JwtAuthGuard.)
- **[ÉLEVÉ] `apps/web/vercel.json`** : `functions.api/index.ts` **sans `includeFiles`** alors que le handler fait `require('../../api/dist/app.module')` → risque `MODULE_NOT_FOUND`. Seul le `vercel.json` racine (inactif) a `includeFiles`.
- **[ÉLEVÉ] `migrate deploy` sur pooler pgbouncer** (`apps/web/vercel.json:3`) : les migrations exigent `DIRECT_URL` (:5432). Le racine le fait bien mais est inactif.
- **[ÉLEVÉ] Split domaine `avra-app.fr` / `avra.fr` / `www.avra.fr`** : canonicals/sitemap/robots/JSON-LD/Plausible en `avra-app.fr` ; emails/legal/footer en `avra.fr`. Incohérence SEO + délivrabilité (SPF/DKIM doit matcher les liens).
- **[ÉLEVÉ] Pages HTML statiques fantômes indexables** : `public/landing.html` + `public/site/*.html` (essai 14 j inexistant, « AVRA SAS », mauvais domaine) non bloquées par robots.
- **[ÉLEVÉ] Emails : fallback expéditeur sandbox silencieux** — `EMAIL_FROM` défaut `onboarding@resend.dev` (`email.ts:51`) → en prod sans var, tous les emails aux vrais destinataires échouent silencieusement.

### ⚠️ Non câblé / TODO
- **CSP : nonce généré mais jamais appliqué**, `script-src` garde `'unsafe-inline'` (`middleware.ts:94-121`) → XSS-CSP inopérante.
- `SearchAction` JSON-LD pointe vers `/search` inexistant.
- `Dockerfile` racine cassé (`CMD pnpm start:prod` — script absent).
- `email forgot-password` non branché (TODO connu).

### ❓ Incohérences
- **JWT_EXPIRES_IN défaut `7d`** en code (`env.validation.ts:25`) vs `15m` annoncé → access tokens 7 jours si var non posée.
- Double homepage `/` vs `/accueil` (duplicate content, tous deux dans sitemap).
- Claims FAQ invérifiables (« chiffrement bout en bout », « audits trimestriels », « support 7j/7 »).

### ✅ Bon
- CORS fail-fast prod, Helmet + ValidationPipe, Sentry scrubbe les secrets, GA4 sous consentement (Consent Mode v2), webhook Resend signature Svix, rate-limit waitlist, headers sécu complets.

---

## 5. MODÈLE DE DONNÉES PRISMA & INTÉGRATIONS

### 🔴 À corriger
- **[MOYEN] Dérive schéma↔migration** : `Project_workspaceId_archivedAt_idx` existe en migration mais pas dans le schéma (`schema.prisma:559-561`) → `DROP INDEX` au prochain `migrate dev`.
- **[MOYEN] `SupplierOrder.reference` sans `@@unique`** (`schema.prisma:1154`) — doublons possibles.
- **[MOYEN] Enums miroir désynchronisés** : `MembershipStatus`, `WorkspaceInvitationStatus` absents de `prisma-enums.ts` / `types/prisma-client.d.ts` / `packages/types`.
- **[FAIBLE] `IaJob.costEUR` stocke des USD** (`architect/route.ts:234`).

### ⚠️ Non câblé
- **Refresh URLs signées Supabase (30 j) non implémenté** (`jobs/route.ts:18-19`) → historique IA en 403 après 30 jours (les `paths` sont pourtant stockés).
- Endpoints IA NestJS legacy dupliqués (`/ia/rendu`, `/ia/coloriste`) non utilisés par le front.
- `IaService.uploadFile` écrit sur FS local (non pérenne serverless).
- Cron `cleanup-stuck-jobs` non planifié (nettoyage opportuniste seulement).
- IA Architect/Coloriste-Architect/Retouche réutilisent tous `type:'EDIT'` → indistinguables en historique.

### ❓ Incohérences
- `Quote.status`/`signatureStatus`/`Invoice.status`/`type` en `String` libre alors qu'un enum `SignatureStatus` existe.
- `Reminder.folderId` colonne orpheline (sans relation ni index).
- Double axe de statut projet `lifecycleStatus` + `pipelineStatus` (redondance PERDU/GAGNE ≈ PERDU/SIGNE).

### ✅ Bon
- `onDelete` des pièces comptables cohérent (SetNull/Restrict), tokens uniques partout, `Decimal(12,2)` généralisé, index de requête présents (IaJob, Notification, Demande), chaîne fallback IA OpenAI→Anthropic→mock robuste (timeouts, retries, concurrence limitée), download proxy anti-SSRF (allowlist).

---

## RECOMMANDATION D'ORDRE DE TRAITEMENT

1. **Sécurité déploiement (bloquant)** — middleware auth (#1), `includeFiles` + migrate `DIRECT_URL` (#3). Un seul mauvais déploiement casse `/api/v1/*`.
2. **Juridique (exposition réelle)** — retirer faux avis/stats/prix contradictoires + mentions légales (#2), pages HTML fantômes, domaine unique (#5).
3. **Fonctionnel visible** — auth intervenant (#4), documents admin serverless (#6), stock inline (#7), perdreDossier (#8), notifications, numérotation facture.
4. **Dette non bloquante** — RBAC/pagination contrôleurs, enums miroir, dérive index `archivedAt`, refresh URLs signées, purges stores.

---

*Fin de l'audit #2. Aucune modification appliquée — en attente de ta décision sur ce qu'on traite (et dans quel ordre).*
