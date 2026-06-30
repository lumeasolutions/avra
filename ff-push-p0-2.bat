@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Fetch origin ===
git fetch origin
echo.
echo === HEAD local (doit etre 09ec082 settings) ===
git --no-pager log --oneline -2 HEAD
echo.
echo === origin/main (etat reel du remote) ===
git --no-pager log --oneline -3 origin/main
echo.
echo === Push HEAD vers main (NON-force, fast-forward seulement) ===
git push origin HEAD:main
echo.
echo === origin/main apres push ===
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
