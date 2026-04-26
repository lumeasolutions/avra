// @ts-ignore — package optionnel : `pnpm add -D @playwright/test` pour executer
import { test, expect } from '@playwright/test';
import { loginAs, requireEnv } from './helpers/auth';

/**
 * E2E — Portail intervenant.
 *
 * Pre-requis : 2 comptes seedes en DB :
 *  - E2E_PRO_EMAIL / E2E_PRO_PASSWORD (compte cote pro avec workspace + 1 intervenant)
 *  - E2E_INTERVENANT_EMAIL / E2E_INTERVENANT_PWD (compte intervenant lie au workspace ci-dessus)
 *
 * Si les vars ne sont pas posees : la suite est skippee (CI verte sans seeds).
 */

test.describe('Portail intervenant', () => {
  test('flow complet : pro envoie demande → intervenant la voit + accepte', async ({ browser }) => {
    const env = requireEnv('E2E_PRO_EMAIL', 'E2E_PRO_PASSWORD', 'E2E_INTERVENANT_EMAIL', 'E2E_INTERVENANT_PWD');
    test.skip(!env, 'Variables E2E_* absentes — test skippe');
    if (!env) return;

    // ── 1. Pro se connecte et envoie une demande ────────────────────────────
    const proCtx = await browser.newContext();
    const proPage = await proCtx.newPage();
    await loginAs(proPage, env.E2E_PRO_EMAIL, env.E2E_PRO_PASSWORD);

    // Va sur la page intervenants
    await proPage.goto('/intervenants');
    await expect(proPage.getByRole('heading', { name: 'Intervenants' })).toBeVisible();

    // Clic sur "Envoyer une demande" (en header)
    await proPage.getByRole('button', { name: /envoyer une demande/i }).first().click();

    // Drawer ouvert : choisir le 1er intervenant disponible
    await expect(proPage.getByText(/choisir un intervenant/i)).toBeVisible({ timeout: 5000 });
    const firstIntervenantCard = proPage.locator('[data-testid="intervenant-card"]').first().or(
      proPage.locator('button').filter({ hasText: /poseur|electricien|menuisier|peintre/i }).first(),
    );
    await firstIntervenantCard.click();

    // Compose : remplir un titre et envoyer
    const uniqueTitle = `E2E Test ${Date.now()}`;
    await proPage.getByPlaceholder(/pose cuisine/i).or(
      proPage.locator('input[type="text"]').nth(0),
    ).fill(uniqueTitle);
    await proPage.getByRole('button', { name: /envoyer la demande/i }).click();

    // Confirmation
    await expect(proPage.getByText(/demande envoyee/i)).toBeVisible({ timeout: 5000 });
    await proCtx.close();

    // ── 2. Intervenant se connecte et voit la demande ───────────────────────
    const interCtx = await browser.newContext();
    const interPage = await interCtx.newPage();
    await loginAs(interPage, env.E2E_INTERVENANT_EMAIL, env.E2E_INTERVENANT_PWD);

    // Doit etre redirige automatiquement vers /intervenant
    await expect(interPage).toHaveURL(/\/intervenant/);
    await expect(interPage.getByText(/tableau de bord intervenant/i)).toBeVisible();

    // La demande doit apparaitre dans "À traiter"
    await expect(interPage.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });

    // Clic sur la demande → detail
    await interPage.getByText(uniqueTitle).first().click();
    await expect(interPage).toHaveURL(/\/intervenant\/demandes\//);

    // Accepter
    await interPage.getByRole('button', { name: /accepter/i }).first().click();
    await expect(interPage.getByText(/Acceptée|Acceptee/i)).toBeVisible({ timeout: 5_000 });

    await interCtx.close();
  });

  test('intervenant inbox affiche les filtres et tabs', async ({ page }) => {
    const env = requireEnv('E2E_INTERVENANT_EMAIL', 'E2E_INTERVENANT_PWD');
    test.skip(!env, 'Variables E2E_INTERVENANT_* absentes');
    if (!env) return;

    await loginAs(page, env.E2E_INTERVENANT_EMAIL, env.E2E_INTERVENANT_PWD);
    await page.goto('/intervenant/demandes');

    await expect(page.getByRole('heading', { name: /mes demandes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toutes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'À traiter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'En cours' })).toBeVisible();
  });

  test('login redirige vers /intervenant si user lie a un Intervenant', async ({ page }) => {
    const env = requireEnv('E2E_INTERVENANT_EMAIL', 'E2E_INTERVENANT_PWD');
    test.skip(!env, 'Variables E2E_INTERVENANT_* absentes');
    if (!env) return;

    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(env.E2E_INTERVENANT_EMAIL);
    await page.getByPlaceholder(/mot de passe/i).fill(env.E2E_INTERVENANT_PWD);
    await page.getByRole('button', { name: /se connecter|connexion/i }).click();

    await page.waitForURL(/\/intervenant/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/intervenant(\/|$)/);
  });

  test('login ?next=/intervenant respecte le deep-link', async ({ page }) => {
    const env = requireEnv('E2E_PRO_EMAIL', 'E2E_PRO_PASSWORD');
    test.skip(!env, 'Variables E2E_PRO_* absentes');
    if (!env) return;

    await page.goto('/login?next=/intervenant');
    await page.getByPlaceholder(/email/i).fill(env.E2E_PRO_EMAIL);
    await page.getByPlaceholder(/mot de passe/i).fill(env.E2E_PRO_PASSWORD);
    await page.getByRole('button', { name: /se connecter|connexion/i }).click();

    // Le pro est aussi redirige vers /intervenant via ?next= (whitelist)
    await page.waitForURL(/\/intervenant/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/intervenant/);
  });

  test('login ?next= rejette les URL externes (anti open-redirect)', async ({ page }) => {
    const env = requireEnv('E2E_PRO_EMAIL', 'E2E_PRO_PASSWORD');
    test.skip(!env, 'Variables E2E_PRO_* absentes');
    if (!env) return;

    await page.goto('/login?next=https://evil.example.com');
    await page.getByPlaceholder(/email/i).fill(env.E2E_PRO_EMAIL);
    await page.getByPlaceholder(/mot de passe/i).fill(env.E2E_PRO_PASSWORD);
    await page.getByRole('button', { name: /se connecter|connexion/i }).click();

    // Doit rester sur le domaine et NE PAS partir vers evil.example.com
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('evil.example.com');
  });
});

test.describe('Page invitation publique', () => {
  test('token invalide affiche message d\'erreur', async ({ page }) => {
    await page.goto('/invitation/token-qui-nexiste-pas-12345');
    await expect(page.getByText(/invitation invalide|invitation introuvable|expir/i)).toBeVisible({ timeout: 5_000 });
  });
});
