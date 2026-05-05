@echo off
REM ============================================================
REM  AVRA — Script de commit session P1
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM  Contenu : vercel.json routing API, CSP Sentry+Plausible,
REM            sitemap articles blog, CLAUDE.md, Plausible layout,
REM            suppression .md inutiles
REM ============================================================

echo === Suppression des anciens .md de travail ===

del /f /q 00_START_HERE_CLAUDE_API.md
del /f /q ANALYSE_AVRA.md
del /f /q API_CHANGES.md
del /f /q "AUDIT-COMPLET-MODIFICATIONS-AVRA.md"
del /f /q AUDIT_AVRA_23mars2026.md
del /f /q AUDIT_FINAL_INDEX.md
del /f /q AUDIT_PERFORMANCE_COMPLET_2026.md
del /f /q AUDIT_REPORT.md
del /f /q AUDIT_REPORT_WEBSITE.md
del /f /q CACHE_MEMOIZATION_GUIDE.md
del /f /q CLAUDE_API_INTEGRATION.md
del /f /q COMPLETION_SUMMARY.md
del /f /q CREATION_PAGES_METIERS.md
del /f /q DELIVERABLES.md
del /f /q DEPLOIEMENT_CLOUD.md
del /f /q DEPLOYMENT_GUIDE.md
del /f /q DEPLOYMENT_READINESS_CHECKLIST.md
del /f /q ERREURS_DETAILLEES_AVEC_REMEDES.md
del /f /q FILES_MODIFIED.md
del /f /q FINAL_EXECUTIVE_SUMMARY.md
del /f /q FINAL_SECURITY_AUDIT_REPORT.md
del /f /q GUIDE_CONTINUATION_IMPLEMENTATION.md
del /f /q IA_DEPLOYMENT_CHECKLIST.md
del /f /q IA_DEVELOPMENT_GUIDE.md
del /f /q IA_INTEGRATION_COMPLETE.md
del /f /q IA_INTEGRATION_INDEX.md
del /f /q IA_INTEGRATION_SUMMARY.md
del /f /q IA_SETUP_GUIDE.md
del /f /q IMPLEMENTATION_CACHE_MEMOIZATION.md
del /f /q INDEX.md
del /f /q INTEGRATION_COMPLETE.md
del /f /q MIGRATION_GUIDE.md
del /f /q OPENAI_BEST_PRACTICES.md
del /f /q OPTIMIZATION_SUMMARY.md
del /f /q PAGES_METIERS_GUIDE.md
del /f /q "PHASE1-2_CHANGEMENTS.md"
del /f /q PHASE1_QUICK_REFERENCE.md
del /f /q PHASE5_COMPLETE.md
del /f /q "PHASES_5-8_ULTRA_FAST.md"
del /f /q PRISMA_OPTIMISATIONS.md
del /f /q QUICK_FIX.md
del /f /q QUICK_START.md
del /f /q QUICK_WINS_ACTIONS_IMMEDIATES.md
del /f /q README_IMPLEMENTATION.md
del /f /q README_SECURITY.md
del /f /q REFACTORING_GUIDE.md
del /f /q REFACTORISATION_STORE.md
del /f /q SECURITY_DEPLOYMENT_GUIDE.md
del /f /q SECURITY_FIXES_PHASE1.md
del /f /q SECURITY_FIXES_PHASE2.md
del /f /q SECURITY_INDEX.md
del /f /q SECURITY_PHASE2_SUMMARY.md
del /f /q SECURITY_SCORECARD_FINAL.md
del /f /q SECURITY_VERIFICATION_CHECKLIST.md
del /f /q START_HERE.md

echo === Staging des fichiers modifies ===

REM Fix critique : routing /api/v1/* vers serverless NestJS
git add vercel.json

REM CSP : Sentry + Plausible dans connect-src et script-src
git add apps/web/next.config.js

REM Sitemap : 2 articles de blog
git add apps/web/app/sitemap.ts

REM Plausible analytics
git add "apps/web/app/(marketing)/layout.tsx"

REM CLAUDE.md
git add CLAUDE.md

REM Suppression des .md
git rm --ignore-unmatch --cached *.md
git add README.md
git add CLAUDE.md

echo === Verification staging ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "feat(p1): Plausible analytics, fix CSP Sentry, vercel routing API, sitemap blog, CLAUDE.md

- fix(vercel): ajoute rewrites /api/v1/* -> serverless NestJS (apps/web/api/index.ts)
- fix(csp): ajoute *.sentry.io et plausible.io dans connect-src
- fix(csp): ajoute plausible.io dans script-src
- feat(analytics): Plausible script dans marketing layout (RGPD-friendly, no cookies)
- seo: sitemap ajoute /blog/e-facture-2026 et /blog/logiciel-cuisiniste-comparatif
- chore: CLAUDE.md cree (reference projet pour les sessions suivantes)
- chore: suppression des 55 .md de travail obsoletes a la racine"

echo.
echo === Resultat ===
git log --oneline -3

echo.
echo Script termine. Pour pusher : git push origin main
pause
