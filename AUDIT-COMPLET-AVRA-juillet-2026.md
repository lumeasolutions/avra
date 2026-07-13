# AUDIT COMPLET — AVRA (juillet 2026)

Audit en profondeur de toute l'application : backend NestJS, frontend Next.js (pages + composants + hooks + stores), configuration/déploiement/SEO/emails, base de données Prisma et intégrations IA. Chaque point est référencé `fichier:ligne` pour action directe.

**Sévérités :** 🔴 CRITIQUE · 🟠 ÉLEVÉ · 🟡 MOYEN · ⚪ FAIBLE

---

## 0. Résumé exécutif

**Verdict global :** l'architecture est saine et beaucoup de choses sont **très bien faites** (auth, JWT, CSRF, isolation multi-tenant manuelle, Decimal monétaire, fallback IA OpenAI→Anthropic, storage Supabase, headers de sécurité, RGPD/consentement). Ce n'est pas une app « fragile ». Mais un audit fin révèle un ensemble de **bugs concrets, de code mort, de pages/boutons non câblés et de risques juridiques (SEO/mentions légales)** qui méritent un nettoyage avant le lancement public de janvier 2027.

**Déjà corrigé aujourd'hui (cette session) :**
- ✅ `EMAIL_FROM` `no-reply@` → `contact@avra-app.fr` (déployé). Plusieurs auditeurs signalaient encore l'ancien état — c'est réglé.
- ✅ SPF/DKIM/DMARC confirmés en place (DMARC géré par IONOS).

**Ce qui ressort le plus (à traiter en priorité) :**
1. Une **feature paiement cassée** en permanence (DTO `@IsUUID` sur des ids cuid).
2. Une fonction `sanitize()` qui **corrompt les données** (supprime espaces et tirets).
3. Plusieurs **IDOR cross-tenant** (documents, factures, devis, IA) — accès à des ressources d'un autre client.
4. **Pas de contrôle de rôle** sur factures/devis/réglages (un lecteur peut émettre/supprimer des factures).
5. **Pages fonctionnelles débranchées** (`/epaiement`, `/commandes`, `/dashboard`) vs placeholders affichés.
6. **Risques juridiques** : faux avis dans le JSON-LD (4,9/312), mentions légales avec `XX XX`, stats marketing inventées.
7. Beaucoup de **code mort et de boutons non câblés** (page Paramètres surtout).

---

## 1. TOP PRIORITÉS

### P0 — À corriger en premier (feature cassée / sécurité / juridique)

- 🔴 **Paiements cassés** — `apps/api/src/modules/payments/dto/create-payment.dto.ts:11` : `@IsUUID()` sur `projectId` alors que les ids Prisma sont des **cuid** → tout `POST /payments` renvoie 400. **Fix : `@IsString()`.**
- 🔴 **`sanitize()` corrompt le texte** — `demandes.service.ts:55-59`, `intervenant-dossiers.service.ts:9-12` (et suspect `documents.service.ts:121`) : la regex retire **espaces et tirets** (« Jean-Pierre 12 rue » → « JeanPierre12rue »). **Fix : `/[\x00-\x1f\x7f]/g`.**
- 🔴 **IDOR cross-tenant** (accès inter-clients) : `documents.service.ts:193-209` (storedFileId/projectId), `invoices.service.ts:138-139,170-173`, `quotes.service.ts:104,135`, `ia.service.ts:105-137` (projectId/sourceDocumentId). **Fix : `findFirst({where:{id, workspaceId}})` avant chaque écriture liée.**
- 🔴 **Pas de RBAC sur documents légaux/réglages** — `invoices.controller.ts:12-14`, `quotes.controller.ts:19-20`, `settings.controller.ts:14-27` : un rôle VIEWER peut émettre/supprimer des factures, un MEMBER peut réécrire toute la config workspace. **Fix : `RolesGuard` + `@Roles('OWNER','ADMIN')`.**
- 🔴 **Références factures/devis non uniques + modifiables client** — `invoices.service.ts:134`, `quotes.service.ts:100`, schéma sans `@@unique`. Non-conformité légale FR (numérotation séquentielle unique). **Fix : refuser `reference` en entrée + `@@unique([workspaceId, reference])`.**
- 🔴 **Token portail public fourni par le client** — `quotes.service.ts:114` : le token d'accès public est accepté depuis la requête, sans génération serveur ni expiration → énumération/brute-force expose des données client (`public.service.ts:50-97`). **Fix : `crypto.randomBytes(32)` serveur, throttle dédié, expiration.**
- 🔴 **Faux avis dans le JSON-LD** — `apps/web/app/page.tsx:104` : `aggregateRating 4.9 / 312 avis` sur une bêta à 2 utilisateurs. Violation des règles Google (risque de pénalité manuelle + perte des rich snippets) et risque DGCCRF. **Fix : supprimer `aggregateRating` tant qu'il n'y a pas d'avis réels.**
- 🔴 **Mentions légales incomplètes** — `mentions-legales/page.tsx:41,47,50` (SIRET/tél/adresse en `XX XX`), `cgv/page.tsx:59` (URL preview `avra-kappa.vercel.app`). Obligation légale. **Fix : renseigner les vraies infos.**

