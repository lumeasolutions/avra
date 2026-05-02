# Module IA — `apps/api/src/modules/ia/`

Module unifié IA d'AVRA. Tout le textuel passe par OpenAI (provider primaire),
avec Anthropic en fallback transparent. Les images restent sur fal.ai.

## Vue d'ensemble

| Service | Rôle |
|---------|------|
| `ai.service.ts` | Service IA unifié (chat streaming/non-streaming, analyze, suggest-alerts) |
| `extraction.service.ts` | Extraction IA documents → dates butoires + commandes + livraisons |
| `fal.service.ts` | Génération d'images photoréalistes (rendu / coloriste) |
| `ia.service.ts` | Service business (upload IA, jobs Prisma, status agrégé) |
| `ia.controller.ts` | Routes `/api/v1/ia/*` |
| `openai-client.ts` | Singleton OpenAI SDK (lazy init) |
| `prompts.ts` | System prompts du chat (ASSISTANT, ANALYZE_DOSSIER, SUGGEST_ALERTS) |
| `extraction.prompt.ts` | System prompt + JSON schema strict pour l'extraction |
| `types.ts` | Types partagés (ChatMessage, ChatContext, AIStatus, etc.) |
| `extraction.types.ts` | Types ExtractionResult / ExtractionCommande / ExtractionLivraison |

## Provider auto-detection

Géré dans `AIService.resolveProvider()` au boot :

```
AI_PROVIDER=auto (default)
  ├─ OPENAI_API_KEY (sk-...)  → 'openai'  (recommandé)
  ├─ ANTHROPIC_API_KEY (sk-ant-...) → 'anthropic'  (fallback)
  └─ aucun                    → 'mock'  (dev/test)

AI_PROVIDER=openai|anthropic|mock → force la valeur
```

## Modèles

| Cas d'usage | Modèle OpenAI | Modèle Anthropic (fallback) |
|-------------|---------------|------------------------------|
| Chat assistant | `OPENAI_MODEL_PREMIUM` (gpt-4o) | `ANTHROPIC_MODEL` (claude-opus-4-6) |
| Analyze dossier | `OPENAI_MODEL_PREMIUM` (gpt-4o) | idem |
| Suggest alerts | `OPENAI_MODEL_CHEAP` (gpt-4o-mini, **16x moins cher**) | idem |
| Extract dossier | `OPENAI_MODEL_PREMIUM` + `response_format: json_schema` | non supporté → 503 |

## Endpoints `/api/v1/ia/*`

| Méthode | Route | Auth | Throttle | Description |
|---------|-------|------|----------|-------------|
| POST | `/chat` | optional | default | Chat streaming SSE (avec contexte workspace si JWT) |
| POST | `/analyze` | required | default | Analyse résumé d'un dossier |
| POST | `/suggest-alerts` | required | default | Génère des alertes intelligentes |
| POST | `/extract-dossier` | required | `ai` (5/min) | Extraction IA des documents PDF |
| POST | `/rendu` | required | default | Génération d'image fal.ai |
| POST | `/coloriste` | required | default | Img2img fal.ai |
| GET | `/status` | required | default | Provider actif + modèles |

## Sécurité

- `JwtAuthGuard` global sur le controller (sauf `/chat` qui est `@Public`)
- Throttler `ai` : 5 requêtes/min/IP pour `/extract-dossier` (charge inférieure)
- Vérification ownership workspace dans tous les services
- Pas de log de secrets (clés tronquées dans les logs)

## Monitoring

- `AIService.logUsage()` : breadcrumb Sentry par appel avec tokens + coût USD
- `ExtractionService` : breadcrumb spécifique avec confiance + nb dates/commandes/livraisons
- Logs Nest : `[op] model=... tokens=in/out ~$0.xxxxx`

## Coûts (ordre de grandeur, USD)

| Op | Tokens IN | Tokens OUT | Modèle | Coût/appel |
|----|-----------|------------|--------|------------|
| Chat (1 question) | ~1 200 | ~400 | gpt-4o | ~0,007 $ |
| Suggest alerts | ~800 | ~200 | gpt-4o-mini | ~0,0002 $ |
| Extract dossier (5 PDFs ~30k tokens) | ~30 000 | ~600 | gpt-4o | ~0,082 $ |

Avec prompt caching (préfixe stable ≥ 1024 tokens), -50% sur les inputs cachés.

## Exemple : tester le mode mock

```bash
# Sans clé → mode mock (réponses simulées sympas)
unset OPENAI_API_KEY ANTHROPIC_API_KEY
pnpm --filter @avra/api dev

# Forcer Anthropic même avec OpenAI configuré
AI_PROVIDER=anthropic pnpm --filter @avra/api dev
```

## Migration historique

- 2026-04 : refactor `qwen.service.ts` → `ai.service.ts` (nom corrigé,
  `qwen.service.ts` wrappait Claude malgré son nom)
- 2026-04 : suppression du worker DALL-E legacy (`apps/api/src/workers/ia.worker.ts`)
- 2026-04 : ajout extraction documents (`extraction.service.ts`)
- 2026-04 : OpenAI devient provider primaire ; Anthropic conservé en fallback
