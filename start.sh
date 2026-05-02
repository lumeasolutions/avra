#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AVRA — Démarrage local (macOS / Linux)
# Exécuter: ./start.sh
# ══════════════════════════════════════════════════════════════════════════════

# Aller à la racine du projet
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    AVRA — Démarrage                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant !"
    echo ""
    echo "Copiez .env.example vers .env et remplissez les valeurs :"
    echo "  cp .env.example .env"
    exit 1
fi

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    pnpm install || { echo "❌ pnpm install a échoué"; exit 1; }
fi

# Fonction pour nettoyer les processus à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    kill $API_PID $WEB_PID 2>/dev/null
    wait $API_PID $WEB_PID 2>/dev/null
    echo "✅ Serveurs arrêtés."
    exit 0
}
trap cleanup INT TERM

echo "🚀 Démarrage de l'API NestJS (port 3001)..."
pnpm --filter @avra/api dev &
API_PID=$!

echo "⏳ Attente démarrage API..."
sleep 4

echo "🌐 Démarrage du frontend Next.js (port 3002)..."
pnpm --filter @avra/web dev &
WEB_PID=$!

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✅ AVRA en cours de démarrage..."
echo ""
echo "  🌐 Frontend : http://localhost:3002"
echo "  🔧 API      : http://localhost:3001/api"
echo "  📖 Swagger  : http://localhost:3001/api/docs"
echo ""
echo "  🔑 Connexion démo : demo@avra.fr / demo123"
echo "  📘 Code bêta      : AVRA2026"
echo ""
echo "  Ctrl+C pour arrêter les serveurs"
echo "══════════════════════════════════════════════════════════════"

# Attendre que les deux processus se terminent
wait $API_PID $WEB_PID