### P1 — Juste après (bugs de flux visibles + incohérences importantes)

- 🟠 **`/epaiement` fonctionnelle est inaccessible**, la Sidebar affiche `/e-paiement` = placeholder « Bientôt disponible » (`Sidebar.tsx:388`, `e-paiement/page.tsx:95-103`). **Fix : brancher la Sidebar sur `/epaiement` (ou supprimer le doublon).**
- 🟠 **`/commandes` et `/dashboard` orphelines** (0 lien entrant) alors qu'elles sont complètes ; les 3 portails métier n'affichent aucun KPI (le `useMemo stats` est calculé mais jamais rendu).
- 🟠 **Flux « facture depuis SAV » cassé** — `sav/page.tsx:397` passe `?createFromDemande=…` mais `facturation/page.tsx:1437` ne lit que `?nouveau` → le clic ne fait rien.
- 🟠 **TVA fausse** — `dossiers/nouveau/page.tsx:215` stocke un **code** (`FR_5_5`, `AUTRE`) et `dossiers/[id]/page.tsx:1330` le re-parse en nombre (`FR_5_5`→55, `AUTRE`→NaN→20). Montants TVA/TTC erronés.
- 🟠 **Contradiction de synchro factures/paiements** — `useDataSync.ts:471-513` vs `:548-589` : `/payments` est mappé dans `invoices` puis écrasé par `syncInvoices` → factures perdues ; et le tableau `payments` n'est jamais hydraté → **fausses alertes « acompte non reçu »**.
- 🟠 **Fuite inter-comptes de la conversation Assistant** — `useAssistantStore.ts:128` persiste sous `'avra-assistant'` mais le purge au logout cible `'avra-assistant-store'` (`useAuthStore.ts:22-47`) → jamais effacée sur navigateur partagé.
- 🟠 **Domaine incohérent** `avra-app.fr` (SEO/canonicals/Plausible/emails techniques) vs `avra.fr` (site public, liens des emails marketing, contacts). À trancher et centraliser.
- 🟠 **`middleware.ts:24` — gate d'auth neutralisé** : `PUBLIC_PATHS` contient `'/'` et le test `startsWith('/')` est toujours vrai → toute la redirection `/login` est du code mort (atténué car l'API valide chaque requête).

---

## 2. Backend API (NestJS) — `apps/api/src/`

