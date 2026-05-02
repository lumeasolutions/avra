# E2E — AVRA Portail Intervenant

Tests end-to-end Playwright pour les flows critiques du portail intervenant.

## Activation

```bash
# Depuis apps/web/
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

## Variables d'environnement

| Variable | Description | Requis pour |
|----------|-------------|-------------|
| `E2E_BASE_URL` | URL frontend (defaut `http://localhost:3002`) | tous |
| `E2E_API_BASE_URL` | URL API NestJS (defaut `http://localhost:3001/api/v1`) | tous |
| `E2E_PRO_EMAIL` | Compte pro test | `flow complet`, `?next=` |
| `E2E_PRO_PASSWORD` | | |
| `E2E_INTERVENANT_EMAIL` | Compte intervenant test | `inbox`, `redirect login` |
| `E2E_INTERVENANT_PWD` | | |

Sans ces vars, les tests sont auto-`skipped` (CI verte sans seeds).

## Lancement

```bash
# Headless
pnpm exec playwright test

# UI mode (debug)
pnpm exec playwright test --ui

# Un seul fichier
pnpm exec playwright test e2e/intervenant-portal.spec.ts
```

## Couverture

- Flow complet : pro → envoie demande → intervenant la voit → accepte
- Inbox intervenant : filtres + tabs visibles
- Login auto-redirect vers `/intervenant` si user lie a Intervenant
- `?next=/intervenant` respecte le deep-link
- `?next=https://evil.com` rejette l'URL externe (anti open-redirect)
- Page invitation publique avec token invalide

## Note

Les tests utilisent l'UI uniquement (pas d'appels API directs) pour valider
que toute la stack fonctionne (frontend → /api/v1 → NestJS → Prisma → Postgres).

Pour seeder rapidement les comptes test :

```sql
-- Compte pro
INSERT INTO "User" (email, password, role, ...) VALUES ('e2e-pro@avra.test', ...);
-- Compte intervenant + lien
INSERT INTO "Intervenant" (..., userId) VALUES (...);
```

(A automatiser plus tard via un script `apps/api/scripts/seed-e2e.ts`.)
