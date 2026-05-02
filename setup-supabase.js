#!/usr/bin/env node
/**
 * AVRA — Setup Supabase
 * Run: node setup-supabase.js
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const apiDir = path.join(rootDir, 'apps', 'api');
const sep = process.platform === 'win32' ? ';' : ':';

const pnpmStore = path.join(rootDir, 'node_modules', '.pnpm');
const prismaPath = path.join(pnpmStore, 'prisma@5.22.0', 'node_modules', 'prisma', 'build', 'index.js');
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');

const nodePath = [
  path.join(pnpmStore, 'prisma@5.22.0', 'node_modules', 'prisma', 'node_modules'),
  path.join(pnpmStore, 'prisma@5.22.0', 'node_modules'),
  path.join(pnpmStore, 'node_modules'),
  process.env.NODE_PATH || '',
].filter(Boolean).join(sep);

// Load .env manually so DATABASE_URL and DIRECT_URL are available
const envPath = path.join(rootDir, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

const env = {
  ...process.env,
  ...envVars,
  NODE_PATH: nodePath,
  PRISMA_GENERATE_SKIP_AUTOINSTALL: 'true',
};

console.log('Step 1/3 - Generating Prisma client...');
try {
  execSync(`node "${prismaPath}" generate --schema="${schemaPath}"`, {
    stdio: 'inherit', cwd: apiDir, env,
  });
} catch (e) {
  console.error('Prisma generate failed'); process.exit(1);
}

console.log('\nStep 2/3 - Pushing schema to Supabase (prisma db push)...');
try {
  execSync(`node "${prismaPath}" db push --schema="${schemaPath}" --skip-generate`, {
    stdio: 'inherit', cwd: apiDir, env,
  });
  console.log('Schema pushed to Supabase!');
} catch (e) {
  console.error('db push failed'); process.exit(1);
}

console.log('\nStep 3/3 - Seeding demo user...');
const seedPath = path.join(rootDir, 'prisma', 'seed-demo.ts');

if (fs.existsSync(seedPath)) {
  // Try tsx first, then ts-node
  const tsxPath = path.join(pnpmStore, 'tsx@4.19.2', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const tsxGlobal = path.join(rootDir, 'node_modules', '.bin', 'tsx');

  let seeded = false;
  for (const runner of [tsxGlobal, 'npx tsx', 'npx ts-node']) {
    try {
      execSync(`"${runner}" "${seedPath}"`, {
        stdio: 'inherit', cwd: rootDir, env, shell: true,
      });
      console.log('Demo user created!');
      seeded = true;
      break;
    } catch (e) { /* try next */ }
  }
  if (!seeded) {
    console.log('Could not run seed automatically. Run manually: npx tsx prisma/seed-demo.ts');
  }
} else {
  console.log('No seed file found at prisma/seed-demo.ts');
}

console.log('\nDone! Restart servers with: pnpm dev');
console.log('Login: demo@avra.fr / demo123');
