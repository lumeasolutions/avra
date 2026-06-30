@echo off
cd /d "%~dp0"
echo === Diagnostic initial ===
git rev-parse --short HEAD
git branch -vv
echo.
echo === Force main sur HEAD (09ec082 = settings) et bascule dessus ===
git checkout -B main HEAD
echo.
echo === Fetch remote ===
git fetch origin
echo.
echo === Merge remote main dans local main ===
git merge origin/main --no-edit
echo.
echo === Push ===
git push origin main
echo.
echo === Etat final ===
git status
git log --oneline -6
echo.
echo === FINI ===
pause
