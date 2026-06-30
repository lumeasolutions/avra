@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Add / commit fixes P0 mobile ===
git add -A
git commit -m "fix(mobile): corrige 3 points bloquants P0 responsive" -m "- Facturation: editeur de lignes en scroll horizontal (min-w-560) au lieu d ecraser 7 colonnes" -m "- StatsGateModal: body 3 colonnes empile en 1 colonne sous 900px (.statsgate-body)" -m "- Messagerie intervenants: vue empilee mobile (liste OU fil) + bouton retour"
echo.
echo === Push HEAD vers main (fast-forward) ===
git push origin HEAD:main
echo.
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
