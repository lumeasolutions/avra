# Checklist — Mise en prod du système documents dossiers AVRA

**Date :** 23 avril 2026
**Scope :** Backend NestJS + Frontend Next.js + Supabase Storage + Prisma

---

## 1. Préparation Supabase

- [ ] Se connecter au dashboard Supabase du projet AVRA (prod)
- [ ] Aller dans **Storage**
- [ ] Créer un bucket nommé **`dossier-documents`** (le nom doit correspondre à `SUPABASE_DOSSIER_BUCKET`)
- [ ] **IMPORTANT :** bucket **privé** (Public = OFF)
- [ ] Aucune politique RLS publique à créer — on utilise `service_role` côté serveur
- [ ] Récupérer la `service_role` key dans *Project Settings → API* (⚠️ ne JAMAIS la préfixer `NEXT_PUBLIC_`)

## 2. Variables d'environnement Vercel

Pour **Production** ET **Preview** :

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase (ex: `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server-only) |
| `SUPABASE_DOSSIER_BUCKET` | `dossier-documents` |

- [ ] Variables ajoutées sur **Production**
- [ ] Variables ajoutées sur **Preview**
- [ ] Redéploiement déclenché (pour que les nouvelles env vars soient prises en compte)
- [ ] Vérifier en grep que `NEXT_PUBLIC_SUPABASE_*` n'apparaît PAS dans la config Vercel

## 3. Commit & push

- [ ] Depuis **Windows PowerShell**, dans `C:\Users\abcon\Desktop\Avra\` :
  ```powershell
  .\commit-dossier-documents.bat
  ```
  Le script fait : `pnpm install`, `generate-prisma`, build API, build web, staging, commit.
- [ ] Si les builds passent, pousser :
  ```powershell
  git push origin main
  ```

## 4. Migration Prisma en production

La migration `20260423_add_dossier_documents` est exécutée automatiquement par Vercel via `buildCommand` dans `vercel.json` :

```json
"buildCommand": "pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma && pnpm --filter @avra/web build"
```

- [ ] Vérifier sur Vercel que la build log montre `Applying migration 20260423_add_dossier_documents`
- [ ] Si la migration échoue, la lancer manuellement depuis Windows :
  ```powershell
  node generate-prisma.js
  pnpm --filter @avra/api exec prisma migrate deploy
  ```
- [ ] Optionnel : vérifier sur Supabase SQL Editor que la table `DossierDocument` existe avec les 3 FK (workspaceId, projectId, createdById) et les 3 index (unique storagePath, projectId, composé workspaceId+projectId+subfolderLabel)

## 5. Vérifications post-déploiement

### Accès à l'app (user `lumeasolutionsss@outlook.fr`)

- [ ] Login sur https://avra.fr
- [ ] Ouvrir un dossier existant (ou en créer un nouveau)
- [ ] Cliquer sur un sous-dossier pour ouvrir la modale documents

### Tests E2E manuels

- [ ] **Upload PDF** : déposer un PDF < 25 Mo → apparition immédiate dans la liste
- [ ] **Upload image** (JPG/PNG) → preview inline cliquable fonctionne
- [ ] **Upload DOCX** → fichier visible, download OK
- [ ] **Preview PDF** : clic sur œil → iframe plein écran avec URL signée
- [ ] **Download** : clic sur flèche → fichier téléchargé (URL signée fraîche à chaque clic)
- [ ] **Delete** : clic sur croix rouge → doc retiré de la DB + du bucket

### Tests limites / sécurité

- [ ] **Fichier > 25 Mo** → doit afficher une alert `Fichier trop volumineux (max 25 Mo)` (erreur 400)
- [ ] **Fichier `.exe`** (ou MIME non whitelisté) → alert `Type de fichier non autorisé : …` (erreur 400)
- [ ] **Cross-workspace** : se connecter avec `cgdesignplan@gmail.com`, tenter d'accéder à l'URL d'un dossier créé par `lumeasolutionsss@...` en forgeant l'URL `/dossiers/{id-de-l-autre-user}` → doit afficher "Dossier introuvable" (403/404 côté API)
- [ ] **Réhydratation** : vider le localStorage (devtools → Application → Local Storage → `avra-dossier-store`), recharger la page dossier → les documents doivent réapparaître sous les bons sous-dossiers (avec spinner discret "Synchronisation…")

### Vérifications code / config

- [ ] Depuis la console du navigateur, ouvrir l'onglet Network, uploader un fichier → requête sur `/api/v1/dossiers/{id}/documents` (PAS d'appel direct vers `*.supabase.co`)
- [ ] Preview d'un doc → clic sur œil → Network doit montrer `/api/v1/…/signed-url` puis l'URL retournée pointe vers Supabase avec un token JWT dans les query params

## 6. Grep de contrôle (depuis Windows PowerShell)

Aucun résultat attendu pour :

```powershell
git grep -n "NEXT_PUBLIC_SUPABASE" apps/web
git grep -n "@supabase/supabase-js" apps/web
git grep -n "uploadToSupabase\|deleteFromSupabase\|readAsDataUrl" apps/web
```

Seul résultat toléré : `apps/web/lib/supabase.ts` qui contient `supabaseConfigured = false` (stub déprécié).

## 7. Rollback

En cas de problème en prod :

```powershell
git revert HEAD
git push origin main
```

La migration Prisma ne sera **pas** rollback automatiquement. Pour retirer la table :

```sql
DROP TABLE IF EXISTS "DossierDocument";
DELETE FROM "_prisma_migrations" WHERE "migration_name" LIKE '%add_dossier_documents%';
```

(et supprimer manuellement le contenu du bucket Supabase)

---

## Notes d'architecture

- **Source de vérité = DB** (table `DossierDocument`). Le store Zustand persisté en localStorage n'est qu'un cache UI ; la réhydratation au chargement resynchronise depuis l'API.
- **service_role** côté serveur uniquement (dans `SupabaseStorageService`). Jamais exposée au browser.
- **Bucket privé** + URLs signées 60 min → pas d'accès direct aux fichiers.
- **Ownership workspace** vérifié à chaque appel via `assertProjectInWorkspace()`.
- **Whitelist MIME** stricte dans `dossier-documents.service.ts` (images, PDF, Office, OpenDocument, texte, CAD).
- **Taille max** 25 Mo (constante `MAX_FILE_BYTES` et limite Multer).
- **Path non-devinable** : `workspaces/{ws}/projects/{proj}/{sf}/{uuid}_{filename}`.
- **Transactionnel** : si la création en DB échoue, le fichier est supprimé du bucket pour éviter les orphelins.
- **Suppression** : ouverte à tout membre du workspace (pas de RolesGuard renforcé, décision produit confirmée en session).
