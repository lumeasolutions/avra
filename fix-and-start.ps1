# ============================================================
# AVRA - Script de correction et démarrage automatique
# Exécuter dans PowerShell depuis C:\Users\abcon\Desktop\Avra
# ============================================================

Write-Host "🚀 AVRA - Correction et démarrage..." -ForegroundColor Cyan
Write-Host ""

# Étape 1: Générer le client Prisma
Write-Host "⏳ Étape 1/3: Génération du client Prisma..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\apps\api"
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de prisma generate" -ForegroundColor Red
    Write-Host "Essai avec --skip-generate ignoré..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Client Prisma généré!" -ForegroundColor Green
}

# Étape 2: Retourner à la racine
Set-Location $PSScriptRoot
Write-Host ""

# Étape 3: Lancer le serveur
Write-Host "⏳ Étape 2/3: Installation des dépendances manquantes..." -ForegroundColor Yellow
pnpm install
Write-Host "✅ Dépendances OK!" -ForegroundColor Green
Write-Host ""

Write-Host "⏳ Étape 3/3: Lancement du serveur..." -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:       http://localhost:3001" -ForegroundColor White
Write-Host "  Landing:   http://localhost:3002" -ForegroundColor White
Write-Host "  Swagger:   http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

pnpm dev
