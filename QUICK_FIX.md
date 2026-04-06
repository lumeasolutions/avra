# 🔧 QUICK FIX — Corriger tous les problèmes (30 min)

## ⚡ FIX 1: Créer .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/
pnpm-lock.yaml
*.lock

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Build
dist/
build/
.next/
out/
.turbo/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Prisma
prisma/migrations/dev.db
prisma/migrations/dev.db-journal

# Testing
coverage/
.nyc_output/

# Cache
.cache/
.eslintcache/
EOF
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

## ⚡ FIX 2: Installer les Dépendances Manquantes (API)

```bash
cd apps/api

# Installer les packages manquants
pnpm add @sentry/node bull redis @nestjs/swagger

# Vérifier l'installation
pnpm list @sentry/node bull redis @nestjs/swagger
```

**Output attendu:**
```
✓ @sentry/node@latest
✓ bull@latest
✓ redis@latest
✓ @nestjs/swagger@latest
```

---

## ⚡ FIX 3: Installer les Dépendances Manquantes (Frontend)

```bash
cd apps/web

# Installer Sentry
pnpm add @sentry/nextjs

# Vérifier
pnpm list @sentry/nextjs
```

---

## ⚡ FIX 4: Générer Migrations Prisma

```bash
cd apps/api

# Créer la migration initiale
npx prisma migrate dev --name init

# Vérifier la création
ls -la prisma/migrations/
```

**Output attendu:**
```
migrations/
├── 20260323_init/
│   └── migration.sql
└── migration_lock.toml
```

---

## ⚡ FIX 5: Tester le Build Local

```bash
# À la racine du projet
pnpm build

# Doit compiler sans erreurs
# Output:
# ✓ apps/api built successfully
# ✓ apps/web built successfully
```

**Si des erreurs:**
```bash
# Nettoyer et réessayer
pnpm clean
pnpm install
pnpm build
```

---

## ⚡ FIX 6: Vérifier la Configuration .env Production

```bash
# Vérifier que toutes les variables critiques sont présentes
grep -E "DATABASE_URL|JWT_SECRET|API_URL|WEB_URL" .env

# Output attendu:
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
# API_URL=...
# WEB_URL=...
```

---

## ✅ Checklist de Vérification

Après tous les fixes:

- [ ] .gitignore créé et committé
- [ ] Dépendances API installées (4 packages)
- [ ] Dépendances Frontend installées (1 package)
- [ ] Migrations Prisma créées
- [ ] Build local réussi (`pnpm build`)
- [ ] Variables .env complètes
- [ ] Pas d'erreurs dans `pnpm lint`

---

## 🚀 Après les Fixes

```bash
# Test du démarrage local
docker-compose up
npm run dev

# Doit marcher:
# - http://localhost:3001/api/health → OK
# - http://localhost:3001/api/docs → Swagger
# - http://localhost:3000 → Frontend
```

---

## 📋 Résumé des Commandes

```bash
# 1. Créer .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
dist/
build/
.next/
EOF

# 2. Installer dépendances API
cd apps/api && pnpm add @sentry/node bull redis @nestjs/swagger

# 3. Installer dépendances Frontend
cd apps/web && pnpm add @sentry/nextjs

# 4. Générer migrations
cd apps/api && npx prisma migrate dev --name init

# 5. Build test
pnpm build

# 6. Commit
git add -A && git commit -m "fix: install missing dependencies and add .gitignore"
```

**Temps total:** ~10-15 minutes

