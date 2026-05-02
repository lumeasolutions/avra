# AVRA - Claude API & FAL Integration Setup

## Status: ✅ Complete Configuration

### What Has Been Done

#### 1. **Claude API Key Created**
- **Platform**: Anthropic Console (console.anthropic.com)
- **Key Name**: AVRA-Assistant-Claude
- **API Key**: `sk-ant-api103-Ch00BrQ8dU_ID-H2mwfexUdIzo3bq8g_wwyz5bI8LT3-GtxVQHwhbNGXeNSrmSGVz1D_sIg2U9i2yAnaaDnPhg-5x50AgAA`
- **Model**: `claude-opus-4-6` (can be changed to `claude-sonnet-4-6` or `claude-haiku-4-5`)
- **Account**: lumeasolutions@outlook.fr

#### 2. **.env Configuration Updated**
```env
# IA - Claude (Assistant / Chat) - Primary for AVRA
ANTHROPIC_API_KEY=sk-ant-api103-Ch00BrQ8dU_ID-H2mwfexUdIzo3bq8g_wwyz5bI8LT3-GtxVQHwhbNGXeNSrmSGVz1D_sIg2U9i2yAnaaDnPhg-5x50AgAA
ANTHROPIC_MODEL=claude-opus-4-6

# IA - Qwen (Assistant / Chat) - Fallback/disabled due to France access restrictions
QWEN_API_KEY=
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# FAL.AI Image Generation (Already Configured)
FAL_KEY=5bc5e9d9-a38c-4dac-b151-8fffac51fc9d:d481622f5209ddf70610c08ac84121b0
```

#### 3. **QwenService Refactored for Multi-Provider Support**
**File**: `apps/api/src/modules/ia/qwen.service.ts`

**Key Changes**:
- Added `AIProvider` type: `'claude' | 'qwen' | 'mock'`
- Renamed `qwen` property to `client` for provider-agnostic usage
- Added provider detection logic in constructor:
  1. **Priority 1**: `ANTHROPIC_API_KEY` → Uses Claude API with `claude-opus-4-6`
  2. **Priority 2**: `QWEN_API_KEY` → Uses Qwen (fallback)
  3. **Priority 3**: None → Mock mode with simulated responses

**Configuration Logic**:
```typescript
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const qwenKey = process.env.QWEN_API_KEY;

if (anthropicKey) {
  // Use Claude API
  this.client = new OpenAI({
    apiKey: anthropicKey,
    baseURL: 'https://api.anthropic.com/v1'
  });
}
```

#### 4. **Supported Features**
- ✅ **Chat Streaming**: Real-time SSE chat responses using Claude API
- ✅ **Non-Streaming Chat**: Simple completions for internal analysis
- ✅ **Dossier Analysis**: AI-powered document summarization
- ✅ **Alert Suggestions**: Intelligent alert generation based on workspace state
- ✅ **Fallback Mode**: Automatic mock responses if API keys are missing
- ✅ **Multi-Provider**: Easy switch between Claude and Qwen

#### 5. **Image Generation (Separate Service)**
**File**: `apps/api/src/modules/ia/fal.service.ts`

- **FLUX Pro** (Rendering): High-quality 3D photorealistic rendering
- **FLUX Dev** (Colorization): Image colorization for design visualization
- **API Key**: Already configured in .env (`FAL_KEY`)
- **Status**: Ready to use

### API Endpoints Available

```
POST /api/ia/chat              → Streaming chat with Claude
POST /api/ia/chat (non-stream) → Single completion response
POST /api/ia/analyze           → Analyze dossier with AI
POST /api/ia/suggest-alerts    → Generate smart alerts
POST /api/ia/rendu             → FLUX Pro image rendering
POST /api/ia/coloriste         → FLUX image colorization
GET  /api/ia/status            → Check AI service status
```

### How to Use

#### From Frontend (React Component)
```tsx
const { sendMessage, isStreaming } = useAIChat();

const handleChat = async (message: string) => {
  await sendMessage(message);
  // Response streams in real-time
};
```

#### From Backend (NestJS Service)
```typescript
async chat(messages: ChatMessage[]): Promise<string> {
  // Automatically uses Claude if ANTHROPIC_API_KEY is set
  return this.qwenService.chat(messages);
}

async streamChat(messages: ChatMessage[]): Promise<Readable> {
  // Returns SSE-compatible stream
  return this.qwenService.chatStream(messages);
}
```

### Starting the Development Servers

#### Option 1: Using pnpm (Recommended)
```bash
cd /sessions/magical-gracious-wozniak/mnt/Avra
npx pnpm install  # Install dependencies (one-time)
npx pnpm run dev  # Start all apps
```

#### Option 2: Individual Apps
```bash
# Terminal 1: API Server (NestJS)
cd apps/api && npm run dev

# Terminal 2: Web Server (Next.js)
cd apps/web && npx next dev --port 3002
```

#### Application URLs
- **Web App**: http://localhost:3002
- **API Server**: http://localhost:3001
- **API Docs**: http://localhost:3001/api

### Testing the Integration

#### Test Chat Assistant
1. Open http://localhost:3002
2. Click the Assistant Panel
3. Type a message (e.g., "What dossiers need attention?")
4. Response should stream from Claude API

#### Test Image Generation
1. Use the "Rendu" (rendering) or "Coloriste" (colorization) features
2. Images are generated via FAL.AI FLUX

#### Verify Logs
```bash
# API logs should show:
# "Claude AI service initialized (claude-opus-4-6)"
# This confirms Claude API is active and connected
```

### Changing the Claude Model

Edit `.env` to use a different Claude model:
```env
# Options: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### Troubleshooting

#### "AI service disabled (mock mode)"
- **Cause**: `ANTHROPIC_API_KEY` and `QWEN_API_KEY` are both empty
- **Solution**: Ensure the .env file has the correct API key

#### "Error: Cannot find module '@nestjs/cli'"
- **Cause**: Dependencies not installed
- **Solution**: Run `npx pnpm install` from the root directory

#### Chat responses are slow
- **Cause**: Network latency to Anthropic API
- **Solution**: Check internet connection, try switching to `claude-haiku-4-5` for faster responses

#### Images not generating
- **Cause**: `FAL_KEY` might be invalid
- **Solution**: Verify FAL_KEY in .env matches your fal.ai account

### Cost Optimization

**Claude API Pricing** (as of 2026):
- **claude-opus-4-6**: Most capable, higher cost (~$15/1M tokens)
- **claude-sonnet-4-6**: Balanced, medium cost (~$3/1M tokens)
- **claude-haiku-4-5**: Fastest, lowest cost (~$0.80/1M tokens)

**Recommendation**: Use `claude-haiku-4-5` for chat assistant (sufficient for AVRA tasks), reserve Opus for analysis.

### Next Steps

1. ✅ Start development servers
2. ✅ Test chat streaming in the UI
3. ✅ Monitor API logs for "Claude AI service initialized"
4. ✅ Generate test images using FAL integration
5. ✅ Optimize model selection based on latency/cost

---

**Configuration Date**: April 5, 2026
**Status**: Ready for Development
