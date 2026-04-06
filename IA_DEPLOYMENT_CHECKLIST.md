# Checklist de déploiement - Intégration IA

Utilisez cette checklist avant de déployer l'intégration IA en production.

## Pré-déploiement

### Code & Build
- [ ] Tous les fichiers compilent sans erreur
  ```bash
  cd apps/api && npm run build
  cd apps/web && npm run build
  ```
- [ ] Tests unitaires passent
  ```bash
  npm run test
  ```
- [ ] Linting OK
  ```bash
  npm run lint
  ```
- [ ] Aucune console.log() de debug restante
- [ ] Dépendances à jour
  ```bash
  npm audit
  ```

### Configuration
- [ ] `.env.example` est à jour avec les nouvelles variables
- [ ] Aucun `.env` réel committé sur Git
- [ ] Variables d'environnement documentées dans `.env.example`
- [ ] Secret Qwen et FAL sont sécurisés dans le système de secrets (AWS Secrets Manager, Vault, etc.)

### Base de données
- [ ] Migrations Prisma appliquées (si nouvelles tables)
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Schema Prisma à jour
- [ ] Backups en place avant migration

### Documentation
- [ ] `IA_INTEGRATION_SUMMARY.md` lu par le team lead
- [ ] `IA_DEVELOPMENT_GUIDE.md` accessible aux devs
- [ ] README API mis à jour avec les nouveaux endpoints
- [ ] Endpoints IA documentés dans la documentation API (Swagger si utilisé)

## Déploiement Staging

### Configuration Staging
- [ ] Compte Qwen (DashScope) créé avec clé API de test
- [ ] Compte fal.ai créé avec clé API de test
- [ ] Variables d'environnement déployées sans les vraies clés (utiliser des fausses pour tests)
- [ ] CORS configuré pour staging

### Tests Staging
```bash
# Test endpoint status
curl https://staging-api.avra.com/api/ia/status

# Test chat endpoint (SSE)
curl -X POST https://staging-api.avra.com/api/ia/chat \
  -H "Authorization: Bearer STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'

# Test rendu endpoint
curl -X POST https://staging-api.avra.com/api/ia/rendu \
  -H "Authorization: Bearer STAGING_TOKEN" \
  -d '{
    "facades": "blanc",
    "planTravail": "noir",
    "style": "contemporain",
    "lightingStyle": "spots",
    "roomSize": "grande"
  }'
```

- [ ] Chat fonctionne en mode fallback (mock mode si clés invalides)
- [ ] Images retournent des placeholders (mode mock)
- [ ] Assistant panel charge sans erreur
- [ ] IA Studio page charge sans erreur
- [ ] Pas d'erreur en console browser (DevTools)
- [ ] Pas d'erreur en logs API

### Performance Staging
- [ ] Temps de réponse chat < 3s (avec Qwen réel)
- [ ] Temps de réponse image < 10s (avec fal.ai réel)
- [ ] Pas de fuites mémoire avec streaming (monitor 30 minutes)
- [ ] Pas de timeout sous charge normale (10 requêtes concurrentes)

### Sécurité Staging
- [ ] JWT validation fonctionne
- [ ] Isolation workspace fonctionne (user A ne voit pas data user B)
- [ ] Pas d'exposition de clés API en logs ou erreurs
- [ ] CORS headers corrects (pas de `*` en production)

## Déploiement Production

### Avant le déploiement
- [ ] Staging tests tous passés
- [ ] Release notes préparées pour l'équipe
- [ ] Rollback plan documenté
- [ ] On-call engineer notifié et disponible

