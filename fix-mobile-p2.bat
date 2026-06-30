@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Add / commit fixes P2 mobile ===
git add -A
git commit -m "fix(mobile): finitions P2 responsive" -m "- Dashboard stats grid 2 cols mobile" -m "- Stock: grilles modale grid-cols-1 sm:grid-cols-2" -m "- SAV: toolbar bulk flex-wrap" -m "- Planning: barre nav semaine flexWrap" -m "- Parametres: cartes IA grid-cols-1 sm:grid-cols-3" -m "- Stats: libelles onglets courts sur mobile" -m "- Intervenants: modales max-h+overflow" -m "- Dossiers signes: padding backdrop modale TdB"
echo.
echo === Push HEAD vers main (fast-forward) ===
git push origin HEAD:main
echo.
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
