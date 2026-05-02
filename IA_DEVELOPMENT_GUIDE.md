# Guide de développement - Intégration IA

Ce guide explique comment utiliser, étendre et tester l'intégration IA du projet Avra.

## Architecture rapide

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
├─────────────────┤
│  AssistantPanel │────┐
│  IA Studio      │    │
│  useAIChat hook │    │ SSE / JSON
│  useAIImage hook├───────────┐
└─────────────────┘    │     │
                        │     ▼
                   ┌──────────────────┐
                   │   NestJS API     │
                   ├──────────────────┤
                   │  IaController    │
                   │  IaService       │
                   │  QwenService     │
                   │  FalService      │
                   └──────┬──────┬───┘
                          │      │
                    ┌─────▼──┐  │
                    │ Qwen   │  │
                    │ DashScope
                    └────────┘  │
                                ▼
                           ┌────────────┐
                           │  fal.ai    │
                           │  FLUX Pro  │
                           │  FLUX Dev  │
                           └────────────┘
```

## Structure des fichiers

### Backend

```
apps/api/src/modules/ia/
├── ia.controller.ts       # Endpoints HTTP
├── ia.service.ts          # Logique métier (jobs, uploads)
├── ia.module.ts           # Configuration NestJS
├── qwen.service.ts        # Service chat/LLM
├── fal.service.ts         # Service génération d'images
└── prompts.ts             # Templates de prompts centralisés
```

### Frontend

```
apps/web/
├── components/layout/AssistantPanel.tsx    # Chat UI
├── app/(app)/ia-studio/page.tsx             # Rendu 3D UI
└── hooks/
    ├── useAIChat.ts                         # Hook chat
    └── useAIImage.ts                        # Hook images
```

## Utilisation - Backend

### Services IA

#### QwenService

Chat avec streaming et contexte métier.

```typescript
import { QwenService } from './qwen.service';

export class MonService {
  constructor(private qwen: QwenService) {}

  async chat(messages: ChatMessage[]) {
    const response = await this.qwen.chat(messages, {
      dossierCount: 10,
      urgentCount: 2,
    });
    return response;
  }

  async chatWithStreaming(messages: ChatMessage[]) {
    const stream = await this.qwen.chatStream(messages);
    return stream; // Readable stream pour SSE
  }

  async analyzeDossier(dossierData) {
    return this.qwen.analyzeDossier(dossierData);
  }

  async suggestAlerts(data) {
    return this.qwen.suggestAlerts(data);
  }
}
```

#### FalService

Génération d'images avec FLUX.

```typescript
import { FalService } from './fal.service';

export class MonService {
  constructor(private fal: FalService) {}

  async generateKitchen(prompt: string) {
    const imageUrl = await this.fal.generateRealisticRender(prompt);
    return imageUrl; // URL ou null si erreur
  }

  async colorizeKitchen(sourceImageUrl: string, prompt: string) {
    const imageUrl = await this.fal.colorizeImage(sourceImageUrl, prompt);
    return imageUrl;
  }
}
```

### Endpoints

#### POST /api/ia/chat

Streaming SSE pour le chat.

```bash
curl -X POST http://localhost:3001/api/ia/chat \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Combien de dossiers?"}
    ]
  }'
```

Response: SSE avec chunks de texte

```
data: {"content": "Vous avez"}
data: {"content": " 12 dossiers"}
data: {"done": true}
```

#### POST /api/ia/analyze

Analyser un dossier avec l'IA.

```bash
curl -X POST http://localhost:3001/api/ia/analyze \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"dossierId": "123"}'
```

Response:
```json
{"analysis": "..."}
```

#### POST /api/ia/suggest-alerts

Générer des alertes intelligentes.

```bash
curl -X POST http://localhost:3001/api/ia/suggest-alerts \
  -H "Authorization: Bearer JWT_TOKEN"
```

Response:
```json
{
  "alerts": [
    {"severity": "error", "text": "2 factures en retard"},
    {"severity": "warning", "text": "Dossier ABC urgent depuis 5 jours"}
  ]
}
```

#### POST /api/ia/rendu

Générer un rendu 3D.

```bash
curl -X POST http://localhost:3001/api/ia/rendu \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "facades": "gris clair",
    "planTravail": "bois chêne",
    "style": "scandinave",
    "lightingStyle": "naturelle",
    "roomSize": "moyenne"
  }'
```

#### POST /api/ia/coloriste

Coloriser une cuisine.

```bash
curl -X POST http://localhost:3001/api/ia/coloriste \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "facadeHex": "#ffffff",
    "poigneeHex": "#000000",
    "planHex": "#d4a574",
    "facadeFinish": "mat",
    "lightingStyle": "naturelle"
  }'
```

#### GET /api/ia/status

Vérifier l'état des services IA.

```bash
curl http://localhost:3001/api/ia/status
```

Response:
```json
{"qwenEnabled": true, "falEnabled": false}
```

## Utilisation - Frontend

### Hook useAIChat

```typescript
import { useAIChat } from '@/hooks/useAIChat';

