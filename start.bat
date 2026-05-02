@echo off
:: ══════════════════════════════════════════════════════════════════════════════
:: AVRA — Démarrage local (Windows)
:: Double-cliquer pour lancer l'API + le frontend
:: ══════════════════════════════════════════════════════════════════════════════

title AVRA — Serveurs locaux

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    AVRA — Démarrage                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Aller à la racine du projet
cd /d "%~dp0"

:: Vérifier que .env existe
if not exist ".env" (
    echo [ERREUR] Fichier .env manquant !
    echo.
    echo Copiez .env.example vers .env et remplissez les valeurs.
    echo.
    pause
    exit /b 1
)

:: Vérifier que node_modules existe
if not exist "node_modules" (
    echo [INFO] Installation des dépendances...
    call pnpm install
    if errorlevel 1 (
        echo [ERREUR] pnpm install a échoué
        pause
        exit /b 1
    )
)

echo [1/2] Démarrage de l'API NestJS (port 3001)...
start "AVRA API" cmd /k "cd /d %~dp0 && pnpm --filter @avra/api dev"

:: Attendre 3 secondes pour que l'API démarre
timeout /t 3 /nobreak >nul

echo [2/2] Démarrage du frontend Next.js (port 3002)...
start "AVRA Web" cmd /k "cd /d %~dp0 && pnpm --filter @avra/web dev"

echo.
echo ══════════════════════════════════════════════════════════════
echo   ✅ AVRA démarre dans 2 fenêtres séparées
echo.
echo   🌐 Frontend : http://localhost:3002
echo   🔧 API      : http://localhost:3001/api
echo   📖 Swagger  : http://localhost:3001/api/docs
echo.
echo   🔑 Connexion démo : demo@avra.fr / demo123
echo   📘 Code bêta      : AVRA2026
echo ══════════════════════════════════════════════════════════════
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul
