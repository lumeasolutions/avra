@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Add / commit fix persistance facture montant global ===
git add -A
git commit -m "fix(facturation): persiste les factures saisies au montant global" -m "- addInvoice genere une ligne synthetique + write-through backend (avant: localStorage only, perdu cross-device)" -m "- Fiche dossier: bouton/modale Creer un devis renomme Creer une facture (coherent avec Factures liees)" -m "- L objet alimente la ligne de la facture"
echo.
echo === Push HEAD vers main (fast-forward) ===
git push origin HEAD:main
echo.
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
