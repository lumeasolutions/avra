# CLAUDE.md — AVRA

Fichier de référence pour les sessions Claude. Mis à jour : avril 2026.

## Projet

SaaS ERP B2B français pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs.
Bêta privée jusqu'à juillet 2026. Site public : https://avra.fr

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
| `ANTHROPIC_API_KEY` | sk-ant-*** |
| `FAL_KEY` | — |

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

## État au 22 avril 2026 (commit eec2999)

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
- Plausible Analytics (layout marketing, RGPD-friendly)
- CLAUDE.md créé

### 🔲 P1 restants
- Playwright E2E (parcours login, waitlist, démo)
- 2-3 articles de blog SEO supplémentaires
- Audit accessibilité (axe-core)
- Email forgot-password branché sur Resend (TODO dans auth.service.ts)
- Tests unitaires auth.service.spec.ts (squelette existant)
