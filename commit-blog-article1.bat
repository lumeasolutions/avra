@echo off
REM ============================================================
REM  AVRA — Article blog #1 : ERP cuisiniste + composants partages
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM ============================================================

echo === Nettoyage du lock git eventuel ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging des fichiers ===
git add "apps/web/app/blog/components/ArticleShell.tsx"
git add "apps/web/app/blog/components/ArticleBlocks.tsx"
git add "apps/web/app/blog/comment-choisir-erp-cuisiniste/layout.tsx"
git add "apps/web/app/blog/comment-choisir-erp-cuisiniste/page.tsx"

echo === Diff stage ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "feat(blog): article SEO — Comment choisir son ERP cuisiniste 2026" -m "Article long format 2500+ mots, design premium magazine. Composants reutilisables (ArticleShell + ArticleBlocks) qui serviront aussi pour les articles suivants." -m "- Hero gradient sombre + or, breadcrumb visuel, badge categorie" -m "- Sommaire sticky desktop + collapsible mobile, reading progress bar" -m "- Composants premium : Callout (4 variants), KeyTakeaways, StatGrid, ChecklistCard, ComparisonTable, FAQ accordion, FinalCTA, PullQuote, RelatedArticles" -m "- SEO : metadata complete, JSON-LD BlogPosting + FAQPage + BreadcrumbList, keywords cibles, canonical, OpenGraph article" -m "- Mots-cles vises : 'logiciel cuisiniste', 'ERP cuisiniste', 'choisir logiciel cuisiniste', 'meilleur logiciel cuisiniste 2026'"

echo.
echo === Push vers origin/main ===
git push origin main

echo.
echo === Resultat ===
git log --oneline -3

echo.
echo Script termine. Vercel deploie automatiquement (~2 min).
echo Article visible sur : https://avra-app.fr/blog/comment-choisir-erp-cuisiniste
pause
