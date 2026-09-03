# Chantier — Persistance serveur de l'équipe & des vendeurs

> Cadrage + suivi. Rédigé le 2026-09-02.
>
> **Avancement :** Phase 0 (inventaire) ✅ · Phase 1 (hydratation liste vendeurs
> depuis `/team/overview`) ✅ déployée · Phase 2 (écriture `vendeurUserId` à
> l'attribution + à la création) ✅ déployée · Phase 3 (appartenance par
> `vendeurUserId` + fallback nom dans `useDossierPermissions`) ✅ déployée ·
> Phase 4 (rétro-remplissage) ✅ faite le 2026-09-02 · Phase 5 (vocabulaire unifié
> sur « Vendeur » pour le rôle non-admin) ✅ déployée · Visibilité/sécurité
> serveur (cloisonnement `findAll`/`findOne` par `vendeurUserId` pour les
> non-admins + cache user-scopé) ✅ déployée.
>
> Rétro-remplissage (2026-09-02) : 4 dossiers « Esteve Boucheret » rattachés au
> propriétaire (`vendeurUserId` = `cmnn0qvvj0002tfaaycimmm8g`) — match unique. Les
> 2 dossiers « dfgh » (aucun membre correspondant) laissés `vendeurUserId = null`
> (orphelins, éditables admin seulement). Réversible (remettre `null`).
>
> Visibilité/sécurité (2026-09-02) : `findAll`/`findOne` filtrent les non-admins
> sur `vendeurUserId = user.sub` (dossiers orphelins → admin only, pas de fallback
> nom serveur). Cache rendu user-scopé (`UserScopedCacheInterceptor`) pour éviter
> qu'un vendeur reçoive la liste non filtrée mise en cache par l'OWNER. Zéro impact
> tant qu'il n'y a qu'un OWNER (admins non filtrés) ; à valider avec un vrai compte
> vendeur (créé par l'utilisateur — Cowork ne peut pas s'authentifier).
> Objectif : faire de l'équipe et de l'attribution vendeur une donnée
> **serveur autoritaire**, au lieu du mélange actuel « moitié navigateur,
> moitié base qui ne se parlent pas ».

## 1. Constat (état au 2026-09-02)

