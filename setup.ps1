# Setup script for AVRA on Windows
# Run this script in PowerShell from the project root: .\setup.ps1

Write-Host "=== AVRA Setup ===" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n[1/2] Installing dependencies..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pnpm install failed" -ForegroundColor Red
    exit 1
}

# Step 2: Generate Prisma client using LOCAL binary (not global)
Write-Host "`n[2/2] Generating Prisma client..." -ForegroundColor Yellow

$localPrisma = "apps\api\node_modules\.bin\prisma.CMD"

if (Test-Path $localPrisma) {
    & cmd /c "$localPrisma generate --schema=prisma\schema.prisma"
} else {
    # Fallback: use node directly with the local prisma build
    $prismaJs = "node_modules\.pnpm\prisma@5.22.0\node_modules\prisma\build\index.js"
    if (Test-Path $prismaJs) {
        node $prismaJs generate --schema=prisma\schema.prisma
    } else {
        Write-Host "WARNING: Could not find local prisma binary, trying pnpm exec..." -ForegroundColor Yellow
        pnpm --filter @avra/api exec prisma generate --schema=../../prisma/schema.prisma
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prisma generate failed. Make sure your DATABASE_URL is set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup complete! ===" -ForegroundColor Green
Write-Host "Run 'pnpm dev:api' to start the API server" -ForegroundColor Cyan
Write-Host "Run 'pnpm dev:web' to start the web app" -ForegroundColor Cyan
