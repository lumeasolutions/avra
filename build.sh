#!/bin/bash
set -e

cd /sessions/magical-gracious-wozniak/mnt/Avra

# Nettoyer le build précédent
rm -rf apps/web/.next

# Exécuter le build avec node directement
export NODE_PATH=/sessions/magical-gracious-wozniak/mnt/Avra/node_modules:/sessions/magical-gracious-wozniak/mnt/Avra/node_modules/.pnpm/next@14.2.18_@babel+core@7.29.0_@opentelemetry+api@1.9.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules

# Changer vers le répertoire de l'app
cd apps/web

# Utiliser le chemin complet vers next
node /sessions/magical-gracious-wozniak/mnt/Avra/node_modules/.pnpm/next@14.2.18_@babel+core@7.29.0_@opentelemetry+api@1.9.0_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/bin/next build

echo "Build completed successfully!"
