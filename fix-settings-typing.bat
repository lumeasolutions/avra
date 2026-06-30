@echo off
cd /d "%~dp0"
set GIT_PAGER=cat
set PAGER=cat
echo === Add / commit fix typage settings-api ===
git add -A
git commit -m "fix(settings): typage any des blocs SettingsConfig" -m "Les interfaces nommees du store (PreferencesConfig, Societe, ...) n ont pas de signature d index implicite et ne sont pas assignables a Record<string,unknown> -> erreur de build @avra/web. Champs typents en any."
echo.
echo === Push HEAD vers main (fast-forward) ===
git push origin HEAD:main
echo.
echo === origin/main ===
git --no-pager log --oneline -3 origin/main
echo.
echo === FINI ===
pause
