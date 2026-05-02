# AVRA — L’assistant virtuel de l’agencement

ERP métier + Assistant IA pour architectes d’intérieur, cuisinistes, menuisiers et agenceurs.

## Stack

- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend** : NestJS, Prisma, PostgreSQL
- **Auth** : JWT, multi-tenant, RBAC

## Prérequis

- Node 20+
- pnpm 9+
- PostgreSQL

## Installation

```bash
# À la racine du monorepo
pnpm install

# Générer le client Prisma (schéma à la racine)
pnpm db:generate

# Optionnel : copier .env et configurer DATABASE_URL, JWT_SECRET
cp .env.example .env

# Optionnel : push du schéma et seed
pnpm db:push
pnpm db:seed
```

## Lancement

```bash
# Développement (API + Web en parallèle)
pnpm dev
```

- **Web** : http://localhost:3000  
- **API** : http://localhost:3001/api  

Compte démo après seed : `admin@avra.demo` / `AvraDemo2024!`

## Structure

```
avra/
├── apps/
│   ├── api/          # NestJS — auth, projects, clients, events, stock, etc.
│   └── web/          # Next.js — dashboard, dossiers, planning, IA Studio, etc.
├── packages/
│   └── types/        # Types partagés
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── package.json
└── turbo.json
```

## Variables d’environnement

- **Racine / API** : `DATABASE_URL`, `JWT_SECRET`, `WEB_URL` (optionnel)
- **Web** : `NEXT_PUBLIC_API_URL` (défaut : http://localhost:3001/api)

## Licence

Propriétaire — Luméa.
