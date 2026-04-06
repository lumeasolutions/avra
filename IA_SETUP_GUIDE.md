# Guide de configuration - Clés API IA

Ce guide explique comment obtenir et configurer les clés API pour Qwen et fal.ai.

## Table des matières

1. [Qwen (DashScope)](#qwen-dashscope)
2. [fal.ai](#falai)
3. [Configuration locale](#configuration-locale)
4. [Configuration production](#configuration-production)
5. [Vérification](#vérification)

---

## Qwen (DashScope)

Qwen est l'LLM utilisé pour le chat assistant. Il est fourni par Aliyun via DashScope.

### Pourquoi Qwen?

- ✅ API compatible OpenAI (pas de changement SDK)
- ✅ Excellent rapport qualité/prix
- ✅ Excellent pour le français
- ✅ Support du streaming native
- ✅ Context window de 32K tokens

### Étape 1: Créer un compte Aliyun

1. Aller à [https://dashscope.aliyuncs.com](https://dashscope.aliyuncs.com)
2. Cliquer sur "Sign Up" (ou "注册" en chinois)
3. Créer un compte avec email/phone
4. Compléter la vérification KYC (identité)

**Note**: La création de compte peut prendre 15-30 minutes pour la vérification.

### Étape 2: Activer Qwen

1. Une fois connecté au dashboard DashScope
2. Aller à "Model" → "Qwen"
3. Cliquer sur "Activate" (si pas déjà activé)
4. Sélectionner le plan:
   - **Free tier**: 500 requêtes/mois (suffisant pour tests)
   - **Pay-as-you-go**: Facturé au vrai usage

### Étape 3: Générer une clé API

1. Aller à "API Key" dans le menu lateral
2. Cliquer sur "Create New API Key"
3. Donner un nom: ex: "Avra-Production"
4. Copier la clé: format `sk-xxxxx...`
5. **Sauvegarder de manière sécurisée** (password manager, vault, etc.)

### Étape 4: Copier la clé

La clé aura ce format:
```
sk-f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4
```

### Pricing

- **qwen-turbo**: 0.0008 $/1K input tokens, 0.002 $/1K output tokens
- **qwen-plus**: 0.0004 $/1K input tokens, 0.0012 $/1K output tokens
- **qwen-base**: 0.0001 $/1K input tokens, 0.0003 $/1K output tokens

**Exemple**: 1000 chats de 100 tokens input + 200 tokens output = ~$2-3 avec qwen-plus

---

## fal.ai

fal.ai est utilisé pour la génération d'images avec les modèles FLUX.

### Pourquoi fal.ai?

- ✅ FLUX Pro: Meilleure qualité photoréaliste du marché
- ✅ FLUX Dev: Rapide et flexible (img2img)
- ✅ Simple à utiliser
- ✅ Pay-as-you-go (pas d'abonnement)
- ✅ Genération rapide (10-60s par image)

### Étape 1: Créer un compte fal.ai

1. Aller à [https://fal.ai](https://fal.ai)
2. Cliquer sur "Sign In" → "Create Account"
3. S'enregistrer avec email/GitHub/Google
4. Valider email

### Étape 2: Ajouter une méthode de paiement

1. Dashboard → "Account"
2. Aller à "Billing" ou "Payment Method"
3. Ajouter une carte de crédit valide
4. Confirmer les détails de paiement

**Important**: fal.ai est pay-as-you-go. Une carte valide est obligatoire.

### Étape 3: Générer une clé API

1. Dashboard → "Settings" → "API Keys"
2. Cliquer sur "Create API Key"
3. Donner un nom: ex: "Avra-Production"
4. Copier la clé
5. **Sauvegarder de manière sécurisée**

La clé aura ce format:
```
xxxxxxxxxxxxx_yyyyyyyyyyyyyyyyyyyyyyyy
```

### Étape 4: Tester la clé (optionnel)

```bash
curl -X POST https://fal.run/fal-ai/flux-pro/v1.1 \
  -H "Authorization: Key YOUR_FAL_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "A beautiful modern kitchen",
      "image_size": "landscape_16_9"
    }
  }'
```

### Pricing

- **FLUX Pro**: $0.048 par image
- **FLUX Dev**: $0.008 par image
- **img2img**: Coûte pareil que la génération (pas de surcharge)

**Exemple**:
- 100 rendus par jour → ~$1.44/jour avec FLUX Pro
- 100 colorisations par jour → ~$0.24/jour avec FLUX Dev
- **Total estimation**: ~$50/mois pour usage modéré

---

## Configuration locale

Pour développer localement avec les clés réelles.

### Étape 1: Créer un fichier `.env.local`

À la racine du projet (à côté de `.env.example`):

```bash
# ─── IA - Qwen ───────────────────────────────────────
QWEN_API_KEY=sk-xxxxx-votre-vraie-clé
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# ─── IA - fal.ai ─────────────────────────────────────
FAL_KEY=xxxxx-votre-vraie-clé

# (Autres variables .env...)
```

### Étape 2: Vérifier que `.env.local` est dans `.gitignore`

```bash
# .gitignore
.env
.env.local
.env.*.local
```

**IMPORTANT**: Ne JAMAIS commiter les vraies clés!

### Étape 3: Redémarrer le serveur

```bash
# Backend
cd apps/api
npm run dev

# Frontend (autre terminal)
cd apps/web
npm run dev
```

### Étape 4: Vérifier l'intégration

```bash
# Vérifier le statut
curl http://localhost:3001/api/ia/status

# Devrait retourner:
# {"qwenEnabled": true, "falEnabled": true}
```

---

## Configuration production

Pour déployer en production avec les vraies clés en sécurité.

### Méthode 1: AWS Secrets Manager (recommandé)

```bash
# Créer un secret
aws secretsmanager create-secret \
  --name avra/ia \
  --secret-string '{
    "QWEN_API_KEY": "sk-xxxxx...",
    "FAL_KEY": "xxxxx...",
    "QWEN_MODEL": "qwen-plus"
  }'

# Dans le déploiement, charger le secret
aws secretsmanager get-secret-value \
  --secret-id avra/ia \
  --query SecretString --output text > .env.production.local
```

### Méthode 2: Terraform (Infrastructure-as-Code)

```hcl
resource "aws_secretsmanager_secret" "ia_keys" {
  name = "avra/ia-keys"
}

resource "aws_secretsmanager_secret_version" "ia_keys" {
  secret_id = aws_secretsmanager_secret.ia_keys.id
  secret_string = jsonencode({
    QWEN_API_KEY = var.qwen_api_key
    FAL_KEY      = var.fal_api_key
    QWEN_MODEL   = "qwen-plus"
  })
}

# Dans le déploiement ECS/K8S:
# env_file = secrets/ia.env
```

### Méthode 3: Vercel Environment Variables

Si déployé sur Vercel:

1. Dashboard → Settings → Environment Variables
2. Ajouter pour "Production":
   - `QWEN_API_KEY=sk-xxxxx...`
   - `FAL_KEY=xxxxx...`
   - `QWEN_MODEL=qwen-plus`
3. Redéployer

### Méthode 4: Docker Secrets (Swarm/Kubernetes)

```bash
# Créer les secrets
echo "sk-xxxxx..." | docker secret create qwen_api_key -
echo "xxxxx..." | docker secret create fal_key -

# Dans docker-compose.yml
services:
  api:
    secrets:
      - qwen_api_key
      - fal_key
    environment:
      QWEN_API_KEY_FILE: /run/secrets/qwen_api_key
      FAL_KEY_FILE: /run/secrets/fal_key
```

### Bonnes pratiques

1. **Jamais** de clés en code source
2. **Jamais** de clés en commits Git (même en .env)
3. **Toujours** utiliser un système de secrets (AWS/Azure/Vault)
4. **Rotationner** les clés tous les 3 mois
5. **Audit logs** des accès aux secrets
6. **Limiter** l'accès par IP si possible
7. **Monitorer** l'usage pour détecter les abus

---

## Vérification

### Checklist locale

```bash
# 1. API est en train de tourner
curl http://localhost:3001/api/ia/status
# Expect: {"qwenEnabled": true, "falEnabled": true}

# 2. Chat fonctionne
curl -X POST http://localhost:3001/api/ia/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
# Expect: Streaming SSE response

# 3. Images fonctionnent
curl -X POST http://localhost:3001/api/ia/rendu \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "facades": "white",
    "planTravail": "wood",
    "style": "modern",
    "lightingStyle": "natural",
    "roomSize": "medium"
  }'
# Expect: {"imageUrl": "https://..."}

# 4. Logs ne montrent pas d'erreurs
tail -f logs/api.log | grep -i error
# Should be clean
```

### Checklist production

```bash
# 1. Variables d'environnement définies
echo $QWEN_API_KEY | head -c 10
echo $FAL_KEY | head -c 10
# Both should print something

# 2. API status
curl https://api.avra.com/api/ia/status
# Expect: {"qwenEnabled": true, "falEnabled": true}

# 3. Monitoring des quotas
# - Qwen: Check DashScope dashboard pour usage
# - fal.ai: Check fal.ai dashboard pour usage

# 4. Alertes de coûts configurées
# - Set up billing alerts pour AWS/fal.ai
# - Notification sur email si dépassement

# 5. Monitoring temps réel
# - Chat latency < 3s en p95
# - Image generation < 60s en p95
# - Error rate < 1%
```

---

## Dépannage

### Qwen: Clé invalide

**Symptôme**: Erreur "Unauthorized" ou "Invalid API Key"

**Solution**:
1. Vérifier que la clé commence par `sk-`
2. Vérifier qu'il n'y a pas d'espaces avant/après
3. Vérifier que le compte DashScope est actif
4. Vérifier que Qwen est activé dans le dashboard
5. Régénérer la clé si nécessaire

### Qwen: Quota dépassé

**Symptôme**: Erreur "Rate limit exceeded" ou "Quota exceeded"

**Solution**:
1. Vérifier les limites du plan actuel
2. Upgrades vers un plan payant si nécessaire
3. Implémenter rate limiting côté backend
4. Ajouter retry logic avec backoff

### fal.ai: Clé invalide

**Symptôme**: Erreur 403 ou "Invalid credentials"

**Solution**:
1. Vérifier que FAL_KEY est correct
2. Vérifier que le compte fal.ai est actif
3. Vérifier la méthode de paiement est valide
4. Vérifier les whitelist IP si configurées

### fal.ai: Timeout

**Symptôme**: Les images prennent > 2 minutes

**Solution**:
1. Vérifier que fal.ai n'est pas surchargé
2. Vérifier la taille d'image demandée
3. Essayer une taille plus petite
4. Implémenter retry avec backoff exponentiel

### API: Mode mock

**Symptôme**: Chat retourne du contenu générique, images retournent des placeholders

**Solution**:
1. Vérifier que QWEN_API_KEY est défini
2. Vérifier que FAL_KEY est défini
3. Vérifier `/api/ia/status`
4. Vérifier les logs de l'API pour erreurs de configuration

---

## Support

### Qwen/DashScope
- **Documentation**: [dashscope.aliyuncs.com/docs](https://dashscope.aliyuncs.com/docs)
- **Support**: DashScope dashboard → Support (disponible en anglais/chinois)
- **Community**: Aliyun forums

### fal.ai
- **Documentation**: [fal.ai/docs](https://fal.ai/docs)
- **Discord**: [fal.ai community](https://discord.gg/fal)
- **Email**: support@fal.ai
- **Status**: [status.fal.ai](https://status.fal.ai)

---

## Coûts estimés

Basé sur un usage modéré (10 utilisateurs actifs):

| Service | Usage | Coût/mois |
|---------|-------|-----------|
| Qwen (qwen-plus) | 1000 chats/mois | $2-5 |
| fal.ai FLUX Pro | 200 images/mois | $9.6 |
| fal.ai FLUX Dev | 200 colorizations/mois | $1.6 |
| **TOTAL** | | **~$13-16/mois** |

*Note: Ces estimations peuvent varier selon l'usage réel.*

---

**Dernière mise à jour**: 2026-04-05
