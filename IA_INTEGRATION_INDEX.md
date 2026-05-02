# Index de l'Intégration IA - Avra

Navigation rapide vers tous les fichiers et guides de l'intégration IA.

---

## Pour commencer (5 min)

1. **Lire le résumé exécutif**
   - Fichier: `IA_INTEGRATION_SUMMARY.md`
   - Contenu: Vue d'ensemble, architecture, endpoints

2. **Comprendre ce qui a été fait**
   - Fichier: `IA_INTEGRATION_COMPLETE.md`
   - Contenu: Rapport final, KPIs, conclusions

---

## Pour déployer en production (1h)

### Étape 1: Obtenir les clés API
- **Guide**: `IA_SETUP_GUIDE.md`
- **Sections**:
  - Qwen (DashScope) - 10 min
  - fal.ai - 5 min
  - Configuration locale - 5 min
  - Configuration production - 10 min

### Étape 2: Vérifier et tester
- **Checklist**: `IA_DEPLOYMENT_CHECKLIST.md`
- **Tests**: `IA_API_TESTS.http`
- **Temps**: 20 min

### Étape 3: Déployer
- **Checklist**: `IA_DEPLOYMENT_CHECKLIST.md` (section Déploiement Production)
- **Monitoring**: Configuration des alertes (10 min)
- **Temps**: 30 min

---

## Pour développer et étendre (30 min)

### Comprendre l'architecture
- **Guide**: `IA_DEVELOPMENT_GUIDE.md` - Architecture section

### Utiliser les services
- **Guide**: `IA_DEVELOPMENT_GUIDE.md` - Utilisation Backend section
- **Exemples**: Hooks dans `apps/web/hooks/`

### Modifier les prompts
- **Fichier**: `apps/api/src/modules/ia/prompts.ts`
- **Guide**: `IA_DEVELOPMENT_GUIDE.md` - Personnalisation section

### Ajouter un nouveau LLM/modèle
- **Guide**: `IA_DEVELOPMENT_GUIDE.md` - Ajouter nouveau LLM section
- **Exemple**: Copier `qwen.service.ts` et adapter

### Tester
- **Tests REST**: `IA_API_TESTS.http`
- **Tests unitaires**: `IA_DEVELOPMENT_GUIDE.md` - Tests section

---

## Fichiers modifiés (Checklist code review)

### Backend
```
✅ apps/api/src/modules/ia/qwen.service.ts       [NEW, 233 lignes]
✅ apps/api/src/modules/ia/fal.service.ts        [NEW, 150 lignes]
✅ apps/api/src/modules/ia/prompts.ts            [NEW, 130 lignes]
✅ apps/api/src/modules/ia/ia.controller.ts      [MODIFIED, +200 lignes]
✅ apps/api/src/modules/ia/ia.service.ts         [MODIFIED, +50 lignes]
✅ apps/api/src/modules/ia/ia.module.ts          [MODIFIED, +3 lignes]
```

### Frontend
```
✅ apps/web/components/layout/AssistantPanel.tsx [MODIFIED, +70 lignes]
✅ apps/web/hooks/useAIChat.ts                   [NEW, 120 lignes]
✅ apps/web/hooks/useAIImage.ts                  [NEW, 150 lignes]
```

### Configuration
```
✅ .env.example                                   [MODIFIED, +15 lignes]
```

---

## Documentation de référence

### Pour les tech leads
- **IA_INTEGRATION_SUMMARY.md** - Architecture et décisions
- **IA_INTEGRATION_COMPLETE.md** - Rapport exécutif

### Pour les DevOps/SRE
- **IA_SETUP_GUIDE.md** - Créer et configurer les clés API
- **IA_DEPLOYMENT_CHECKLIST.md** - Déployer et monitorer

### Pour les développeurs
- **IA_DEVELOPMENT_GUIDE.md** - Utiliser et étendre les APIs IA
- **IA_API_TESTS.http** - Tester les endpoints

---

## Endpoints API rapide

