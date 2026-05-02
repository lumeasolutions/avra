# Audit final — Système dossiers & documents AVRA

**Date :** 23 avril 2026 (audit initial + 6 fixes + réaudit)
**Statut :** ✅ **Production-ready** (sous réserve des étapes de déploiement ci-dessous)

---

## Résumé exécutif

Le système dossiers/documents est maintenant cohérent bout en bout :

- **Création d'un dossier** → persiste en DB via `POST /projects/with-client`.
- **Upload d'un document** → backend valide (MIME, taille, ownership workspace), stocke sur Supabase bucket privé, retourne un cuid.
- **Preview / download** → URL signée fraîche 1 h, CSP autorise Supabase.
- **Delete** → purge DB + bucket.
- **Réhydratation** → `listDossierDocs` merge les docs backend dans le store au chargement ; vider le localStorage ne perd rien.
- **Multi-device** : les documents sont bien partagés entre appareils (source de vérité = DB).
- **Sous-dossiers / validation / notes** : locaux-only (localStorage), documenté dans le code et l'audit.

---

## Fixes appliqués dans cette session

| # | Fix | Fichier(s) |
|---|---|---|
| 1 | Page `/dossiers/nouveau` passe par `useProjectActions.createProject` (API + store). Ajout du try/catch + error state. | `apps/web/app/(app)/dossiers/nouveau/page.tsx` |
| 2a | Page détail : `signerDossier` → `signProject` (API) | `apps/web/app/(app)/dossiers/[id]/page.tsx` |
| 2b | Page détail : `updateDossierStatus` → `updateProjectStatus` (API) | idem |
| 2c | Notes : persistées en localStorage via `updateDossierNotes` + sync initiale depuis `dossier.notes` | idem |
| 3a | `vercel.json` buildCommand inclut `pnpm --filter @avra/api build` | `vercel.json` |
| 3b | `functions.includeFiles: "apps/api/dist/**"` pour garantir que le bundle serverless embarque bien le dist NestJS | idem |
| 4 | CSP : `img-src` + `connect-src` + `frame-src` ajoutent `https://*.supabase.co` (preview images + downloads directs + iframe PDF) | `apps/web/next.config.js` |
| 5 | `syncProjects` fait un merge intelligent : champs serveur (name, client…) écrasent, champs locaux (subfolders, notes, address, tva, tauxTVA, delaiChantier, signedSubfolders, confirmations) préservés. | `apps/web/hooks/useDataSync.ts` |
| 6 | `useProjectActions` : helper `isLocalOnlyId(id)` remplace la liste hardcodée `['d1'...'d9']`. Évite d'appeler l'API avec des IDs locaux qui ne sont pas encore persistés. | `apps/web/hooks/useProjectActions.ts` |
| bonus | Ajout des champs `tauxTVA`, `delaiChantier`, `delaiChantierUnit` dans `CreateProjectData` + propagation dans `addDossier`. | idem + `apps/web/store/useDossierStore.ts` |

---

## Cartographie finale — ce qui est persisté où

| Donnée | Backend (DB) | Store (localStorage) | API de modif côté UI |
|---|---|---|---|
| Dossier (id, client, statut) | ✅ Project + Client | ✅ synchronisé au login | `useProjectActions.createProject` |
| Changement statut UI (URGENT / EN COURS / …) | ✅ via `priority` | ✅ | `useProjectActions.updateProjectStatus` |
| Signer un dossier | ✅ `lifecycleStatus: SIGNE` | ✅ déplacé vers `dossiersSignes` | `useProjectActions.signProject` |
| Perdre un dossier | ✅ `lifecycleStatus: PERDU` | ✅ déplacé vers `dossiersPerdus` | `useProjectActions.loseProject` |
| Document (upload / preview / delete) | ✅ `DossierDocument` + Supabase Storage | ✅ merge via `listDossierDocs` | `lib/dossier-docs-api.ts` |
| Sous-dossiers (ajout/valider) | ❌ | ✅ `addSubfolder`, `toggleSubfolderValidated` | store direct |
| Notes du dossier | ❌ | ✅ `updateDossierNotes` | store direct |
| Adresse / TVA / délai chantier | ❌ (envoi partiel lors du create, pas mis à jour ensuite) | ✅ | store direct |
| Factures / devis | ✅ via `/payments` | ✅ synchronisé | `useFacturationStore` |
| Intervenants | ✅ via `/intervenants` | ✅ synchronisé | `useIntervenantStore` |
| Events calendrier | ✅ via `/events` | ✅ synchronisé | stores planning |

---

## Tests manuels recommandés après déploiement

1. **Login** sur `lumeasolutionsss@outlook.fr`
2. **Créer un nouveau dossier** via `/dossiers/nouveau`
   - Ouvrir l'onglet Network
   - Au submit : doit voir `POST /api/v1/projects/with-client` (200)
   - URL finale = `/dossiers/c...` (cuid Prisma, pas `/dossiers/d...`)
