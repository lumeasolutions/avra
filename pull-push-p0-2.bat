@echo off
cd /d "%~dp0"
echo === Pull (merge) du remote main ===
git pull origin main --no-rebase --no-edit
echo.
echo === Push ===
git push origin main
echo.
echo === Etat ===
git status
git log --oneline -4
echo.
echo === FINI ===
pause
