#!/bin/bash

echo "🔧 AVRA — Script de Correction Automatique"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command success
check_success() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo -e "${RED}✗ $1${NC}"
    exit 1
  fi
}

echo "1️⃣ Installation des dépendances API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd apps/api
pnpm add @sentry/node bull redis @nestjs/swagger --save
check_success "Dépendances API installées"
cd ../..
echo ""

echo "2️⃣ Installation des dépendances Frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd apps/web
pnpm add @sentry/nextjs --save
check_success "Dépendances Frontend installées"
cd ../..
echo ""

echo "3️⃣ Création des migrations Prisma..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd apps/api
npx prisma migrate dev --name init --skip-generate
check_success "Migrations Prisma créées"
npx prisma generate
check_success "Prisma client généré"
cd ../..
echo ""

echo "4️⃣ Nettoyage et build..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm clean
check_success "Nettoyage complet"

pnpm install
check_success "Dépendances réinstallées"

echo ""
echo "5️⃣ Build test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm build
check_success "Build successful"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          ✅ TOUTES LES CORRECTIONS APPLIQUÉES !            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Prochaines étapes:"
echo "  1. Tester localement: docker-compose up && npm run dev"
echo "  2. Déployer: voir DEPLOYMENT_GUIDE.md"
echo ""
