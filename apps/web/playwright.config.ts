/**
 * Playwright config — AVRA E2E.
 *
 * Pour activer les tests :
 *   1. pnpm add -D @playwright/test
 *   2. pnpm exec playwright install --with-deps chromium
 *   3. pnpm exec playwright test
 *
 * Variables d'env requises pour les tests d'integration :
 *   E2E_BASE_URL          — defaut http://localhost:3002 (dev frontend)
 *   E2E_API_BASE_URL      — defaut http://localhost:3001/api/v1
 *   E2E_PRO_EMAIL         — un compte pro de test (whitelistes en beta)
 *   E2E_PRO_PASSWORD
 *   E2E_INTERVENANT_EMAIL — un compte intervenant de test
 *   E2E_INTERVENANT_PWD
 *
 * Si les variables ne sont pas posees : les tests sont skippes via
 * `test.skip()` au lieu d'echouer (utile en CI sans seed).
 */

// @ts-ignore — package optionnel : ajouter via `pnpm add -D @playwright/test` pour activer
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
