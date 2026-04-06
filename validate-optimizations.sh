#!/bin/bash

# Script de validation des optimisations Prisma
# Usage: bash validate-optimizations.sh

set -e

echo "=========================================="
echo "Validation des optimisations Prisma"
echo "=========================================="
echo ""

# Compteurs
CHECKS_PASSED=0
CHECKS_FAILED=0

# Fonction pour vérifier la présence d'un pattern dans un fichier
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "[PASS] $description"
        ((CHECKS_PASSED++))
        return 0
    else
        echo "[FAIL] $description (dans $file)"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# Fonction pour vérifier qu'un fichier existe
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo "[PASS] $description"
        ((CHECKS_PASSED++))
        return 0
    else
        echo "[FAIL] $description - fichier manquant: $file"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# Fichiers de code source
echo "Verification des services optimises..."
echo ""

check_file "apps/api/src/modules/clients/clients.service.ts" "clients.service.ts optimise"
check_pattern "apps/api/src/modules/clients/clients.service.ts" "page = 1" "clients.findAll() - pagination"
check_pattern "apps/api/src/modules/clients/clients.service.ts" "select:" "clients - select au lieu de include"

echo ""

check_file "apps/api/src/modules/projects/projects.service.ts" "projects.service.ts optimise"
check_pattern "apps/api/src/modules/projects/projects.service.ts" "this.prisma.\$transaction" "projects - transactions"
check_pattern "apps/api/src/modules/projects/projects.service.ts" "select:" "projects - select hierarchise"

echo ""

check_file "apps/api/src/modules/documents/documents.service.ts" "documents.service.ts optimise"
check_pattern "apps/api/src/modules/documents/documents.service.ts" "select:" "documents - select optimise"

echo ""

check_file "apps/api/src/modules/events/events.service.ts" "events.service.ts optimise"
check_pattern "apps/api/src/modules/events/events.service.ts" "pageSize = 100" "events - pagination 100"

echo ""

check_file "apps/api/src/modules/intervenants/intervenants.service.ts" "intervenants.service.ts optimise"
check_pattern "apps/api/src/modules/intervenants/intervenants.service.ts" "take: 20" "intervenants - limite relations"

echo ""

check_file "apps/api/src/modules/stock/stock.service.ts" "stock.service.ts optimise"
check_pattern "apps/api/src/modules/stock/stock.service.ts" "take: 10" "stock - limite projectStockItems"

echo ""

check_file "apps/api/src/modules/ia/ia.service.ts" "ia.service.ts optimise"
check_pattern "apps/api/src/modules/ia/ia.service.ts" "take: 50" "ia - pagination"

echo ""

check_file "apps/api/src/modules/orders/orders.service.ts" "orders.service.ts optimise"
check_pattern "apps/api/src/modules/orders/orders.service.ts" "_count:" "orders - utilise _count"

echo ""

check_file "apps/api/src/modules/payments/payments.service.ts" "payments.service.ts optimise"
check_pattern "apps/api/src/modules/payments/payments.service.ts" "paidAt:" "payments - paidAt automation"

echo ""

check_file "apps/api/src/modules/signature/signature.service.ts" "signature.service.ts optimise"
check_pattern "apps/api/src/modules/signature/signature.service.ts" "signedAt:" "signature - signedAt automation"

echo ""

check_file "apps/api/src/modules/notifications/notifications.service.ts" "notifications.service.ts optimise"
check_pattern "apps/api/src/modules/notifications/notifications.service.ts" "pageSize = 50" "notifications - pagination"

echo ""

check_file "apps/api/src/modules/stats/stats.service.ts" "stats.service.ts optimise"
check_pattern "apps/api/src/modules/stats/stats.service.ts" "_sum:" "stats - agregation combinee"

echo ""

check_file "apps/api/src/modules/audit/audit.service.ts" "audit.service.ts optimise"
check_pattern "apps/api/src/modules/audit/audit.service.ts" "pageSize = 100" "audit - pagination"

# Schéma Prisma
echo ""
echo "Verification du schema Prisma..."
echo ""

check_file "prisma/schema.prisma" "schema.prisma existe"
check_pattern "prisma/schema.prisma" "workspaceId.*userId.*isRead" "Notifications - index userId+isRead"
check_pattern "prisma/schema.prisma" "workspaceId.*projectId" "AuditLog - index workspace+project"

# Fichiers de documentation
echo ""
echo "Verification de la documentation..."
echo ""

check_file "PRISMA_OPTIMISATIONS.md" "Documentation des optimisations"
check_file "MIGRATION_GUIDE.md" "Guide de migration"
check_file "API_CHANGES.md" "Documentation des changements d'API"
check_file "OPENAI_BEST_PRACTICES.md" "Bonnes pratiques OpenAI"
check_file "OPTIMIZATION_SUMMARY.md" "Resume des optimisations"
check_file "FILES_MODIFIED.md" "Liste des fichiers modifies"

# Résumé
echo ""
echo "=========================================="
echo "Resume de la validation"
echo "=========================================="
echo "Verifications reussies: $CHECKS_PASSED"
echo "Verifications echouees: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo "SUCCES: Toutes les optimisations sont en place!"
    exit 0
else
    echo "ERREUR: Certaines optimisations manquent. Verifiez ci-dessus."
    exit 1
fi
