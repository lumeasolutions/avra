# 🚀 AVRA Quick Start - Claude API Ready

## What's New
✅ **Claude API integrated as primary chat provider**
✅ **FAL.AI image generation configured** (FLUX Pro + Dev)
✅ **.env file updated with all API keys**
✅ **Multi-provider support** (Claude → Qwen fallback → Mock mode)

## Start Development

### 1️⃣ Install Dependencies
```bash
cd /sessions/magical-gracious-wozniak/mnt/Avra
npx pnpm install
```

### 2️⃣ Start All Services
```bash
npx pnpm run dev
```

Or start individually:
```bash
# Terminal 1
cd apps/api && npm run dev

# Terminal 2
cd apps/web && npx next dev --port 3002
```

### 3️⃣ Access the App
- **Web**: http://localhost:3002
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api

## Configuration Summary

### Claude API (Chat Assistant) ✅
```env
ANTHROPIC_API_KEY=sk-ant-api103-Ch00BrQ8dU_ID-H2mwfexUdIzo3bq8g_wwyz5bI8LT3-GtxVQHwhbNGXeNSrmSGVz1D_sIg2U9i2yAnaaDnPhg-5x50AgAA
ANTHROPIC_MODEL=claude-opus-4-6
```

### FAL.AI (Image Generation) ✅
```env
FAL_KEY=5bc5e9d9-a38c-4dac-b151-8fffac51fc9d:d481622f5209ddf70610c08ac84121b0
```

## Key Features

### Chat Assistant
- Uses **Claude Opus 4.6** for intelligent responses
- Real-time streaming via SSE
- Context-aware based on AVRA workspace state
- Fallback to mock mode if key is missing

### Image Generation
- **Rendu** (Rendering): FLUX Pro for photorealistic 3D
- **Coloriste** (Colorization): FLUX Dev for design visualization

### Smart Alerts
- AI-powered alert suggestions
- Analyzes dossiers, invoices, and planning
- Automatic severity classification

## Testing

### Quick Test
1. Open http://localhost:3002
2. Look for Assistant icon (chat bubble)
3. Send a message like: "What dossiers need attention?"
4. Watch response stream in real-time ✨

## Changing Models

Want to use Sonnet or Haiku instead?

Edit `.env`:
```env
# Fast & Cheap (Recommended for production)
ANTHROPIC_MODEL=claude-haiku-4-5

# Balanced
ANTHROPIC_MODEL=claude-sonnet-4-6

# Most Capable (Current)
ANTHROPIC_MODEL=claude-opus-4-6
```

## Status Check

### Check API Service Status
```bash
curl http://localhost:3001/api/ia/status
```

### Expected Response
```json
{
  "provider": "claude",
  "model": "claude-opus-4-6",
  "enabled": true,
  "fal": {
    "configured": true,
    "models": ["FLUX Pro", "FLUX Dev"]
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dependencies not found | Run `npx pnpm install` |
| "AI service disabled" | Check `.env` has `ANTHROPIC_API_KEY` |
| Slow responses | Switch to `claude-haiku-4-5` |
| Images not generating | Verify `FAL_KEY` in `.env` |
| Port already in use | Kill process: `lsof -i :3001` or `:3002` |

## File Changes Made

```
✏️ .env
  - Added ANTHROPIC_API_KEY
  - Added ANTHROPIC_MODEL
  - Kept FAL_KEY configured

✏️ apps/api/src/modules/ia/qwen.service.ts
  - Refactored to support Claude & Qwen
  - Added AIProvider type detection
  - Updated to use generic 'client' property
  - Prioritizes Claude if key available
```

## Next: Production Deployment

When ready for production:

1. **Optimize Model**: Use `claude-haiku-4-5` to reduce costs
2. **Rate Limiting**: Add API request throttling
3. **Monitoring**: Set up logs for API usage
4. **Error Handling**: Configure graceful fallbacks
5. **Testing**: Run full integration tests

---

**All systems ready! Happy coding! 🎉**