### 🔴 À corriger
- Paiements cassés (`create-payment.dto.ts:11`, cf. P0).
- `sanitize()` destructeur (`demandes.service.ts:55-59`, `intervenant-dossiers.service.ts:9-12`, cf. P0).
- IDOR : `documents.service.ts:193-209`, `invoices.service.ts:138-139,170-173`, `quotes.service.ts:104,135`, `ia.service.ts:105-137`, `signature.service.ts:156` (cf. P0).
- RBAC absent : invoices/quotes/settings (cf. P0).
- Références non uniques/modifiables + statut librement écrit sans machine à états (`invoices.service.ts:170-173`, `quotes`, `signature.controller.ts:122`→`service:212 status as any`). `PREFIX_BY_TYPE` retombe sur `'F'` pour un type inconnu (`invoices.service.ts:73`).
- **Endpoint audit cassé** — `audit.controller.ts:21` passe `limit` dans le paramètre `page` → `skip=9900` → le journal d'audit renvoie **vide**.
- Token portail public client-fourni (`quotes.service.ts:114`, cf. P0).
- 🟡 **Antivirus fail-open** — `virus-scan.service.ts:26-46` : sans `CLOUDMERSIVE_API_KEY`, tout fichier est déclaré « clean ». Poser la clé + alerte Sentry sur skip.
- 🟡 **Upload direct (signed URL) non revalidé** — `dossier-documents.service.ts:356-488` : magic-bytes non relus au finalize (seul le MIME déclaré est vérifié).
- 🟡 `supplierId` non vérifié cross-tenant (`stock.service.ts:12-14,94`).
- 🟡 Invalidation de cache orders inopérante (mauvais format de clé) — `orders.controller.ts:52-63` vs `workspace-scoped-cache.interceptor.ts:30`.
- 🟡 `OrderLineDto.quantity` `@IsNumber` mais colonne `Int` (`create-order.dto.ts:8-10`) → 500 Prisma.
- 🟡 `DUMMY_BCRYPT_HASH` malformé (`auth.service.ts:22`) → neutralise l'anti-timing sur emails inexistants.
- 🟡 `JWT_SECRET` sans longueur minimale (`env.validation.ts:21-22`) → `@MinLength(32)`.
- ⚪ Fuite d'existence par codes distincts 404/403 (`dossier-documents.service.ts:201-208`). Logique consentement RGPD inversée (`gdpr-consent.guard.ts:60`). `users.service.ts:8-18` retourne le passwordHash.

### 🟡 À améliorer
- **Pagination implémentée mais jamais exposée** (systémique) : clients, events, orders, payments, intervenants, notifications, stock controllers → au-delà de 50/100, données invisibles.
- **Bodies inline non validés** (pas de classe DTO donc ValidationPipe inopérant) : documents, intervenant-dossiers, demandes, ia, public, auth (plusieurs endpoints).
- Endpoints publics `demandes` (dont 3 uploads non authentifiés) sans `@Throttle` dédié ; jeton HMAC public **permanent** sans expiration/révocation (`demandes.service.ts:435-453`).
- `convertFromQuote` sans idempotence (facture ré-émissible) — `invoices.service.ts:209-277` ; deux mécanismes de conversion incohérents.
- Uploads sur disque local éphémère (perdus en serverless) : `documents.service.ts:369-448`, `ia.service.ts:81-89` (+ suppression dans `/tmp/uploads`, chemin incohérent). Basculer sur Supabase.
- Agrégations chargées en mémoire (findMany complet) : `demandes.service.ts:1022`, `invoices.service.ts:112`, `quotes.service.ts:80`.
- `Sentry.tracesSampleRate: 1.0` en prod (`main.ts:15`) → réduire.
- Divers : `remove/updateStatus` renvoient 200 au lieu de 404, YouSign base URL défaut = sandbox, validation email `@IsString` au lieu de `@IsEmail`, `ParseEnumPipe` manquant sur query enum.

### ⚠️ Non câblé / TODO / code mort
- **`PathTraversalGuard`** jamais importé (mort).
- **`WorkspaceGuard` + `PermissionGuard` = no-op** : ne s'activent jamais (aucun `workspaceId` en URL, aucun `@Permission()` posé). La matrice de permissions référence des rôles **inexistants** (`MANAGER`, `EDITOR`) et **omet** les vrais (`MEMBER`, `INTERVENANT`). Fausse défense en profondeur.
- **`AuditInterceptor`** : skip inopérant (compare `auth/login` sans le préfixe `/api/v1/…`) ; `extractEntityType` jamais appelé.
- **Throttler in-memory** (reset à chaque cold-start serverless) → brute-force non fiable ; TODO Redis non branché.
- **`TokenBlacklistService`** in-memory par-instance (scan O(N)).
- Champs de paiement acceptés puis ignorés (`create-payment.dto.ts:20-30`) ; champs signature morts (`signers`, `storedFileId`).
- Nombreux `(this.prisma as any)` (typage perdu) sur invitations/demandes/auth.

