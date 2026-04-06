# Intégration IA Complète - Résumé

Date: 2026-04-05
Statut: Terminée (prête pour production)

## Vue d'ensemble

Le projet Avra a reçu une intégration IA complète incluant:
- **Chat/Assistant**: Qwen AI via Aliyun DashScope (API compatible OpenAI)
- **Images**: fal.ai FLUX pour rendus réalistes et colorisation
- **Streaming**: Support SSE pour le chat temps réel
- **Mode fallback**: Fonctionnement dégradé si les API ne sont pas configurées

## Architecture

### Backend (NestJS)

#### Services IA
1. **QwenService** (`apps/api/src/modules/ia/qwen.service.ts`)
   - Chat avec streaming
   - Système de prompt contextualisé pour cuisinistes
   - Analyse de dossiers
   - Génération d'alertes intelligentes
   - Mode mock si pas de clé API

2. **FalService** (`apps/api/src/modules/ia/fal.service.ts`)
   - Génération d'images FLUX Pro (photoréalisme)
   - Colorisation img2img (FLUX Dev)
   - Polling asynchrone pour long-running tasks
   - Mode mock si pas de clé API

#### Endpoints API
- `POST /api/ia/chat` - Chat streaming SSE
- `POST /api/ia/analyze` - Analyser un dossier
- `POST /api/ia/suggest-alerts` - Générer des alertes intelligentes
- `POST /api/ia/rendu` - Générer un rendu photoréaliste
- `POST /api/ia/coloriste` - Coloriser une cuisine
- `GET /api/ia/status` - Vérifier l'état des services IA

### Frontend (Next.js)

#### Composants modifiés
1. **AssistantPanel.tsx** (`apps/web/components/layout/AssistantPanel.tsx`)
   - Chat intégré avec API `/api/ia/chat`
   - Support SSE pour streaming temps réel
   - Fallback au mode local si l'API échoue
   - Mode vocal toujours actif

2. **IA Studio** (`apps/web/app/(app)/ia-studio/page.tsx`)
   - Appelle déjà les endpoints `/api/ia/rendu` et `/api/ia/coloriste`
   - Aucun changement nécessaire (endpoints ajoutés au backend)

## Configuration

### Variables d'environnement (voir `.env.example`)

```bash
# Qwen (chat/assistant)
QWEN_API_KEY=sk-xxxxx-your-key
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# fal.ai (images)
FAL_KEY=xxxxx-your-key
```

**Important**: Ces variables sont **optionnelles**. Si non définies:
- Chat utilise le mode mock (pattern-matching local)
- Images utilisent des placeholders

## Flux utilisateur

### Chat Assistant
1. Utilisateur envoie un message via AssistantPanel
2. Frontend appelle `POST /api/ia/chat` avec l'historique
3. Backend utilise Qwen pour générer une réponse
4. Streaming SSE retourne les chunks au frontend
5. Frontend affiche la réponse en temps réel (effet de "typing")

### Rendu 3D Photoréaliste
1. Utilisateur remplit le formulaire IA Studio
2. Frontend appelle `POST /api/ia/rendu` avec les paramètres
3. Backend génère un prompt contextuel et appelle fal.ai FLUX Pro
4. Image retournée et affichée dans le studio
5. Si fal.ai pas configuré: image placeholder avec démo visuelle

### Coloriste
1. Utilisateur ajuste les couleurs dans IA Studio
2. Frontend appelle `POST /api/ia/coloriste` avec hex colors
3. Backend appelle fal.ai FLUX Dev pour img2img
4. Image colorisée retournée
5. Mode mock: image générée avec paramètres (développement)

## Modèles IA

### Qwen
- **Model**: `qwen-plus` (bon rapport qualité/prix)
- **Contexte**: Spécialisé pour cuisinistes (gestion dossiers, factures, planning)
- **Température**: 0.7 (créatif mais cohérent)
- **Max tokens**: 1024 par réponse

