@echo off
REM ============================================================
REM  AVRA — Fix login redirect loop (cookie logged_in en prod)
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM ============================================================

echo === Nettoyage du lock git eventuel ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging du fix ===
git add apps/api/src/modules/auth/auth.controller.ts

echo === Diff stage ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "fix(auth): pose le cookie logged_in en prod (SameSite=Lax)" -m "Sans ce cookie, AppGuard et IntervenantGuard cote client redirigent vers /login en boucle apres une connexion reussie : le store Zustand ne contient pas le token (cookie HttpOnly) et le seul signal client disponible (logged_in=true) n'etait pose qu'en dev local." -m "- Pose logged_in=true (non-HttpOnly) sur tous les environnements." -m "- Passe SameSite=Strict -> Lax : permet au cookie d'etre present des la premiere navigation top-level apres /login." -m "- Authn reelle inchangee : middleware Edge valide access_token (HttpOnly)."

echo.
echo === Push vers origin/main ===
git push origin main

echo.
echo === Resultat ===
git log --oneline -3

echo.
echo Script termine. Vercel va deployer automatiquement.
pause
