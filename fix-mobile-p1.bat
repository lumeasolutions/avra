@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Add / commit fixes P1 mobile ===
git add -A
git commit -m "fix(mobile): corrige les points P1 responsive" -m "- Fiche dossier: header empile (avatar/infos/actions) sous 900px" -m "- Dossiers signes: panel dashboard minmax(min(240px,100%%)) -> plus de scroll horizontal" -m "- Facturation: modale Signature scrollable (max-h+overflow) + champs grid-cols-1 sm:grid-cols-2" -m "- Stats: table Fournisseur en conteneur scrollable + min-width" -m "- Parametres: form apporteur grid-cols-1 sm:grid-cols-2" -m "- Messagerie: DocBubble w-full max-w-16rem"
echo.
echo === Push HEAD vers main (fast-forward) ===
git push origin HEAD:main
echo.
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
