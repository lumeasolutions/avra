#!/usr/bin/env node
/**
 * Cross-platform Prisma generate script for pnpm monorepo
 * Run from project root: node generate-prisma.js
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const apiDir = path.join(rootDir, 'apps', 'api');
const sep = process.platform === 'win32' ? ';' : ':';

// Prisma binary in pnpm store.
const pnpmStore = path.join(rootDir, 'node_modules', '.pnpm');
// Chemin historique (fonctionne avec prisma 5.22.0 pinné à la racine).
let prismaPath = path.join(pnpmStore, 'prisma@5.22.0', 'node_modules', 'prisma', 'build', 'index.js');
// Robustesse : la racine pin 5.22.0 mais les apps utilisent ^5.22.0, donc un
// `pnpm update` peut changer la version et casser le chemin en dur. Si le
// chemin historique n'existe pas, on résout dynamiquement (version-agnostique).
if (!fs.existsSync(prismaPath)) {
  try {
    const prismaPkg = require.resolve('prisma/package.json', { paths: [apiDir, rootDir] });
    prismaPath = path.join(path.dirname(prismaPkg), 'build', 'index.js');
  } catch {
    /* le contrôle fs.existsSync ci-dessous gèrera l'absence proprement */
  }
}
// Schema is at root/prisma/schema.prisma
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');

// NODE_PATH so prisma can find @prisma/engines etc.
const nodePath = [
  path.join(pnpmStore, 'prisma@5.22.0', 'node_modules', 'prisma', 'node_modules'),
  path.join(pnpmStore, 'prisma@5.22.0', 'node_modules'),
  path.join(pnpmStore, 'node_modules'),
  process.env.NODE_PATH || '',
].filter(Boolean).join(sep);

if (!fs.existsSync(prismaPath)) {
  console.error('ERROR: Local prisma binary not found at:', prismaPath);
  console.error('Please run: pnpm install');
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error('ERROR: Schema not found at:', schemaPath);
  process.exit(1);
}

console.log('Generating Prisma client (local v5.22.0)...');

try {
  // Run from apps/api so @prisma/client resolves via apps/api/node_modules
  execSync(`node "${prismaPath}" generate --schema="${schemaPath}"`, {
    stdio: 'inherit',
    cwd: apiDir,   // <-- KEY: run from apps/api, not root
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      PRISMA_GENERATE_SKIP_AUTOINSTALL: 'true',
    }
  });
  console.log('Done! Prisma client generated successfully.');
} catch (err) {
  console.error('Prisma generate failed.');
  process.exit(1);
}
