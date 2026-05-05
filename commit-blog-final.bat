@echo off
REM ============================================================
REM  AVRA — Articles blog #2 (IA archi) + #3 (devis) + index + sitemap
REM  Lancer APRES commit-blog-article1.bat
REM  Lancer depuis : C:\Users\abcon\Desktop\Avra\
REM ============================================================

echo === Nettoyage du lock git eventuel ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging des fichiers ===
git add "apps/web/app/blog/ia-architecte-interieur/layout.tsx"
git add "apps/web/app/blog/ia-architecte-interieur/page.tsx"
git add "apps/web/app/blog/devis-cuisine-modele-mentions-legales/layout.tsx"
git add "apps/web/app/blog/devis-cuisine-modele-mentions-legales/page.tsx"
git add "apps/web/app/blog/page.tsx"
git add "apps/web/app/sitemap.ts"

echo === Diff stage ===
git diff --cached --stat

echo.
echo === Commit ===
git commit -m "feat(blog): articles SEO IA archi + devis cuisine + maj index + sitemap" -m "Article #2 : IA pour architectes interieur 2026 (2200+ mots)" -m "  - 7 outils IA qui changent le metier : photo-realisme, coloriste, moodboard, reco plan, analyse photo, extraction brief, assistant" -m "  - StatGrid, comparison sans IA / avec IA, workflow type cabinet 3 archis" -m "  - 7 questions FAQ avec JSON-LD FAQPage" -m "" -m "Article #3 : Devis cuisine 2026 modele + mentions legales (2400+ mots)" -m "  - 14 mentions legales obligatoires checklistees" -m "  - Modele structure en 7 sections" -m "  - 9 leviers d'optimisation taux de signature" -m "  - 8 erreurs qui font perdre le client" -m "  - Sanctions DGCCRF detaillees" -m "  - 7 questions FAQ avec JSON-LD" -m "" -m "Index blog : 5 articles a la une (3 nouveaux + 2 existants)" -m "Sitemap : ajout des 3 nouvelles URLs avec priority 0.85"

echo.
echo === Push vers origin/main ===
git push origin main

echo.
echo === Resultat ===
git log --oneline -5

echo.
echo Script termine. Vercel deploie automatiquement (~2 min).
echo URLs des articles :
echo  - https://avra-app.fr/blog/comment-choisir-erp-cuisiniste
echo  - https://avra-app.fr/blog/ia-architecte-interieur
echo  - https://avra-app.fr/blog/devis-cuisine-modele-mentions-legales
pause