### Déploiement API
- [ ] Variables d'environnement production définies
  - `QWEN_API_KEY` (vraie clé)
  - `FAL_KEY` (vraie clé)
  - `QWEN_MODEL=qwen-plus`
  - `QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- [ ] Déployer avec `--no-rollback-on-error` en cas de problème
- [ ] Monitor les logs pendant 5 minutes post-déploiement
- [ ] Vérifier `/api/ia/status` retourne `{"qwenEnabled": true, "falEnabled": true}`

### Déploiement Frontend
- [ ] Nouveau build déployé
- [ ] Cache busted (new version hash)
- [ ] AssistantPanel charge correctement
- [ ] Chat SSE fonctionne
- [ ] IA Studio images se génèrent

### Tests Production
```bash
# Test real API
curl https://api.avra.com/api/ia/status

# Test avec vraies clés
curl -X POST https://api.avra.com/api/ia/chat \
  -H "Authorization: Bearer PROD_TOKEN" \
  -d '{"messages": [{"role": "user", "content": "Bonjour"}]}'
```

- [ ] Chat répond avec du vrai contenu Qwen (pas du mock)
- [ ] Images se génèrent avec FLUX (pas des placeholders)
- [ ] Performance acceptable (< 3s chat, < 15s images)
- [ ] Pas d'erreur dans Sentry/logs
- [ ] Usage Qwen API vérifié (check DashScope dashboard)
- [ ] Usage fal.ai API vérifié (check fal.ai dashboard)

### Post-déploiement
- [ ] Équipe notifiée que IA est live
- [ ] Documentation mise à jour (wiki/notion)
- [ ] Monitoring dashboards créés
  - Nombre d'appels IA par jour
  - Temps moyen réponse chat
  - Temps moyen génération image
  - Erreurs rate
- [ ] Alerts configurées
  - Chat timeout > 5%
  - Image generation timeout > 5%
  - API error rate > 1%

## Monitoring Production

### Métriques à tracker
- [ ] `/api/ia/chat` - Latency p50/p95/p99
- [ ] `/api/ia/rendu` - Latency p50/p95/p99
- [ ] `/api/ia/coloriste` - Latency p50/p95/p99
- [ ] Qwen API - Usage $ par jour
- [ ] fal.ai API - Usage $ par jour
- [ ] Error rate par endpoint
- [ ] SSE connection count (concurrent chats)

### Alertes essentielles
```
Alert: Chat endpoint error rate > 5% for 5 minutes
Alert: Chat endpoint timeout (>10s) more than 3 times in 10 minutes
Alert: Image generation timeout more than 2 times in 10 minutes
Alert: Qwen API error (invalid key, quota exceeded, etc.)
Alert: fal.ai API error
Alert: Memory usage API > 80% (streaming leak)
```

## Rollback Plan

Si l'intégration cause des problèmes:

### Option 1: Désactiver les clés API
```bash
# Redéployer sans QWEN_API_KEY et FAL_KEY
# L'app va passer en mode mock automatiquement
# Chat = pattern-matching local
# Images = placeholders
# Zéro impact utilisateur
```

### Option 2: Rollback complet
```bash
# Si d'autres problèmes
git revert <commit-hash>
npm run build
# Redéployer version précédente
```

### Option 3: Hotfix
```bash
# Si bug rapidement détectable
git cherry-pick <hotfix-commit>
npm run build
# Redéployer version fixée
```

## Vérification finale

- [ ] Aucun appel non-autorisé aux API IA (monitoring)
- [ ] Aucune exposition de prompts sensibles
- [ ] Aucune exposition de données clients
- [ ] Performance acceptable pour l'usage estimé
- [ ] Coûts API en ligne avec les estimations
- [ ] Documentation maintenance accessible
- [ ] Escalade procédure documentée
- [ ] Team formée sur les nouveaux endpoints

## Contacts & Support

- **Qwen API**: [DashScope Dashboard](https://dashscope.aliyuncs.com)
  - Support: DashScope docs / Aliyun forums
- **fal.ai API**: [fal.ai Dashboard](https://fal.ai)
  - Support: fal.ai docs / Discord community

---

**Date de déploiement**: ___________
**Engineer responsable**: ___________
**Approuvé par**: ___________
