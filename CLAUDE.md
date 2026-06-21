# CLAUDE.md — AVRA

Fichier de référence pour les sessions Claude. Mis à jour : mai 2026.

## Projet

SaaS ERP B2B français pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs.
Bêta privée jusqu'à janvier 2027. Site public : https://avra.fr

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | Next.js 14 App Router (`apps/web`) |
| Backend | NestJS (`apps/api`) — Dockerfile, exposé sur port 3001 |
| ORM | Prisma + Supabase (PostgreSQL) |
| Auth | JWT access (15m) + refresh (30d) httpOnly cookies |
| Email | Resend + React Email (`apps/web/emails/`) |
| Erreurs | Sentry (client + server + edge configs) |
| Analytics | Plausible (script injecté dans marketing layout) |
| Déploiement | Vercel (frontend + serverless NestJS via `apps/web/api/index.ts`) |
| Monorepo | pnpm workspaces — NE PAS utiliser `npm install` directement |

## Architecture déploiement

Le frontend Next.js ET l'API NestJS sont tous les deux sur Vercel :
- Next.js → build standard via `vercel.json`
- NestJS → Serverless Function dans `apps/web/api/index.ts`
- Routing : `/api/v1/*` → serverless function (défini dans `vercel.json` rewrites)
- En dev : proxy Next.js vers `localhost:3001` (via `next.config.js` rewrites)

> ⚠️ **Config Vercel (à connaître).** Le projet Vercel a `rootDirectory: "apps/web"`
> (cf. `.vercel/project.json`), donc Vercel lit **`apps/web/vercel.json`** (qui
> surcharge les settings du dashboard) — PAS le `vercel.json` racine (config
> historique, conservée mais inactive avec ce rootDirectory). Le handler
> serverless `apps/web/api/index.ts` charge l'API compilée via
> `require('../../api/dist/app.module')` ; le `buildCommand` de
> `apps/web/vercel.json` build donc bien `@avra/api` avant `@avra/web`.
> Après tout changement touchant ce routage, **vérifier par un déploiement**
> (Preview) que `/api/v1/health` répond `{status:"ok"}`.
>
> Alternative non finalisée : des `Dockerfile` existent (bascule API conteneurisée).
> Pour l'activer il faudrait héberger l'API ailleurs, pointer `NEXT_PUBLIC_API_URL`
> dessus, configurer CORS, et retirer le bloc `functions`/`rewrites` du vercel.json.

## Bêta gate

- `BETA_GATE_ENABLED=true` → whitelist active
- `BETA_ADMIN_EMAILS=lumeasolutionsss@outlook.fr,cgdesignplan@gmail.com`
- Logique : `apps/api/src/common/security/beta-gate.ts`
- Branché dans : `auth.service.ts` (login ligne ~46, register ligne ~229)
- `/register` redirige vers `/rejoindre` pendant la bêta

## Fichiers clés

```
apps/api/src/
  common/security/beta-gate.ts     — whitelist emails
  modules/auth/auth.service.ts     — login + register + refresh
  main.ts                          — CORS, Helmet, Sentry, Swagger (dev only)
  app.module.ts                    — ThrottlerModule, tous les modules
  config/env.validation.ts         — validation env vars au démarrage

apps/web/
  api/index.ts                     — Serverless Function NestJS pour Vercel
  lib/api.ts                       — Client HTTP (credentials: include, refresh auto)
  lib/server/email.ts              — Wrapper Resend (non-bloquant)
  lib/server/admin-guard.ts        — Protection routes admin par JWT email
  app/(marketing)/layout.tsx       — Layout marketing (BetaBanner, CookieBanner, Plausible)
  app/(marketing)/components/
    CookieBanner.tsx               — RGPD, localStorage avra_cookie_consent
    BetaBanner.tsx                 — Bandeau bêta sticky
  app/api/waitlist/route.ts        — POST inscription waitlist (rate limit 3/h)
  app/api/demo-request/route.ts    — POST demande démo
  app/api/admin/waitlist/route.ts  — GET admin (protégé JWT)
  app/api/admin/demo-requests/route.ts
  app/portail-admin/              — Dashboard admin (KPIs, export CSV)
  app/login/page.tsx              — Page de connexion
  app/register/page.tsx           — Redirige vers /rejoindre pendant bêta
  app/(marketing)/rejoindre/      — Formulaire liste d'attente
  app/(marketing)/rejoindre/merci/— Page de confirmation post-inscription
  next.config.js                  — CSP stricte, headers sécu, Sentry wrapper
  app/sitemap.ts                  — Sitemap dynamique
  app/robots.ts                   — robots.txt (IA bots bloqués)

vercel.json                       — Build + routing /api/v1/* → serverless
prisma/schema.prisma              — Schéma DB (Waitlist, DemoRequest, User...)
```

## Variables d'environnement (Vercel Production + Preview)

| Variable | Valeur |
|----------|--------|
| `BETA_GATE_ENABLED` | `true` |
| `BETA_ADMIN_EMAILS` | `lumeasolutionsss@outlook.fr,cgdesignplan@gmail.com` |
| `RESEND_API_KEY` | `re_***` |
| `ADMIN_NOTIFICATION_EMAIL` | `lumeasolutions@outlook.fr` |
| `NEXT_PUBLIC_API_URL` | (pointe vers `/api/v1`) |
| `DATABASE_URL` | Supabase pooler |
| `DIRECT_URL` | Supabase direct |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | — |
| `OPENAI_API_KEY` | sk-*** (provider IA primaire) |
| `OPENAI_MODEL_PREMIUM` | `gpt-4o` (default) |
| `OPENAI_MODEL_CHEAP` | `gpt-4o-mini` (default) |
| `ANTHROPIC_API_KEY` | sk-ant-*** (fallback transparent — optionnel) |
| `ANTHROPIC_MODEL` | `claude-opus-4-6` (fallback) |
| `AI_PROVIDER` | `auto` (default) — `openai` / `anthropic` / `mock` pour forcer |
| `FAL_KEY` | — (génération images Coloriste + Rendu, inchangé) |
| `MYARCHITECT_API_KEY` | — (module IA Architect / MyArchitectAI ; sans clé → mode démo) |

