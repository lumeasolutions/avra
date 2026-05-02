# 🚀 AVRA Deployment Guide (Phase 8)

## Task 33: Deploy API (Railway/Fly.io)

### Option A: Railway.app (Recommended - Easiest)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Link to GitHub repository (optional)
railway link

# 5. Set environment variables
railway variables set DATABASE_URL=postgresql://...
railway variables set JWT_SECRET=your-secret
railway variables set OPENAI_API_KEY=sk-...
railway variables set S3_BUCKET=your-bucket
railway variables set S3_REGION=auto

# 6. Deploy
railway up
```

### Option B: Fly.io

```bash
# 1. Install Fly CLI
curl https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Create app
flyctl launch

# 4. Set secrets
flyctl secrets set DATABASE_URL=postgresql://...
flyctl secrets set JWT_SECRET=your-secret
flyctl secrets set OPENAI_API_KEY=sk-...

# 5. Deploy
flyctl deploy
```

---

## Task 34: Deploy Frontend (Vercel)

```bash
# 1. Push to GitHub (if not already done)
git push origin main

# 2. Go to vercel.com and import the repository

# 3. Configure build settings:
# - Root directory: apps/web
# - Build command: pnpm build
# - Output directory: .next

# 4. Set environment variables:
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
# (or your Fly.io URL)

# 5. Deploy (automatic on push)
```

Or via CLI:

```bash
npm install -g vercel
vercel
```

---

## Task 35: Sentry Monitoring

### Setup Sentry

```bash
# 1. Create account at sentry.io

# 2. Create project for Node.js/NestJS
# Get DSN: https://xxx@xxx.ingest.sentry.io/xxx

# 3. Add environment variable
export SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# 4. Install packages (already in docker-compose setup)
npm install @sentry/node
npm install @sentry/nextjs  # for frontend

# 5. The integration is already in main.ts:
#    Sentry.init({ dsn: process.env.SENTRY_DSN });
#    app.use(Sentry.Handlers.errorHandler());
```

### Frontend Sentry Setup

Create `apps/web/next.config.js`:

```javascript
const withSentryConfig = require("@sentry/nextjs/withSentryConfig");

module.exports = withSentryConfig(
  {
    // Your existing config...
  },
  {
    org: "your-org",
    project: "your-project",
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }
);
```

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] S3/Cloudflare R2 bucket created and configured
- [ ] OpenAI API key obtained (for IA features)
- [ ] Sentry project created with DSN
- [ ] GitHub repository pushed and linked
- [ ] Domain names configured (DNS records)
- [ ] SSL certificates (automatic with Railway/Fly/Vercel)

## 🔒 Security Checklist

- [ ] JWT_SECRET is strong (40+ characters)
- [ ] API_URL and WEB_URL are correct (no localhost)
- [ ] Database password is strong
- [ ] Never commit `.env` files
- [ ] All secrets in environment variables only
- [ ] CORS origins whitelisted
- [ ] Rate limiting enabled (already in app.module.ts)

## 📊 Post-Deployment

1. **Monitor logs** in Railway/Fly dashboard
2. **Check health endpoint**: `https://api.your-domain.com/health`
3. **Access Swagger docs**: `https://api.your-domain.com/api/docs`
4. **Monitor Sentry** for errors
5. **Test frontend** at `https://your-domain.vercel.app`

## 🐛 Troubleshooting

### "Database connection refused"
- Check DATABASE_URL is correct
- Ensure database is running and accessible
- Verify firewall/network settings

### "OpenAI API key invalid"
- Verify OPENAI_API_KEY in environment
- Check key has correct permissions
- Test key at openai.com

### "S3 upload failing"
- Verify S3_BUCKET and S3_REGION
- Check AWS credentials
- Ensure bucket is accessible

### "Build fails"
- Check all dependencies installed: `pnpm install`
- Verify Node.js version 20+
- Check build command in vercel.json

## 📞 Support

For Railway support: https://railway.app/help
For Fly.io support: https://fly.io/docs/
For Vercel support: https://vercel.com/support

---

**Deployment complete! Your AVRA is now live 🎉**