export function MyChatComponent() {
  const { messages, loading, error, sendMessage } = useAIChat({
    onStreamChunk: (chunk) => console.log('Chunk:', chunk),
    onComplete: () => console.log('Done!'),
    onError: (err) => console.error(err),
  });

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.content}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      {loading && <p>Typing...</p>}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  );
}
```

### Hook useAIImage

```typescript
import { useAIImage } from '@/hooks/useAIImage';

export function MyImageComponent() {
  const { imageUrl, loading, generateRender, colorize } = useAIImage({
    onError: (err) => console.error(err),
  });

  return (
    <div>
      {imageUrl && <img src={imageUrl} alt="Generated" />}
      {loading && <p>Generating...</p>}
      <button
        onClick={() =>
          generateRender({
            facades: 'gris clair',
            planTravail: 'bois',
            style: 'scandinave',
            lightingStyle: 'naturelle',
            roomSize: 'moyenne',
          })
        }
      >
        Generate
      </button>
    </div>
  );
}
```

## Personnalisation

### Modifier les prompts

Tous les prompts sont centralisés dans `prompts.ts`:

```typescript
// Modifier le prompt assistant
export const SYSTEM_PROMPTS = {
  ASSISTANT: (context) => {
    // Éditer ici
    return "...";
  },
};

// Ou créer un nouveau
export const CUSTOM_PROMPTS = {
  MY_CUSTOM: () => "Mon prompt personnalisé",
};
```

Puis utiliser dans QwenService:

```typescript
const content = CUSTOM_PROMPTS.MY_CUSTOM();
const response = await this.qwen.chat([{ role: 'user', content }]);
```

### Ajouter un nouveau modèle d'image

Dans `fal.service.ts`:

```typescript
async generateMyCustomImage(prompt: string) {
  return this.callFalAPI('fal-ai/my-custom-model', {
    prompt,
    // autres paramètres spécifiques au modèle
  });
}
```

### Ajouter un nouveau LLM

Créer `anthropic.service.ts` (ou autre):

```typescript
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private client = new Anthropic();

  async chat(messages: ChatMessage[]) {
    // Implémentation
  }
}
```

Enregistrer dans `ia.module.ts`:

```typescript
@Module({
  providers: [IaService, QwenService, FalService, AnthropicService],
})
export class IaModule {}
```

## Tests

### Test unitaire - QwenService

```typescript
describe('QwenService', () => {
  let service: QwenService;

  beforeEach(() => {
    service = new QwenService();
  });

  it('should return mock response when disabled', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const response = await service.chat(messages);
    expect(response).toContain('Mock');
  });
});
```

### Test intégration - Chat endpoint

```typescript
describe('IA Controller - Chat', () => {
  it('POST /api/ia/chat should stream response', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/ia/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
  });
});
```

### Test E2E - Frontend

```typescript
describe('AssistantPanel Chat', () => {
  it('should send message and display response', async () => {
    render(<AssistantPanel open={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText('Posez une question...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText(/réponse/i)).toBeInTheDocument();
    });
  });
});
```

## Dépannage

### Le chat retourne du texte vide

1. Vérifier que QWEN_API_KEY est défini
2. Vérifier les logs: `docker logs avra-api`
3. Tester l'endpoint: `curl http://localhost:3001/api/ia/status`
4. Si `qwenEnabled: false`, les clés API manquent

### Les images ne se génèrent pas

1. Vérifier FAL_KEY
2. Consulter les logs fal.ai dans les requêtes réseau (DevTools)
3. Vérifier que l'image est <= 4.6 MB (limite fal.ai)

### Timeout SSE

1. Les timeouts sont à 2 min pour fal.ai
2. Pour Qwen: augmenter max_tokens dans qwen.service.ts si besoin

### Mode mock trop restrictif

Éditer `qwen.service.ts` - `mockChat()` pour des réponses plus élaborées.

## Performance

### Optimisations déjà en place

1. **Contexte léger**: Chargement sélectif des données (select Prisma)
2. **Streaming**: SSE au lieu de polling
3. **Polling asynchrone**: fal.ai n'attend pas la réponse
4. **Prompt caching** (future): Redis cache pour prompts fréquents

### À améliorer

1. Ajouter Redis cache pour résultats récents
2. Implémenter webhooks fal.ai au lieu du polling
3. Rate limiting par workspace
4. Queue (BullMQ) pour les jobs IA lourds

## Sécurité

### Règles à respecter

1. **Jamais** d'API keys en variables d'environnement frontend
2. **Toujours** valider les inputs côté backend
3. **Isolation workspace**: les données d'un utilisateur ne doivent pas impacter un autre
4. **Rate limiting**: implémenter pour éviter les abus

### À faire

1. Ajouter validation des prompts (pas d'injection)
2. Implémenter audit trail pour les IA generations
3. Ajouter rate limiting par workspace/utilisateur
4. Chiffrer les prompts sensibles (données clients)

## References

- [OpenAI SDK JS](https://github.com/openai/openai-node)
- [Aliyun Qwen (DashScope)](https://dashscope.aliyuncs.com)
- [fal.ai](https://fal.ai)
- [NestJS Streaming](https://docs.nestjs.com/techniques/streaming-files)
- [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
