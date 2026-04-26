// @ts-ignore — package optionnel
import type { Page } from '@playwright/test';

/**
 * Helpers d'authentification pour les tests E2E.
 *
 * Utilisent l'API NestJS directement plutot que l'UI pour aller plus vite et
 * eviter les flakies. Le cookie httpOnly est pose par /auth/login → on
 * l'utilise pour les requetes suivantes.
 */

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/mot de passe/i).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /se connecter|connexion|login/i }).click(),
  ]);
}

export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * Saute le test si une variable d'env requise est absente.
 * Permet de garder la suite verte en CI sans seeds.
 */
export function requireEnv(...names: string[]): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const n of names) {
    const v = process.env[n];
    if (!v) return null;
    out[n] = v;
  }
  return out;
}
