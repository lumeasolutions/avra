@echo off
REM ============================================================
REM  AVRA — Hotfix CSP : autoriser GA4 (script + connect + img)
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM ============================================================

echo === Nettoyage du lock git eventuel ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging des fichiers ===
git add "apps/web/middleware.ts"
git add "apps/web/next.config.js"

echo === Diff stage ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "fix(seo): autorise GA4 dans la CSP (script-src, connect-src, img-src)" -m "Le tag gtag.js etait charge mais bloque par la CSP : 503 sur googletagmanager.com et requetes /collect bloquees vers google-analytics.com." -m "Whitelist ajoutee dans middleware.ts (CSP par requete) et next.config.js (CSP fallback) :" -m "- script-src : + https://www.googletagmanager.com" -m "- connect-src : + https://www.google-analytics.com, https://*.analytics.google.com, https://www.googletagmanager.com" -m "- img-src : + https://www.google-analytics.com, https://www.googletagmanager.com (pour les pixels de tracking)"

echo.
echo === Push vers origin/main ===
git push origin main

echo.
echo === Resultat ===
git log --oneline -3

echo.
echo Script termine. Vercel va deployer automatiquement (~2 min).
pause
