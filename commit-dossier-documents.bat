@echo off
REM ============================================================
REM  AVRA — Commit : systeme documents dossiers production-grade
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM
REM  Contenu de ce commit :
REM   - Backend NestJS : module DossierDocuments complet
REM     (controller + service + SupabaseStorageService)
REM   - Frontend Next : lib/dossier-docs-api.ts + refonte
REM     apps/web/app/(app)/dossiers/[id]/page.tsx avec
REM     rehydratation depuis l'API (source de verite = DB)
REM   - Prisma : modele DossierDocument + migration
REM   - Validation env : SUPABASE_URL, SERVICE_ROLE_KEY, BUCKET
REM   - Shim prisma-client.d.ts : readonly dossierDocument
REM   - Stub deprecie apps/web/lib/supabase.ts (compat imports)
REM   - Suppression @supabase/supabase-js cote web
REM ============================================================

echo.
echo === Sanity check : etes-vous dans le dossier Avra ? ===
if not exist "apps\api\src\modules\dossier-documents\dossier-documents.service.ts" (
  echo [ERREUR] Ce script doit etre lance depuis C:\Users\abcon\Desktop\Avra\
  pause
  exit /b 1
)

echo.
echo === Pre-commit : pnpm install pour regenerer le lockfile ===
call pnpm install
if errorlevel 1 (
  echo [ERREUR] pnpm install a echoue — stop.
  pause
  exit /b 1
)

echo.
echo === Pre-commit : generation Prisma client ===
call node generate-prisma.js
if errorlevel 1 (
  echo [ERREUR] generate-prisma.js a echoue — stop.
  pause
  exit /b 1
)

echo.
echo === Pre-commit : build API (type-check complet) ===
call pnpm --filter @avra/api run build
if errorlevel 1 (
  echo [ERREUR] Build API echoue — corriger avant de commiter.
  pause
  exit /b 1
)

echo.
echo === Pre-commit : build web (type-check + Next build) ===
call pnpm --filter @avra/web run build
if errorlevel 1 (
  echo [ERREUR] Build web echoue — corriger avant de commiter.
  pause
  exit /b 1
)

echo.
echo === Staging des fichiers ===

REM Prisma : modele + migration
git add prisma/schema.prisma
git add prisma/migrations/20260423_add_dossier_documents/migration.sql

REM Backend API : module documents
git add apps/api/src/modules/dossier-documents/dossier-documents.module.ts
git add apps/api/src/modules/dossier-documents/dossier-documents.controller.ts
git add apps/api/src/modules/dossier-documents/dossier-documents.service.ts
git add apps/api/src/modules/dossier-documents/supabase-storage.service.ts
git add apps/api/src/app.module.ts
git add apps/api/src/config/env.validation.ts
git add apps/api/src/types/prisma-client.d.ts
git add apps/api/package.json

REM Frontend web : API client + refonte page dossier + store + stub supabase
git add apps/web/lib/dossier-docs-api.ts
git add apps/web/lib/supabase.ts
git add "apps/web/app/(app)/dossiers/[id]/page.tsx"
git add "apps/web/app/(app)/dossiers/nouveau/page.tsx"
git add apps/web/hooks/useProjectActions.ts
git add apps/web/hooks/useDataSync.ts
git add apps/web/store/useDossierStore.ts
git add apps/web/next.config.js
git add apps/web/package.json

REM Lockfile (si modifie)
git add pnpm-lock.yaml

REM Config deploiement
git add vercel.json

echo.
echo === Verification staging ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "feat(dossiers): production-grade document management + fix chaine end-to-end" -m "Backend :" -m " - nouveau module DossierDocuments (controller/service/storage)" -m " - bucket prive + URLs signees 60min + whitelist MIME + limite 25Mo" -m " - ownership workspace verifie a chaque appel (assertProjectInWorkspace)" -m " - paths non-devinables : workspaces/{ws}/projects/{proj}/{sf}/{uuid}_{name}" -m " - rollback storage si echec DB" -m "" -m "Frontend :" -m " - apps/web/lib/dossier-docs-api.ts : client typed (upload/list/signed-url/delete)" -m " - refonte page [id] : upload/preview/download/delete via API" -m " - rehydratation au chargement (source de verite = DB, plus de perte si localStorage vide)" -m " - creation a la volee des sous-dossiers inconnus, fallback 'AUTRES'" -m " - spinner discret pendant la sync" -m " - page /dossiers/nouveau passe par createProject (API double-write)" -m " - sign/updateStatus dans page detail passent par useProjectActions" -m " - helper isLocalOnlyId pour skip les appels API sur IDs locaux" -m " - syncProjects fait un merge intelligent (preserve subfolders/notes/tva locaux)" -m " - notes persistees en localStorage via updateDossierNotes" -m " - suppression de @supabase/supabase-js cote web (stub deprecie conserve)" -m "" -m "Config :" -m " - vercel.json : build API avant web + includeFiles api/dist" -m " - next.config.js : CSP autorise *.supabase.co (img/connect/frame)" -m "" -m "DB :" -m " - modele Prisma DossierDocument avec cascade + index composes" -m " - migration SQL 20260423_add_dossier_documents" -m " - shim prisma-client.d.ts : readonly dossierDocument ajoute"

if errorlevel 1 (
  echo [ERREUR] Le commit a echoue.
  pause
  exit /b 1
)

echo.
echo === Resultat ===
git log --oneline -3

echo.
echo ===========================================================
echo  Commit cree. AVANT DE PUSH :
echo   1) Verifier les env vars Vercel (Prod + Preview) :
echo      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DOSSIER_BUCKET
echo   2) Verifier que le bucket prive 'dossier-documents' existe sur Supabase
echo   3) Apres push, la migration Prisma s'executera via vercel.json buildCommand
echo.
echo  Pour pusher :  git push origin main
echo ===========================================================
pause