### ❓ Manques
- **Aucun worker/queue IA** : `createJob` insère des `IaJob` en `QUEUED` (`ia.service.ts:126`) jamais traités côté API (les rendus passent par les routes web synchrones). Jobs orphelins.
- Persistance de l'acceptation publique d'un devis (`signerName` reçu mais jamais enregistré — `public.service.ts:103-125`) → traçabilité juridique manquante.

### ✅ Points forts
Auth (bcrypt 12, anti-énumération, forgot/reset à réponse constante), JWT durci (HS256 épinglé, refresh signé+rotation+blacklist), cookies HttpOnly/Secure/SameSite=Strict, CSRF double-submit `timingSafeEqual`, webhook YouSign HMAC exemplaire, filtre d'exceptions Prisma→HTTP sans fuite, isolation multi-tenant manuelle globalement correcte, Decimal monétaire + `pg_advisory_xact_lock` sur numérotation, cache scopé workspace, uploads bufferisés durcis (MIME+extension+magic-bytes+rollback), extraction IA bornée et sans perte silencieuse.

---

## 3. Frontend — Pages (`apps/web/app/`)

### 🔴 À corriger
- Doublon `/e-paiement` (placeholder affiché) vs `/epaiement` (fonctionnelle, débranchée) — cf. P1.
- Flux facture-depuis-SAV cassé (`sav/page.tsx:397` vs `facturation/page.tsx:1437`) — cf. P1.
- **`api/save-image/route.ts:111-114`** : écrit dans `process.cwd()/public/images` (FS read-only Vercel) → 500 systématique. Route **orpheline**. Supprimer.
- Deep-links cassés : `?demande=id` (`planning/page.tsx:718`, `sav`) et `?tab`/`createFromDemande` jamais lus par la cible.
- TVA code vs taux → montants faux (cf. P1).
- **Formulaires non câblés** : liste d'attente `temoignages/page.tsx:408-442` (form sans `onSubmit`), `blog/NewsletterForm.tsx:19-36` (bouton sans handler).
- **`portail-admin/page.tsx:23-25` sans gate serveur** (la coque admin s'affiche pour tout visiteur ; contraste avec `/support` qui redirige).
- **Portails métier sans KPI** : `useMemo stats` calculé mais jamais rendu (architecte/cuisiniste/menuisier) + quasi-doublons à 90 %.
- Bug édition inline Stock (`stock/page.tsx:632-634`) : « Modèle » écrit `model+material` dans `model` → matière perdue au save.
- Fuites d'erreurs backend au client (`api/ia/chat/route.ts:80`, `api/signature/route.ts:41`).
- `api/ia/download/route.ts` sans auth ni rate-limit ; routes IA de génération sans vérif d'ownership du `projectId`.
- `forgot-password/page.tsx:28-30` affiche « Email envoyé ! » même sur erreur réseau.
- `intervenant/demandes/[id]/page.tsx:103-133` : `updateMyStatus('TERMINEE')` hors try/catch (modale figée si échec).
- Lien mort **`/decorateur`** (`metiers/page.tsx:91,148,301`) → 404 (bouton + JSON-LD).

### ⚠️ Non câblé / stubs / TODO
- **Page `/parametres`** (le plus gros nid de stubs) : tous les boutons Import/Export sans `onClick` (`:1508,1531,1544,1561`), « Importer un logo » (`:408`), Chorus Pro non contrôlé (`:502-516`), 12 boutons Trames « Modifier/Utiliser » (`:1310,1313`) sans handler, section « Changer de portail (DEV) » exposée à tout utilisateur (`:287,1797`).
- **`ia-studio`** : la doc annonce 3 onglets, seuls 2 rendus ; 2 blocs désactivés par `{false && …}` (`IaStudioClient.tsx:1856,1932`) = code mort + routes API appelées uniquement par du JSX jamais rendu ; libellé « Rendu Réaliste » ≠ « IA Architect » de la doc.
- `dossiers/[id]/page.tsx:777` bouton « Comparer » sans `onClick` ; `alert()` sur échec signature (`:469`).
- `historique/page.tsx:98` filtre par utilisateur calculé mais aucun contrôle UI.
- `notifications/page.tsx:46-52` : marquer lu / supprimer purement locaux (non persistés → reset au reload).
- Routes orphelines/mortes : `api/save-image`, `api/ia/cleanup-stuck-jobs` (doublon, cron jamais implémenté), `api/ia/rendu` boucle vision-critic morte (`MAX_AUTO_RETRIES=0`), `api/ia/jobs/refresh-urls` référencé mais absent, `api/signature` PUT/DELETE non implémentés.
- Apostrophes littérales `&apos;`/`\'` affichées telles quelles dans des pages SEO indexées (`cuisiniste`, `menuisier`, `agenceur`, `architecte-interieur`, `temoignages:219`).

### 🟡 À améliorer
- CTA « Demander une démo » incohérent (mène tantôt `/demo`, `/contact`, `/comment-ca-marche`) → uniformiser.
- Stats/avis fabriqués (home `2 400+`/`98%`, villes `3 000+`, temoignages `4.8/5`) + prix JSON-LD incohérents (`0` vs `49` vs 149€ réel).
- `(marketing)/accueil/page.tsx` doublon/orphelin de la home, mentionne « Basé sur Claude AI » alors que provider = OpenAI.
- `planning/page.tsx:1496` bouton « Planifier » désactivé si aucun dossier client (compte neuf bloqué).
- Nombreux `alert()` de succès/erreur au lieu de feedback inline ; `catch → []` masque des erreurs réseau en empty state.

### ✅ Points forts
Formulaires `contact`/`demo`/`rejoindre` complets (loading/erreur/succès), sécurité API web solide (`jwt-verify` rejette `alg:none`, `support/reset` = modèle CSRF+confirm+backup+transaction+audit, `support/dossier` fail-closed), routes IA `coloriste`/`rendu` avec timeout `Promise.race`, pages abouties (`admin-docs`, `dossiers/[id]`, `statistiques`, `planning-gestion`, portails publics `intervention/[token]` et `e-facturation/[token]`).

---

## 4. Frontend — Composants / Hooks / Stores

### 🔴 À corriger
- Contradiction `syncPayments`/`syncInvoices` + `payments` jamais hydraté → factures perdues + fausses alertes acompte (`useDataSync.ts:471-589`, `useFacturationStore`, cf. P1).
- Fuite inter-comptes conversation Assistant (`useAssistantStore.ts:128` vs `useAuthStore.ts:22-47`, cf. P1).
- **`createProject` hardcodé** — `useProjectActions.ts:100-102` : force `name:'Cuisine …'` + `tradeType:'CUISINISTE'` quelle que soit la profession.
- **`iaConfig` sans optional chaining** — `AssistantPanel.tsx:809-830` : crash `send()` possible si non hydraté (alors que `AssistantFAB.tsx:15` le traite comme optionnel).
- **Pastille de notifications jamais affichée** — `NotificationsDropdown.tsx:54-56` : `load()` uniquement si le dropdown est ouvert → `unreadCount` reste 0.
- iframe PDF `sandbox="allow-same-origin allow-scripts"` (`AdminDocPreviewModal.tsx:234`) : combinaison qui annule le sandbox → retirer `allow-scripts`.
- Catégorie par défaut fantôme `'Divers'` (`AdminDocEditModal.tsx:99,110`) absente de `CATEGORY_GROUPS`.
- `dossiersPerdus` perd `prixLignes`/`vendeurName` à chaque resync (`useDataSync.ts:301-307`) → Tableau 3 vendeur/perdus faussés.
- Décalage de fuseau `toISOString().slice(0,10)` sur dates locales (`PlanningCalendar.tsx:87`, `MiniCalendarWeek.tsx:80`, `DateButoireValidationModal.tsx:560`) → events du dernier jour manqués ; events hors 9-13h masqués.
- `SendToIntervenantDrawer.tsx:210-224` : reset au close ne vide pas `uploads`/`selectedIds` → pièces jointes persistent.
- Camemberts SVG dégénérés à 100 % un seul segment (`StatsTableauStatut.tsx:269`, `StatsTableauVendeur.tsx:156`).
- Mutation directe de state Zustand (`StatsGateModal.tsx:377`, `useConfigStore` reset oublie `alertesConfig` `:421`).
- ⚪ `useHistoryStore.ts:125` crash si `signedDate` absent ; `useAIChat.ts:59` rejoue les erreurs 400/500 ; `DateButoireValidationModal.tsx:782` bouton bloqué si succès sans démontage.

### ⚠️ Code mort / non câblé (à supprimer)
- **`useRelanceEngine.ts`** (fichier entier) : jamais monté, et buggé (dédup par `text.includes(key)` qui ne matche jamais).
- **`useHistoryStore.checkAndCreateRelances`** (`:98-156`) : jamais appelée → `relances[]` toujours vide → alertes #25-27 jamais déclenchées.
- **`useEventActions.ts`** (fichier entier) : non utilisé ; s'il était branché, il créerait chaque event **en double**.
- **`AlertsPanel.tsx`**, **`Topbar.tsx`** (fichiers entiers) : jamais importés (superseded), contiennent boutons/champs factices.
- **`useDemandeTemplatesStore`** + `TemplatesPicker` + formulaire invitation inline dans `SendToIntervenantDrawer` : jamais rendus.
- `useAlertEngine.ts:701-715` (#23) lit `interv.dossiers` que `syncIntervenants` force toujours à `[]` → alerte jamais déclenchée.
- `BackButton.tsx`/`MarketingChatWrapper.tsx` : listes de routes désynchronisées des vraies routes.

### ❓ Incohérences de logique
- **3 systèmes de relances/alertes concurrents** : `useAlertEngine` (vivant) + `useRelanceEngine` (mort) + `useHistoryStore.checkAndCreateRelances` (mort), conventions incompatibles.
- Source URGENT/RETARD divergente : `AssistantPanel` (via `lib/alertClassify`) vs `Sidebar.tsx:42,44` (recalcul en dur) → badges ≠ panneau.
- Enum statut intervenant incohérent : `'A CLASSER'` (espace) vs `'A_CLASSER'` (underscore).
- `persistVersioning.ts:26` `STORE_VERSION` figé à 1 malgré des ruptures de forme documentées.
- `/payments` traité comme « factures » (statuts anglais `PAID` vs français `PAYÉE`).
- Taxonomie catégories admin-docs contradictoire (8 groupes vs 5 clés plates).
- `Sidebar.tsx:34` `SUPPORT_EMAILS` = `lumeasolutions@outlook.fr` (double s) ≠ `BETA_ADMIN_EMAILS` triple s.

### ✅ Points forts
`lib/folderTree`, `lib/echeanceStatus`, `lib/alertClassify` (purs et corrects), `lib/api.ts` (refresh dédupliqué + retry 401/CSRF + lock cross-tab + anti-prototype-pollution), `useTokenRefresh` (coordination multi-onglets), `useIntervenantDossiersStore` (optimistic+rollback), `useDossierStore` (synchro subfolders/signedSubfolders corrigée).

---

## 5. Config / Déploiement / SEO / Emails / Sécurité infra

### 🔴 À corriger
- Faux `aggregateRating` JSON-LD (`page.tsx:104`, cf. P0).
- Domaine `avra.fr` vs `avra-app.fr` incohérent partout (SEO/canonicals/Plausible/emails/contacts) — cf. P1. Centraliser dans une constante + `WEB_URL`.
- `middleware.ts:24` gate d'auth neutralisé (`'/'` dans `PUBLIC_PATHS`) — cf. P1.
- **Migrations Prisma sur le mauvais URL + à chaque build (dont Preview)** — `apps/web/vercel.json:3` : `prisma migrate deploy` sur `DATABASE_URL` (pooler) sans forcer `DIRECT_URL` ; tourne aussi en Preview (applique des migrations de branches non mergées à la base partagée). Forcer `DIRECT_URL`, sortir `migrate deploy` du build.
- ~~`EMAIL_FROM` = `onboarding@resend.dev`~~ → **déjà corrigé aujourd'hui** (`contact@avra-app.fr`).

### 🟡 À améliorer
- CSP garde `'unsafe-inline'` sur `script-src` (`next.config.js:38`) : le nonce est généré (`middleware.ts:94-104`) mais non câblé → finir le câblage `nonce` pour retirer `unsafe-inline`.
- Prix JSON-LD divergents (`0` vs `49`) ; `SearchAction` pointe vers `/search` inexistante (`(marketing)/layout.tsx:77`).
- `includeFiles` manquant pour la fonction serverless (`apps/web/vercel.json:6-11`) — le bundling de `../api/dist/**` repose sur le trace nft d'un require statique (fragile).
- Deux `vercel.json` divergents (`--no-frozen-lockfile` masque une désync du lockfile) ; **aucune version Node épinglée** (`engines` absent) → épingler `node: "20.x"`.
- Emails waitlist/démo sans `reply_to` (une réponse va à l'expéditeur technique) ; `sitemap.ts:23` `lastModified: new Date()` (fraîcheur artificielle).

### ⚠️ Non câblé / TODO
- Reply-to inbound (`INBOUND_REPLY_DOMAIN`), `CORS_ALLOWED_ORIGINS`, `WEB_URL`, `EMAIL_FROM`, `TRUSTED_PROXY` absents de la table d'env du CLAUDE.md → à documenter.
- Dockerfile racine cassé (`pnpm start:prod` inexistant) — voie conteneurisée non finalisée.
- forgot-password email : côté web les pages existent, l'envoi Resend reste tracké P1.

### ❓ Manques / incohérences
- `.vercel/project.json` absent du repo → impossible de vérifier le `rootDirectory: apps/web`.
- `ADMIN_NOTIFICATION_EMAIL` incohérent (CLAUDE.md `lumeasolutions@outlook.fr` vs `.env.example:56` `contact@avra.fr`).
- `env.validation.ts` ne bloque en pratique que `DATABASE_URL`/`JWT_SECRET` (skipMissingProperties) ; `WEB_URL`/`API_URL` non réellement validés.

### ✅ Points forts
Headers de sécurité complets (HSTS/X-Frame/nosniff/object-src none…), CORS fail-fast en prod, Sentry PII-safe (scrub + sample réduit + sourcemaps cachées), GA4 Consent Mode v2 (denied par défaut) + Plausible cookieless, ValidationPipe strict, Swagger off en prod, robots.ts (app privée + bots IA bloqués), anti-cache HTML CDN anti-404 de chunks.

---

## 6. Base de données (Prisma) & Intégrations

### 🔴 À corriger
- **Dérive schéma↔migration** : `20260528_dossier_business_fields/migration.sql:25` crée `Project_workspaceId_archivedAt_idx` **non déclaré** dans `schema.prisma` → un futur `migrate dev` le supprimera (perte de perf silencieuse). Ajouter `@@index([workspaceId, archivedAt])` sur Project.
- **Upload IA sur disque local éphémère** (`ia.service.ts:84-85`) : perdu en serverless, `StoredFile.publicUrl` reste null. Router vers Supabase ou retirer l'endpoint legacy.
- 🟡 Types Prisma manuels désynchronisés (`prisma-enums.ts`, `types/prisma-client.d.ts`) : `MembershipStatus`, `WorkspaceInvitationStatus`, modèles `workspaceInvitation/cronRun/waitlist/demoRequest` absents → `(prisma as any)` partout.

### 🟡 À améliorer
- `IaJob.costEUR` en `Float` mais l'architect route y stocke des **USD** (`architect/route.ts:234`) et rendu des EUR → coûts mélangés. Normaliser.
- Endpoints IA NestJS legacy dupliqués/morts (`/ia/rendu`, `/ia/coloriste` → fal mock `via.placeholder.com`) ; MyArchitect sans retry ; champ mort `Reminder.folderId`.

### ⚠️ Non câblé / TODO
- IaJob `QUEUED` sans worker NestJS (cf. §2) ; `/ia/job` inutilisé.
- **Régénération d'URLs signées non implémentée** (`jobs/route.ts:18`) : les `signedUrls` 30 j stockées en DB **expirent** → rendus d'historique en 404 après 30 j. Implémenter le refresh depuis `paths`.
- IA Architect réutilise l'enum `EDIT` → historique mélangé (ajouter `ARCHITECT_RENDER` + migration enum).
- Cron cleanup non branché (`vercel.json crons` absent).

### ❓ Manques / incohérences
- **Pas d'unicité sur `Quote.reference`/`Invoice.reference`/`SupplierOrder.reference`** (cf. P0).
- **L'assistant IA lit `PaymentRequest` comme « factures »** (`ia.controller.ts:131-140`) et ignore le vrai modèle `Invoice` → « qui me doit combien » incomplet.
- `DemandeAttachment` XOR (`dossierDocumentId`/`documentId`) non garanti en base ; mock fal → domaine externe (vérifier CSP `img-src`).

### ✅ Points forts
Decimal(12,2) systématique pour l'argent, `onDelete` pensé légal (SET NULL/RESTRICT sur pièces comptables), `@unique` corrects sur tous les tokens/lookups, index composites sur hot-paths, fallback IA OpenAI→Anthropic→mock avec timeouts/retries/budgets, extraction `json_schema` stricte, storage Supabase `service_role` server-only + URLs signées, MyArchitect mode démo propre. **Migrations globalement alignées** avec le schéma (seule vraie dérive : l'index `archivedAt`).

---

## 7. Plan d'action recommandé (ordre suggéré)

**Sprint 1 — Sécurité & données (P0)**
1. `create-payment.dto.ts` `@IsUUID`→`@IsString` (feature cassée).
2. Corriger `sanitize()` (corruption live) partout.
3. Fermer les IDOR (documents/invoices/quotes/ia/signature) : vérif `workspaceId` avant écriture.
4. `RolesGuard` + `@Roles` sur invoices/quotes/settings.
5. Références factures/devis : refuser en entrée + `@@unique([workspaceId, reference])`.
6. Token portail public généré serveur + expiration + throttle.
7. Supprimer le faux `aggregateRating` + renseigner les mentions légales.

**Sprint 2 — Bugs visibles & câblage (P1)**
8. Brancher `/epaiement` (ou supprimer le doublon `/e-paiement`) ; relier `/commandes` et `/dashboard` ou décider de les retirer.
9. Afficher les KPI des portails métier (ou factoriser en un seul composant).
10. Réparer le flux facture-depuis-SAV + les deep-links (`?demande`, `?tab`, `?createFromDemande`).
11. Corriger la TVA (stocker le taux numérique, pas le code).
12. Résoudre `syncPayments`/`syncInvoices` + hydrater `payments` (stoppe les fausses alertes acompte).
13. Aligner la clé de purge de l'assistant (fuite inter-comptes).
14. Corriger `createProject` (profession) et `NotificationsDropdown` (pastille).
15. Trancher le domaine canonique unique et l'aligner partout.

**Sprint 3 — Nettoyage & robustesse**
16. Supprimer le code mort (`useRelanceEngine`, `useEventActions`, `checkAndCreateRelances`, `AlertsPanel`, `Topbar`, `save-image`, endpoints IA legacy, blocs `{false &&}`).
17. Câbler la page Paramètres (Import/Export, Trames, logo, Chorus Pro) ou masquer les boutons non finis.
18. Fiabiliser les migrations Prisma (`DIRECT_URL`, hors build Preview) + index `archivedAt`.
19. Antivirus (clé Cloudmersive) + revalidation upload direct + pagination exposée.
20. Régénération des URLs signées IA (historique après 30 j) ; unifier la source URGENT/RETARD.

---

## 8. Ce qui est déjà solide (à préserver)

Auth/JWT/CSRF/cookies, isolation multi-tenant manuelle, webhook YouSign, filtre d'exceptions, Decimal monétaire + verrou numérotation, headers de sécurité + CSP (à durcir via nonce), RGPD/consentement GA4, `lib/api.ts` (refresh/retry/lock), stores optimistic+rollback, fallback IA robuste, storage Supabase, extraction IA bornée, robots/sitemap, portails publics par token.

---

*Rapport généré à partir de 5 audits croisés du code (backend, pages, composants/hooks/stores, config/déploiement, données/intégrations). Tous les points sont référencés `fichier:ligne` pour correction directe.*