3. **Uploader un PDF et une image** dans un sous-dossier
   - Doit voir `POST /api/v1/dossiers/{cuid}/documents` → 201
   - Preview iframe PDF doit s'afficher (CSP OK)
   - Preview image inline doit s'afficher
4. **Download** : clique sur la flèche → URL signée Supabase → fichier téléchargé
5. **Delete** : clic sur la croix rouge → doc disparaît, `DELETE .../documents/{docId}` 204
6. **Multi-device test** : se connecter sur un autre navigateur → le dossier + les documents doivent apparaître (store hydraté depuis DB + API docs)
7. **Vider le localStorage** → recharger la page dossier → spinner discret puis documents réapparaissent
8. **Changement de statut** (URGENT/EN COURS/…) : voir `PUT /projects/{id}` dans Network
9. **Signer** : voir `POST /projects/{id}/sign` → le dossier bascule dans `/dossiers-signes`
10. **Limites** :
    - Fichier > 25 Mo → alert `Fichier trop volumineux`
    - Fichier `.exe` → alert `Type de fichier non autorisé`
    - Forge URL `/dossiers/{id-d-un-autre-workspace}` → 403/404
11. **Sync préservation** : créer un sous-dossier manuellement, le valider, ajouter des notes → recharger la page → tout doit être préservé (même si le sync API tourne)

---

## Limitations connues (par design)

Ces points sont **intentionnellement locaux-only** pour ne pas bloquer la bêta :

- **Sous-dossiers custom** (`addSubfolder`) et leur état `validated` : en localStorage. Si un user ajoute "DEVIS — Cuisine X" sur son PC et se connecte sur son Mac, le sous-dossier n'apparaît pas côté Mac (mais les documents uploadés dedans réapparaissent dans le fallback `AUTRES` grâce à la réhydratation).
- **Notes** : persistées en localStorage. Multi-device non garanti.
- **TVA / adresses / délai chantier** : passés à la création (en partie : email, phone, name), mais non mis à jour par la suite via l'API.

Pour corriger ces points à terme, il faudra :
- nouveau modèle Prisma `Subfolder` (ou JSON sur Project)
- endpoints `PATCH /projects/:id/subfolders`, `PATCH /projects/:id/notes`
- câblage dans le store pour fire-and-forget optimistic updates

---

## Déploiement : checklist restante (à exécuter depuis Windows)

Voir [`CHECKLIST_DOSSIER_DOCUMENTS.md`](./CHECKLIST_DOSSIER_DOCUMENTS.md) pour le détail.

1. [ ] Créer le bucket privé `dossier-documents` sur Supabase
2. [ ] Ajouter les env vars Vercel (Prod + Preview) :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DOSSIER_BUCKET=dossier-documents`
3. [ ] Lancer `commit-dossier-documents.bat` depuis `C:\Users\abcon\Desktop\Avra\`
   - Il fait : `pnpm install` → `generate-prisma.js` → build API → build web → staging → commit
4. [ ] `git push origin main`
5. [ ] Vérifier dans le build log Vercel :
   - `Applying migration 20260423_add_dossier_documents` passe
   - Les builds `@avra/api` et `@avra/web` passent sans erreur
6. [ ] Tester les 11 scénarios manuels ci-dessus

---

## Fichiers modifiés dans cette session (récap)

### Nouveaux fichiers
- `apps/api/src/modules/dossier-documents/dossier-documents.controller.ts`
- `apps/api/src/modules/dossier-documents/dossier-documents.service.ts`
- `apps/api/src/modules/dossier-documents/dossier-documents.module.ts`
- `apps/api/src/modules/dossier-documents/supabase-storage.service.ts`
- `apps/web/lib/dossier-docs-api.ts`
- `prisma/migrations/20260423_add_dossier_documents/migration.sql`
- `commit-dossier-documents.bat`
- `CHECKLIST_DOSSIER_DOCUMENTS.md`
- `AUDIT_DOSSIERS_DOCUMENTS.md` (ce fichier)

### Fichiers modifiés
- `apps/api/src/app.module.ts` — enregistre `DossierDocumentsModule`
- `apps/api/src/config/env.validation.ts` — valide les env Supabase
- `apps/api/src/types/prisma-client.d.ts` — ajoute `dossierDocument`
- `apps/api/package.json` — devDependencies TypeScript
- `apps/web/app/(app)/dossiers/[id]/page.tsx` — refonte complète (API + réhydratation + signer via API)
- `apps/web/app/(app)/dossiers/nouveau/page.tsx` — création via `useProjectActions`
- `apps/web/hooks/useDataSync.ts` — merge intelligent
- `apps/web/hooks/useProjectActions.ts` — helper `isLocalOnlyId` + champs étendus
- `apps/web/store/useDossierStore.ts` — `docId` dans `DocumentFile`, `tauxTVA`/`delaiChantier` dans `addDossier`
- `apps/web/lib/supabase.ts` — stub déprécié
- `apps/web/package.json` — retrait de `@supabase/supabase-js`
- `prisma/schema.prisma` — modèle `DossierDocument`
- `vercel.json` — build API + includeFiles
- `apps/web/next.config.js` — CSP Supabase