### fal.ai FLUX
- **Rendu**: `fal-ai/flux-pro/v1.1` (photoréalisme haute qualité)
- **Coloriste**: `fal-ai/flux/dev` (img2img rapide et flexible)
- **Polling**: Tous les 2 secondes, timeout 2 minutes

## Mode fallback & robustesse

### Quand les API ne sont pas configurées

1. **Chat**: Utilise un pattern-matching simple avec réponses prédéfinies
   - Basé sur mots-clés (urgent, facture, dossier, etc.)
   - Intégré dans `QwenService.mockChat()`

2. **Images**: Placeholders via `https://via.placeholder.com`
   - Contient le prompt encodé dans l'URL
   - Permet le développement sans clé API

3. **État visible**: Endpoint `GET /api/ia/status` indique l'état réel
   ```json
   { "qwenEnabled": false, "falEnabled": false }
   ```

## Optimisations

1. **Streaming**: Chat utilise SSE plutôt que polling
2. **Contexte léger**: Données dossiers/factures chargées uniquement si nécessaire
3. **Polling asynchrone**: fal.ai ne bloque pas l'API
4. **Cancellation**: AbortController prêt pour annuler les streams
5. **Erreur handling**: Fallback gracieux si une API échoue

## Sécurité

- Tous les endpoints protégés par JWT (`@UseGuards(JwtAuthGuard)`)
- Isolation workspace: les données appartiennent au workspace de l'utilisateur
- API keys stockées en variables d'environnement (jamais en code)
- Validation des prompts pour éviter les injections

## Tests manuels

### Chat Assistant
```bash
curl -X POST http://localhost:3001/api/ia/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Combien de dossiers urgents?"}]}'
```

### Rendu 3D
```bash
curl -X POST http://localhost:3001/api/ia/rendu \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "facades": "gris clair",
    "planTravail": "bois chêne",
    "style": "scandinave",
    "lightingStyle": "naturelle",
    "roomSize": "moyenne"
  }'
```

### Status
```bash
curl http://localhost:3001/api/ia/status
```

## Next Steps (optionnel)

1. **Fine-tuning Qwen**: Adapter le système prompt avec vos domaines métier spécifiques
2. **Caching images**: Implémenter Redis cache pour les rendus fréquents
3. **Webhooks fal.ai**: Remplacer le polling par webhooks pour les images
4. **Analytics**: Logger les utilisations IA pour analyser l'usage
5. **Rate limiting**: Ajouter des limites par workspace/utilisateur
6. **Batch processing**: File d'attente pour les rendus lourds

## Fichiers modifiés

### Backend
- ✅ `apps/api/src/modules/ia/ia.service.ts` - Ajout méthodes rendu/coloriste
- ✅ `apps/api/src/modules/ia/ia.controller.ts` - Nouveaux endpoints
- ✅ `apps/api/src/modules/ia/ia.module.ts` - Imports services
- ✅ `apps/api/src/modules/ia/qwen.service.ts` - **NOUVEAU**
- ✅ `apps/api/src/modules/ia/fal.service.ts` - **NOUVEAU**

### Frontend
- ✅ `apps/web/components/layout/AssistantPanel.tsx` - Intégration API chat

### Configuration
- ✅ `.env.example` - Variables Qwen + fal.ai

## Compatibilité

- ✅ Backward compatible (existant continue de marcher)
- ✅ Pas de breaking changes
- ✅ Mode dégradé automatique si API manquante
- ✅ Package `openai@^6.32.0` déjà présent (utilisé par Qwen)
- ✅ Compatible avec infrastructure existante (Prisma, NestJS, Next.js)

## Support

Pour des questions sur l'intégration:
1. Vérifier les logs: `docker logs avra-api`
2. Tester l'endpoint `/api/ia/status` pour diagnostiquer
3. Vérifier les clés API dans `.env` (production) ou `.env.local` (dev)