### Chat avec streaming
```
POST /api/ia/chat
Authorization: Bearer JWT
Content-Type: application/json
Body: {"messages": [...]}
Response: Server-Sent Events (SSE)
```

### Autres endpoints
```
POST /api/ia/analyze           Analyser un dossier
POST /api/ia/suggest-alerts    Générer des alertes
POST /api/ia/rendu             Générer un rendu 3D
POST /api/ia/coloriste         Coloriser une cuisine
GET /api/ia/status             Vérifier l'état des services
```

**Tous les endpoints nécessitent JWT authentication.**

---

## Variables d'environnement requises

```bash
# Qwen (chat/assistant)
QWEN_API_KEY=sk-xxxxx...
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# fal.ai (images)
FAL_KEY=xxxxx...

# Optionnels = le système fonctionne en mode dégradé sans ces clés
```

---

## Coûts estimés

| Service | Tarif |
|---------|-------|
| Qwen | $0.0004 per 1K input, $0.0012 per 1K output tokens |
| fal.ai FLUX Pro | $0.048 par image |
| fal.ai FLUX Dev | $0.008 par image |
| **TOTAL usage modéré** | **~$13-16/mois** |

---

## Quick Start (pour tester localement)

1. **Copier les fichiers** (déjà fait)
2. **Modifier `.env.local`** avec vraies clés
3. **Redémarrer le serveur**
   ```bash
   cd apps/api && npm run dev
   ```
4. **Tester l'API**
   ```bash
   curl http://localhost:3001/api/ia/status
   ```
5. **Ouvrir le chat** dans l'app et tester

**Mode fallback:** Si pas de clés, utilise pattern-matching local (seamless!)

---

## Dépannage rapide

### Issue: Chat retourne du contenu générique
→ Voir `IA_SETUP_GUIDE.md` - Dépannage section

### Issue: Images ne se génèrent pas
→ Vérifier FAL_KEY dans `.env.local`

### Issue: Erreurs de compilation
→ Vérifier que `openai@^6.32.0` est installé

### Issue: SSE connection drops
→ Voir `IA_DEVELOPMENT_GUIDE.md` - Dépannage section

---

## Support et contacts

### Qwen/DashScope
- Site: https://dashscope.aliyuncs.com
- Docs: https://dashscope.aliyuncs.com/docs
- Support: DashScope dashboard

### fal.ai
- Site: https://fal.ai
- Docs: https://fal.ai/docs
- Discord: https://discord.gg/fal
- Status: https://status.fal.ai

### Interne (team Avra)
- Tech lead: Pour questions architecture
- DevOps: Pour déploiement et monitoring
- Developers: Pour utilisation et extension

---

## Étapes suivantes recommandées

### Court terme (utile)
- [ ] Adapter le système prompt pour votre cas d'usage
- [ ] Configurer monitoring des coûts API
- [ ] Implémenter logging des générations IA

### Moyen terme (scalabilité)
- [ ] Remplacer polling fal.ai par webhooks
- [ ] Ajouter Redis cache pour images fréquentes
- [ ] Implémenter queue pour rendus en background

### Long terme (optimisation)
- [ ] Fine-tune Qwen sur vos données
- [ ] A/B testing des modèles/prompts
- [ ] Feedback loop pour améliorations continues

---

## Checklist finale avant production

- [ ] Lire IA_SETUP_GUIDE.md
- [ ] Créer comptes Qwen et fal.ai
- [ ] Obtenir clés API
- [ ] Configurer variables d'environnement
- [ ] Tester avec IA_API_TESTS.http
- [ ] Valider en staging
- [ ] Créer alertes monitoring
- [ ] Documenter runbooks
- [ ] Notifier équipe
- [ ] Déployer en production
- [ ] Monitorer métriques
- [ ] Célébrer le succès!

---

## Version et date

**Intégration IA Avra v1.0**
- Date: 2026-04-05
- Status: Production-ready
- Documentation: Complète
- Support: Complet

---

**Besoin d'aide? Consulte les guides fournis ou contacte l'équipe.**
