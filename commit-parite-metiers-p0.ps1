Set-Location -Path $PSScriptRoot
$env:GIT_PAGER = "cat"
$env:PAGER = "cat"

Write-Host "=== Add / commit : parite metiers + isolement P0 ===" -ForegroundColor Cyan
git add -A
git commit `
  -m "fix(metiers): isolement des donnees par metier + parite complete cuisiniste/menuisier/architecte" `
  -m "- P0 cloisonnement : chaque dossier porte desormais sa profession (derivee de tradeType backend, mapTradeTypeToProfession)" `
  -m "- useDataSync : profession calculee PAR PROJET (plus par compte global) -> plus de fuite inter-metiers pour les comptes multi-metier" `
  -m "- Nouveaux selecteurs useVisibleDossiers / useVisibleDossiersSignes / useVisibleDossiersPerdus, appliques sur 22 pages/composants (portails, stats, planning, facturation, sidebar, assistant, commandes...)" `
  -m "- useAlertEngine : alertes filtrees par metier actif" `
  -m "- Fix bouton fantome Creer PROJET 1 sur dossier signe menuisier (garde manquante)" `
  -m "- Menuisier : bouton + PROJET N harmonise sur le meme mecanisme inline plafonne que cuisiniste (OPTION) / architecte (VERSION), plafond MENUISIER_MAX_PROJET=5 ajoute" `
  -m "- Bouton supprimer sous-dossier etendu aux 3 metiers (etait menuisier uniquement)" `
  -m "- Cuisiniste : defaut aligne sur 1 slot de depart (OPTION 1) comme menuisier/architecte, pour parite du flux de validation"

Write-Host ""
Write-Host "=== Push HEAD vers main (fast-forward) ===" -ForegroundColor Cyan
git push origin HEAD:main

Write-Host ""
git --no-pager log --oneline -5 origin/main

Write-Host ""
Write-Host "=== FINI ===" -ForegroundColor Green
Read-Host "Appuie sur Entree pour fermer"
