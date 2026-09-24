# AUDIT COMPLET #3 — AVRA
**Date : 24 septembre 2026 · État du code à `c16a837` · Audit SEULEMENT — aucune modification appliquée**

Suite de l'audit #2 (13 juillet 2026). Deux volets :

1. **Suivi** : ce que l'audit #2 signalait est-il corrigé aujourd'hui, 50 commits plus tard ?
2. **Neuf** : ce que le code écrit depuis (planning/RDV, devis, stock, IA coloriste) et la
   chaîne de build font apparaître.

> **Rien n'a été corrigé ici.** Ce document est une photographie pour décider quoi traiter.

### Ce qui a réellement été exécuté (pas seulement lu)

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` sur `apps/web` | ✅ 0 erreur |
| `tsc --noEmit` sur `apps/api` | ✅ 0 erreur |
| `next build` (production, 100 pages) | ✅ succès |
| `next lint` sur `apps/web` | ✅ aucune erreur |
| Logs GitHub Actions (5 derniers runs, dont le rouge du 23/09) | ❌ voir #1 et #3 |
| Base de production (`IaJob`, projet `axfftmauppdejgtmwlln`) | ❌ voir #2 — 107 rendus concernés |
| Lecture ciblée du code des 30 derniers commits | voir volet 2 |

---

## VOLET 1 — SUIVI DE L'AUDIT #2 : 8 points critiques sur 8 sont fermés

| # (audit 2) | Problème | Statut aujourd'hui |
|---|---|---|
| 1 | Middleware d'auth neutralisé (`PUBLIC_PATHS` avec `'/'`) | ✅ **Corrigé** — bascule en denylist, `PROTECTED_PREFIXES` + `isProtectedPath` (`middleware.ts:32-60`) |
| 2 | Faux avis / stats fabriquées (risque DGCCRF) | ✅ **Corrigé** — page `temoignages` réécrite sans avis ni métrique inventés (`temoignages/page.tsx:24-27,195`) |
| 3 | `migrate deploy` sur le pooler pgbouncer | ✅ **Corrigé** — `DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"` (`apps/web/vercel.json:3`). `includeFiles` toujours absent, mais les déploiements passent : à surveiller, pas à traiter |
| 4 | Auth intervenant externe cassée (401 systématique) | ✅ **Corrigé** — branche dédiée dans `login` (`auth.service.ts:52-61`) et dans `validateUser` |
| 5 | Split de domaine `avra.fr` / `avra-app.fr` | ✅ **Corrigé** — 187 occurrences de `avra-app.fr`, 0 de `avra.fr` dans le code (⚠️ mais `CLAUDE.md` annonce encore `avra.fr`, cf. #14) |
| 6 | Documents admin écrits sur le FS local | ✅ **Corrigé** — `SupabaseStorageService` (`documents.service.ts:380,432,456,600`) ; il ne reste qu'un `fs.unlink` best-effort à la suppression |
| 7 | Stock : édition inline perd la quantité | ✅ **Corrigé** — `quantity: Number(editForm.quantity) || 0` (`stock/page.tsx:320-322`) |
| 8 | `perdreDossier` remplaçait le cuid DB | ✅ **Corrigé** — `isLocalOnlyId` + `lostReason` persisté (`useProjectActions.ts`) |

**Également fermés** (liste « à corriger » de l'audit #2) : `convertToInvoice` crée désormais une
vraie facture liée sans écraser la référence `D-` (`quotes.service.ts`) ; dérive schéma↔migration
sur `Project_workspaceId_archivedAt_idx` résorbée (`schema.prisma:601`) ; `@@unique([workspaceId,
reference])` posé sur `SupplierOrder` (`schema.prisma`) ; mentions légales sans placeholders ;
plus de `&apos;` littéraux dans les chaînes JS.

**Restés ouverts** : RBAC des contrôleurs (→ #6 ci-dessous), refresh des URLs signées (→ #2),
`costEUR` en USD (→ #7), doublon `/e-paiement` ÷ `/epaiement` (→ #11), route morte
`/api/save-image` (→ #10).

---

## VOLET 2 — NOUVELLES CONSTATATIONS

### 🔴 ÉLEVÉ

#### 1. La chaîne qualité (CI) ne tourne pas — et le sait pas
Preuve dans les logs du run CI du 23/09 (`actions/runs/35889076196`) :

```
apps/api lint$ eslint "{src,apps,libs,test}/**/*.ts"
apps/api lint: sh: 1: eslint: not found
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @avra/api@0.0.1 lint
```

- `apps/api/package.json:9` appelle `eslint`, mais **`apps/api` n'a aucune dépendance eslint**
  (ni `dependencies`, ni `devDependencies`, ni binaire dans `node_modules/.bin`). Le lint API
  échoue donc à chaque run, depuis toujours.
- `pnpm -r lint` s'arrête au premier échec → **le lint de `apps/web` ne tourne jamais non plus**.
- `.github/workflows/ci.yml:44` met `continue-on-error: true` → l'étape est comptée **verte**.
- `apps/web/next.config.js:67` désactive ESLint pendant le build, avec ce commentaire :
  « la règle qui compte vraiment (`react-hooks/rules-of-hooks`, celle qui aurait attrapé
  l'erreur React #310 partie en prod le 06/09/2026) […] doit être vérifiée avant de pousser ».
  Elle n'est vérifiée nulle part automatiquement.
- `pnpm test` (`ci.yml:49`, `continue-on-error: true`) : **aucun script `test`** à la racine,
  dans `apps/api` ni dans `apps/web`, aucune config jest/vitest. Les 3 fichiers de tests
  existants (`auth.service.spec.ts`, `csrf.guard.spec.ts`, `e2e/intervenant-portal.spec.ts`)
  ne sont jamais exécutés. L'upload codecov qui suit ne trouve évidemment aucun fichier.

**Conséquence** : le seul garde-fou réel avant la prod est `pnpm build`. Tout ce qu'un
typecheck et un lint attrapent (hooks conditionnels, variables mortes, imports cassés côté
runtime) passe.

**Remède** (≈ 1 h) : ajouter `eslint` + `@typescript-eslint/*` à `apps/api`, retirer les deux
`continue-on-error`, remplacer `pnpm test` par un vrai script (jest côté API, Playwright côté
web) ou retirer l'étape et l'upload codecov tant qu'il n'y a pas de tests.

#### 2. L'historique IA se vide au bout de 30 jours — **107 rendus déjà perdus, dont 93 de Cassandra**
`apps/web/app/api/ia/jobs/route.ts:17-19` :

> « Les URLs signées Supabase stockées sont valables 30 jours. Si elles expirent, le client peut
> demander une régénération via un futur endpoint `POST /api/ia/jobs/:id/refresh-urls`
> (pas implémenté dans ce sprint). »

L'historique renvoie `resultImageUrls.signedUrls` tel quel. **Mesuré en base de production**
(projet `axfftmauppdejgtmwlln`, table `IaJob`, le 24/09) :

| Mesure | Valeur |
|---|---|
| Rendus terminés avec résultat | 279 |
| Dont créés il y a plus de 30 jours (URL périmée) | **107** |
| — appartenant à `cgdesignplan@gmail.com` (Cassandra) | **93** (29/06 → 09/08) |
| — appartenant à `lumeasolutions@outlook.fr` | 14 (22/07 → 30/07) |
| Rendus dont le `path` de stockage est conservé | 279 / 279 (**100 %**) |

Le plus ancien jeton lu en base le confirme : `iat` 29/06/2026 13:23 UTC, `exp` 29/07/2026
13:23 UTC — soit exactement 30 jours de validité, et **57 jours de dépassement** à ce jour.

> Réserve honnête : je n'ai **pas** pu faire l'appel HTTP sur cette URL depuis cette session
> (la politique réseau de l'environnement refuse `axfftmauppdejgtmwlln.supabase.co`). La date
> d'expiration vient du jeton lui-même, pas d'une réponse du serveur. À confirmer d'un clic en
> ouvrant l'historique IA Studio sur un rendu de juillet.

Bonne nouvelle : les 279 chemins de stockage sont persistés à côté des URLs
(`coloriste-test/route.ts:516-521` → `{ paths, signedUrls, meta }`), donc **aucune image n'est
perdue** — seuls les liens le sont. La correction est un endpoint d'une trentaine de lignes qui
régénère à la volée (ou, plus simple, une régénération systématique dans le `GET /jobs` pour la
page demandée).

#### 3. Le build de production dépend d'un appel réseau à Google Fonts
`apps/web/app/layout.tsx:2` : `import { DM_Sans, Playfair_Display } from 'next/font/google'`.
Le run CI 856 (23/09, commit `70ce93d`) est mort là-dessus :

```
request to https://fonts.googleapis.com/css2?family=DM+Sans:... failed
Retrying 1/3...
Failed to compile. An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
> Build failed because of webpack errors
```

Le commit n'y était pour rien (le suivant est passé sans changement). Un incident réseau chez
Google, ou un blocage sortant côté Vercel, bloque donc un déploiement — y compris un
déploiement de correctif urgent. **Remède** : basculer sur `next/font/local` avec les deux
woff2 servis depuis `public/` (build hermétique, et une requête tierce de moins pour le RGPD).

### 🟠 MOYEN

#### 4. Le rate-limit des routes IA ne limite presque rien en production
`apps/web/lib/server/rate-limit.ts:23` : compteur dans une `Map` en mémoire. Le fichier le dit
lui-même (« En production multi-instance (ex: Vercel), migrer vers Redis »). Sur Vercel, chaque
instance de fonction a sa propre Map et un cold start la remet à zéro : le plafond affiché
(150/h sur `coloriste-test`, 10/h sur `architect`, 20/h sur `save-image`, 3/h sur la waitlist)
est en réalité multiplié par le nombre d'instances vivantes.

Ce n'est pas qu'un sujet d'abus : ces routes appellent des API **payantes** (MyArchitectAI
≈ 0,03 $/rendu, fal.ai, OpenAI). Le garde-fou budgétaire de la bêta repose dessus.
**Remède** : `@upstash/ratelimit` + Upstash Redis (offre gratuite suffisante à ce volume), ou
un compteur en base sur `IaJob` (`count` par workspace sur la fenêtre glissante) — pas de
dépendance supplémentaire, une requête indexée.

Accessoire : le `setInterval` de nettoyage au niveau module (`rate-limit.ts:25`) n'a pas de sens
en serverless (l'instance meurt avant).

#### 5. Photo d'article : aucun garde-fou si le navigateur ne sait pas décoder l'image
`apps/web/app/(app)/stock/page.tsx:1180` appelle `fileToResizedDataUrl(file, 800)`, et
`apps/web/lib/image-resize.ts:47` conclut :

```ts
return (await resizeImageToJpeg(original, maxSide)) ?? original;
```

Le repli renvoie **la data-URL d'origine**, non réduite. Cas concret : une photo HEIC d'iPhone
ouverte depuis Chrome ou Firefox desktop — `new Image()` ne la décode pas, on garde donc 3 à
5 Mo encodés en base64 (soit 4 à 7 Mo de chaîne). Deux conséquences :
- l'appel API dépasse la limite de 4 Mo annoncée dans le commentaire du fichier → 413 ;
- l'article est stocké tel quel dans le store persisté `avra-stock-store` (localStorage, quota
  ~5 Mo **partagé** entre les 10 stores persistés) → `QuotaExceededError`, et c'est tout l'état
  local qui cesse d'être sauvegardé, pas seulement le stock.

Le chemin import Excel est, lui, correctement gardé (`stock-import.ts:281` : `if (jpeg)`).
**Remède** : refuser (message clair) quand la conversion échoue ou que le résultat dépasse
~1 Mo, au lieu de replier sur l'original.

#### 6. RBAC toujours absent sur 6 contrôleurs
`JwtAuthGuard` est bien posé partout, mais aucun `@Roles` sur : `intervenants`,
`notifications`, `stats`, `demandes`, `dossier-documents`, `ia`. Un membre en lecture seule
peut donc créer, modifier et supprimer sur ces modules. À comparer à `clients`, `orders`,
`payments`, `events`, `stock` qui, eux, sont annotés. Signalé dans l'audit #2, non traité.

#### 7. Le suivi de coût IA est faux
- `coloriste-architect/route.ts:215` et `retouch/route.ts:209` : `costEUR: costUSD` — des
  dollars rangés dans un champ nommé euros (≈ +8 % d'écart aujourd'hui).
- `coloriste-test/route.ts:523` : `costEUR: 0.03` en dur, quel que soit le nombre d'appels
  réellement facturés (le chemin masqué en fait deux : `/change-textures` + recomposition).
- `coloriste-test/route.ts:400` : `costEUR: 0` sur le mode démo — correct, mais indistinguable
  d'un vrai rendu gratuit dans les stats.

Tant que ce champ n'est pas fiable, aucun tableau de bord de coût IA n'est exploitable.

#### 8. `.env.example` a décroché du code
Manquent : `MYARCHITECT_API_KEY`, `BREVO_API_KEY`, `BREVO_SMS_SENDER`, `EMAIL_FROM`,
`TRUSTED_PROXY` — toutes lues par le code (et les trois premières documentées dans `CLAUDE.md`).
`EMAIL_FROM` est particulièrement piégeux : sans elle, les invitations de RDV partent depuis
`onboarding@resend.dev` (`event-invite.service.ts:92`).

### 🟡 FAIBLE

9. **CSP** : `script-src 'unsafe-inline'` en production (`next.config.js:38` et la CSP du
   middleware). Le nonce par requête est bien généré et exposé en `x-nonce`, mais inutilisé —
   hotfix du 29/04 assumé et documenté. À reprendre le jour où les scripts inline de Next
   pourront tous porter le nonce.
10. **`/api/save-image`** : plus aucun appelant (seule trace : un commentaire dans `lib/api.ts:11`).
    La route écrit sur le FS local, ce qui ne fonctionne pas en serverless. À supprimer.
11. **`/e-paiement` et `/epaiement`** coexistent toujours (placeholder + page réelle), tous deux
    listés dans `PROTECTED_PREFIXES`.
12. **Hygiène du dépôt** : `.turbo/cache/*.tar.zst` est **versionné** (12 fichiers de cache de
    build) ; ~15 Mo de logos PNG/JPG à la racine (`nouveaulogoavra.png` 2,6 Mo, `texture
    sidebar.png` 2 Mo…) ; 8 fichiers `_tmp_*` vides ; un fichier au nom corrompu
    (« sier par sous-dossiers + archive AVANT VENTE… ») ; une trentaine de `.bat`/`.ps1`
    jetables que `.gitignore` prétend ignorer mais qui sont déjà suivis.
13. **CI vieillissante** : `actions/checkout@v3`, `setup-node@v3`, `codecov-action@v3`,
    `pnpm/action-setup@v2` — tous sur Node 20 déprécié (avertissement dans le log) ;
    pnpm 8 en CI (`ci.yml:32`) contre pnpm 10 en local ; `caniuse-lite` vieux de 6 mois.
14. **`CLAUDE.md` a deux affirmations fausses** : « Site public : https://avra.fr » (le code
    n'utilise que `avra-app.fr`) et « Le `.git` pointe vers un worktree Windows → git
    inutilisable depuis Linux / utiliser le script `.bat` » (faux dans les sessions cloud, où
    git fonctionne normalement). Ces deux lignes envoient chaque nouvelle session sur une
    fausse piste.

---

## CE QUI A ÉTÉ VÉRIFIÉ ET EST SAIN

**Code du sprint septembre** (RDV/visio, invitations, devis, import stock), relu ligne à ligne :

- **Invitation RDV** (`event-invite.service.ts`, `ics.ts`, `send-invite.dto.ts`) : DTO validé
  (20 destinataires max, chaque adresse contrôlée, longueurs bornées), throttle 60/h
  (`events.controller.ts:94`), échappement RFC 5545 correct (`icsText`, `icsParam`, `foldLine`
  sur 75 octets sans couper l'UTF-8), `escapeHtml` sur tout ce qui entre dans l'e-mail,
  nom d'expéditeur nettoyé des `"<>\r\n` (`buildFrom`), lien visio validé http/https avant
  affichage (pas de `javascript:`). Annulation et mise à jour repartent aux mêmes destinataires
  avec `SEQUENCE` incrémentée — conforme à ce qu'attendent Google Agenda et Outlook.
- **Flux d'abonnement agenda** : jeton 256 bits vérifié par regex avant requête, rotation
  possible, 404 indistinct si jeton inconnu ou sans workspace actif, fenêtre bornée
  (−90 j / +400 j, 3000 événements max), throttle 30/min.
- **Import stock** : lots de 100 max côté DTO (`ArrayMaxSize(100)`), découpage côté front, RBAC
  présent (`@Roles('OWNER','ADMIN','MEMBER')`).
- **Routes IA** : `getUserContextFromRequest` + `checkRateLimit` sur chaque route, allowlist
  anti-SSRF sur les téléchargements d'images, ownership workspace vérifiée.
- **Isolation multi-tenant** : `where: { id, workspaceId }` systématique sur les lectures et
  mutations parcourues.
- Les 57 `dangerouslySetInnerHTML` du front sont tous du JSON-LD ou du CSS statique — aucune
  donnée utilisateur.

---

## ORDRE DE TRAITEMENT PROPOSÉ

1. **#1 — Réparer la CI** (≈ 1 h). Tout le reste dépend de ce filet : tant que lint et tests
   sont verts-mensongers, chaque correctif peut en casser un autre sans que rien ne le dise.
2. **#2 — Endpoint de régénération des URLs signées** (≈ 1 h). C'est le seul point déjà visible
   par les utilisatrices : leur historique IA de juillet-août est cassé aujourd'hui.
3. **#3 — `next/font/local`** (≈ 30 min). Supprime une cause de déploiement bloqué.
4. **#5 puis #4 — Garde-fou photo, puis rate-limit persistant** (≈ 30 min / ≈ 2 h). Le premier
   évite une perte d'état local chez l'utilisateur, le second protège le budget IA.
5. **#6, #7, #8 — RBAC, coûts, `.env.example`** (≈ 2 h ensemble). Dette qui ne saigne pas
   encore, mais qui se paiera à l'ouverture de la bêta à plus de deux comptes.
6. **#9 à #14 — Hygiène.** À faire en une passe, quand l'agenda le permet.

---

*Fin de l'audit #3. Aucune modification appliquée — en attente de ta décision sur ce qu'on
traite, et dans quel ordre.*
