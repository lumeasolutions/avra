Set-Location -Path $PSScriptRoot
$env:GIT_PAGER = "cat"
$env:PAGER = "cat"

Write-Host "=== Add / commit : fix coquille email multi-metier ===" -ForegroundColor Cyan
git add -A
git commit `
  -m "fix(auth): coquille email multi-metier (lumeasolutionsss -> lumeasolutions)" `
  -m "MULTI_METIER_EMAILS (useAuthStore.ts) et ADMIN_EMAILS (parametres/page.tsx) contenaient un email avec 3 s au lieu de 2, ne matchant jamais le compte reel d'Esteve" `
  -m "Consequence : isMultiMetierEmail() renvoyait toujours false pour lui en prod, le switcher Changer de portail et le bloc admin de Parametres etaient silencieusement neutralises" `
  -m "CLAUDE.md corrige en cohesion. BETA_ADMIN_EMAILS (var env Vercel) a corriger manuellement, pas touche par ce commit"

Write-Host ""
Write-Host "=== Push HEAD vers main (fast-forward) ===" -ForegroundColor Cyan
git push origin HEAD:main

Write-Host ""
git --no-pager log --oneline -5 origin/main

Write-Host ""
Write-Host "=== FINI ===" -ForegroundColor Green
Read-Host "Appuie sur Entree pour fermer"