| Sujet | État actuel | Problème |
|-------|-------------|----------|
| Liste des vendeurs | `useConfigStore.members` — **localStorage uniquement** (`INITIAL_MEMBERS = []`, commentaire ligne 272 : « l'équipe a son propre backend, câblé séparément ») | Varie d'un poste à l'autre ; un collègue ne voit pas les vendeurs créés ailleurs |
| Vrais membres | `UserWorkspace` + `WorkspaceInvitation` en base, alimentés par les invitations `/rejoindre-equipe` | **Existe mais l'UI ne s'en sert pas** — elle lit la liste locale |
| Attribution dossier | `Project.vendeurName` (texte libre) | Orphelins (« Esteve Boucheret » sans compte), collisions de noms, cassé par un renommage |
| Lien fort dossier→vendeur | `Project.vendeurUserId` **existe déjà** (relation `ProjectVendeur`, schema ligne 361) | **Jamais renseigné** (`null` partout) |
| Vocabulaire | Formulaire d'invitation : `value="VENDEUR"` libellé « Membre » ; backend enregistre `MEMBER` | Double terminologie pour le même rôle |

**Bonne nouvelle :** la colonne `vendeurUserId` et le backend équipe (`UserWorkspace`,
module `team`) existent déjà. Le chantier est donc surtout du **branchement +
rétro-remplissage**, pas une refonte de schéma destructive.

## 2. Cible

1. **Source de vérité = serveur.** La liste des vendeurs de l'UI est hydratée
   depuis l'API (`GET /team/...`), comme les dossiers. `useConfigStore.members`
   devient un cache, plus une donnée maîtresse.
2. **Attribution par identifiant.** On renseigne `Project.vendeurUserId` (FK)
   à l'attribution ; `vendeurName` n'est plus qu'un libellé d'affichage
   (snapshot). L'appartenance (`useDossierPermissions`) se base sur l'`userId`,
   pas sur la comparaison de noms.
3. **Rétro-remplissage** des dossiers existants (name → userId quand non ambigu).
4. **Vocabulaire unifié** (choisir « Membre » OU « Vendeur » partout).

## 3. Découpage en phases (chaque phase déployable seule)

### Phase 0 — Filet de sécurité (préalable)
- Vérifier ce que le module `team` expose déjà côté GET (membres actifs +
  invitations). Repérer : `apps/web/lib/team-api.ts`, `apps/api/src/modules/team/*`.
- Confirmer la forme réelle de `Project` (`vendeurUserId`, relation) dans
  `prisma/schema.prisma` (~ligne 496-522) et que l'endpoint projets accepte /
  renvoie `vendeurUserId`.
- **Aucune écriture.** Juste l'inventaire pour caler les phases suivantes.

### Phase 1 — Hydrater la liste des vendeurs depuis le serveur (lecture seule)
- Ajouter (si absent) `GET /team/members` renvoyant les `UserWorkspace` actifs
  (id user, nom, email, rôle) + option d'inclure les invitations en attente.
- Dans `useDataSync`, hydrater `useConfigStore.members` depuis cet endpoint
  (comme `syncProjects`), en **gardant** l'ajout local en fallback hors-ligne.
- Effet immédiat : la liste des vendeurs devient identique sur tous les postes.
- Fichiers : `apps/web/hooks/useDataSync.ts`, `apps/web/store/useConfigStore.ts`,
  `apps/web/lib/team-api.ts`, module `team` API.
- Risque : faible (additif). Réversible.

### Phase 2 — Écrire `vendeurUserId` à l'attribution
- Backend : l'endpoint de mise à jour projet accepte `vendeurUserId` (nullable),
  et le renvoie dans le GET.
- Frontend : `VendeurAssignDropdown` porte désormais l'`userId` du membre
  choisi (option « self » = l'user connecté). À l'attribution, on persiste
  `vendeurUserId` **et** `vendeurName` (snapshot d'affichage).
- Fichiers : `apps/web/components/vendeur/VendeurAssignDropdown.tsx`,
  `apps/web/hooks/useProjectActions.ts`, store dossiers, `projects` API.
- Risque : moyen (touche l'attribution). `vendeurName` conservé → aucun
  affichage ne casse pendant la transition.

### Phase 3 — Appartenance par `userId`
- `useDossierPermissions.isOwnDossier` : comparer `dossier.vendeurUserId ===
  user.id` en priorité, retomber sur la comparaison de noms uniquement pour les
  dossiers pas encore rétro-remplis.
- `apps/web/lib/vendeur-name.ts` reste pour l'affichage/legacy.
- Risque : moyen (permissions). Le fallback nom garantit la continuité.

### Phase 4 — Rétro-remplissage
- Script (ou migration de données) : pour chaque `Project` où `vendeurUserId`
  est null, tenter de matcher `vendeurName` → un `UserWorkspace` du même
  workspace (match nom **non ambigu**). Renseigner `vendeurUserId`.
- Lister les cas ambigus / sans correspondance (rapport), à trancher à la main.
- Risque : faible si on ne touche que les null et qu'on log tout. Idempotent.

### Phase 5 — Nettoyage vocabulaire + données de test
- Choisir un mot unique (« Membre » ou « Vendeur ») et l'appliquer : formulaire
  d'invitation, badges, `ROLE_LABEL`, page `/rejoindre-equipe`.
- Purger les 4 faux vendeurs (tous sur l'email du propriétaire) — cf. tâche « A ».

## 4. Migration Prisma

- `Project.vendeurUserId` : **déjà présent**. A priori **aucune migration de
  schéma** nécessaire pour le cœur. À confirmer en Phase 0.
- Si on ajoute une table « vendeurs sans compte » (poseurs, sous-traitants non
  invités) : migration additive nullable, sans impact sur l'existant. **Hors
  périmètre du premier passage** — à décider plus tard.

## 5. Risques & garde-fous

- **Permissions** : tout changement sur `useDossierPermissions` peut retirer des
  droits par erreur. Le double critère (userId **puis** nom) évite toute perte
  pendant la transition. Rappel : pour l'OWNER/ADMIN, `isAdmin` court-circuite
  déjà l'appartenance → aucun risque pour le patron.
- **Données locales** : `members` en localStorage doit être hydraté, pas écrasé
  brutalement, pour ne pas perdre un membre créé hors-ligne. Réconciliation
  local ⇄ serveur, comme pour les dossiers.
- **Déploiement incrémental** : chaque phase est livrable et réversible seule.
  On valide par Cowork entre chaque (recoupement base ⇄ UI).
- **Rollback** : Phases 1-3 = revert de commit. Phase 4 = les `vendeurUserId`
  posés peuvent être remis à null par requête si besoin.

## 6. Effort estimé

- Phase 0 : ~30 min (inventaire).
- Phase 1 : 1 session.
- Phase 2 : 1 session.
- Phase 3 : 0,5 session.
- Phase 4 : 0,5 session + revue du rapport d'ambiguïtés.
- Phase 5 : 0,5 session.

Total : **~3-4 sessions**, testées une à une. À ne pas faire à chaud : c'est du
code de permissions sur une base bêta avec de vrais comptes.

## 7. Lien avec les autres chantiers

Même fond que les **dossiers fantômes** du localStorage (données locales sans
source de vérité serveur). Les correctifs de la semaine (self-heal du rôle,
option « Vous », résolution nom robuste, page `/rejoindre-equipe`) rendent la
donnée équipe/vendeur **utilisable** en l'état ; ce chantier la rend **fiable**.