## Utilisateurs bêta actifs en DB

- `lumeasolutionsss@outlook.fr` — Esteve Boucheret
- `cgdesignplan@gmail.com` — Cassandra Gouna

## Règles de travail

- Français dans les échanges, code en anglais
- Commits conventionnels : `feat:`, `fix:`, `chore:`, `seo:`, `style:`
- Jamais `git push --force` sur main
- Toujours lire `.env` et `next.config.js` avant de toucher à la config
- Le `.git` pointe vers un worktree Windows → git inutilisable depuis Linux sandbox
- Pour commiter : utiliser le script `.bat` fourni depuis Windows
- pnpm monorepo : NE PAS utiliser `npm install` à la racine

## Architecture IA (mai 2026 — refactor OpenAI)

Tout le textuel passe sur **OpenAI** (gpt-4o + gpt-4o-mini). Anthropic
conservé en **fallback transparent** : tant que `OPENAI_API_KEY` n'est pas
configuré, l'app retombe automatiquement sur Anthropic. fal.ai inchangé pour
les images.

| Cas d'usage | Provider | Modèle |
|-------------|----------|--------|
| Chat assistant | OpenAI | `gpt-4o` |
| Analyze dossier | OpenAI | `gpt-4o` |
| Suggest alerts | OpenAI | `gpt-4o-mini` (16x moins cher) |
| Extract dossier (NEW) | OpenAI | `gpt-4o` + json_schema strict |
| Chat marketing (visiteurs) | OpenAI | `gpt-4o-mini` |
| Rendu / coloriste | fal.ai | inchangé |
| IA Architect (NEW) | MyArchitectAI | render/interior · render/exterior · upscale-4k |

**Service principal** : `apps/api/src/modules/ia/ai.service.ts`
**Service extraction** : `apps/api/src/modules/ia/extraction.service.ts`

### Module IA Architect (juin 2026 — MyArchitectAI)

3e moteur de rendu de l'IA Studio (onglet « IA Architect »), à côté de
Coloriste et Rendu. Utilise l'API MyArchitectAI (~0,03 $/rendu, white-label).

- Wrapper serveur : `apps/web/lib/server/myarchitect-api.ts`
- Route API : `apps/web/app/api/ia/architect/route.ts` (auth + rate-limit
  10/h + IaJob + upload source Supabase → URL signée → render → copie Supabase)
- UI : onglet dans `apps/web/app/(app)/ia-studio/page.tsx` (accent violet #8a6cc2)
- Type IaJob : réutilise `EDIT` (historique dédié, **sans migration Prisma**)
- Activation : poser `MYARCHITECT_API_KEY` (Vercel). Sans clé → mode démo
  (renvoie l'image source). Aucune autre étape requise.
- Prompt anti-erreurs baked-in (pas de negativePrompt sur render/interior|exterior) :
  préservation layout/géométrie, pas d'objets en trop, pas de déformation.
**Doc complète** : `apps/api/src/modules/ia/README.md`

### Endpoint extraction documents

`POST /api/v1/ia/extract-dossier { dossierId }` — Analyse les PDF du dossier
via `pdf-parse` + OpenAI gpt-4o (response_format json_schema strict) et
retourne :
- 5 dates butoires (suivi, relevé mesures, plan tech, fiche pose, permis)
- liste de commandes fournisseurs (fournisseur + date butoir + montant HT + catégorie)
- liste de livraisons (catégorie + date butoir)
- score de confiance (0-1) + notes explicatives

**Frontend** : bouton "Extraire avec IA" dans `DateButoireValidationModal` —
pré-remplit les champs en un clic. L'utilisateur garde la main.

**Sécurité** : JwtAuthGuard + throttler `ai` (5/min/IP) + ownership workspace.

## État au 1er mai 2026

### ✅ Fait
- Beta gate (whitelist email, anti-enumeration, case-insensitive)
- Emails transactionnels Resend (waitlist confirm, demo confirm, admin notif)
- Cookie banner RGPD (localStorage, event avra:consent)
- Admin dashboard `/portail-admin` (tableaux, KPIs, export CSV)
- Page `/rejoindre/merci` (confirmation post-inscription)
- CSP stricte + headers sécurité (HSTS, X-Frame, etc.)
- Sentry Next.js (client/server/edge + withSentryConfig)
- Sitemap.ts + robots.ts (AI bots bloqués)
- vercel.json : routing `/api/v1/*` → serverless NestJS
- Plausible Analytics (layout marketing)
- CLAUDE.md créé
- **(mai 2026)** Migration IA OpenAI primaire (gpt-4o + gpt-4o-mini),
  Anthropic fallback transparent, suppression worker DALL-E legacy
- **(mai 2026)** Extraction IA documents : endpoint `/extract-dossier`
  + bouton UI dans la modale Validation projet
- **(juin 2026)** Module IA Architect (MyArchitectAI) : 3e onglet IA Studio,
  route `/api/ia/architect` + wrapper `myarchitect-api.ts` (active via MYARCHITECT_API_KEY)

### 🔲 P1 restants
- Playwright E2E (parcours login, waitlist, démo)
- 2-3 articles de blog SEO supplémentaires
- Audit accessibilité (axe-core)
- Email forgot-password branché sur Resend (TODO dans auth.service.ts)
- Tests unitaires auth.service.spec.ts (squelette existant)
