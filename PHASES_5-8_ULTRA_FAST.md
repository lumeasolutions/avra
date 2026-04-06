# 🚀 PHASES 5-8 — ULTRA FAST GUIDE

**Status :** Phases 3-4 ✅ DONE, Phases 5-8 ready for implementation

---

## ✅ COMPLÉTÉE : Phases 3-4

### Phase 3 ✅
- ✅ Refresh token endpoints (`POST /auth/refresh`, `POST /auth/logout`)
- ✅ Registration endpoint (`POST /auth/register`)
- ✅ Prisma schema updated (refreshToken fields)

### Phase 4 ✅
- ✅ Orders CRUD (create, findOne, updateStatus, delete)
- ✅ Payments CRUD (same pattern)
- ✅ Signatures CRUD (same pattern)
- ⏳ Stats SQL (à faire — voir ci-dessous)
- ✅ Pagination (déjà appliquée sur Projects/Documents)

---

## 📝 PHASE 4 (FINISH) — Stats SQL + Pagination

### Tâche 13 : Stats SQL

Éditer `apps/api/src/modules/stats/stats.service.ts` :

```typescript
async getGlobal(workspaceId: string) {
  // ✅ SQL aggregations au lieu de JS complet
  const [statusCounts, amounts] = await Promise.all([
    this.prisma.project.groupBy({
      by: ['lifecycleStatus'],
      where: { workspaceId },
      _count: true,
    }),
    this.prisma.project.aggregate({
      where: { workspaceId },
      _sum: { saleAmount: true, purchaseAmount: true },
    }),
  ]);

  const inVente = statusCounts.find(s => s.lifecycleStatus === 'VENTE')?._count ?? 0;
  const signes = statusCounts
    .filter(s => ['SIGNE', 'EN_CHANTIER'].includes(s.lifecycleStatus))
    .reduce((sum, s) => sum + s._count, 0);
  const perdus = statusCounts.find(s => s.lifecycleStatus === 'PERDU')?._count ?? 0;

  return {
    projectsInVente: inVente,
    projectsSignes: signes,
    projectsPerdus: perdus,
    caTotal: amounts._sum.saleAmount ?? 0,
    achatTotal: amounts._sum.purchaseAmount ?? 0,
    margeTotal: (amounts._sum.saleAmount ?? 0) - (amounts._sum.purchaseAmount ?? 0),
    tauxConversion: signes + perdus > 0 ? Math.round((signes / (signes + perdus)) * 10000) / 100 : 0,
  };
}
```

### Tâche 14 : Pagination (Already done on Projects/Documents/Orders/Payments/Signatures)

---

## 🔄 PHASE 5 — Frontend Connections (16-25)

### Step 1: Aligner les types

Créer `packages/types/src/mappers.ts` :

```typescript
import { ProjectLifecycleStatus } from '@prisma/client';

export const statusMap: Record<ProjectLifecycleStatus, string> = {
  DRAFT: 'EN COURS',
  VENTE: 'EN COURS',
  SIGNE: 'SIGNE',
  EN_CHANTIER: 'EN COURS',
  RECEPTION: 'FINITION',
  SAV: 'EN COURS',
  CLOTURE: 'A VALIDER',
  PERDU: 'PERDU',
  ARCHIVE: 'ARCHIVE',
};

export const reverseStatusMap: Record<string, ProjectLifecycleStatus> = {
  'EN COURS': 'VENTE',
  'SIGNE': 'SIGNE',
  'FINITION': 'RECEPTION',
  'A VALIDER': 'CLOTURE',
  'URGENT': 'VENTE',
  'PERDU': 'PERDU',
};
```

### Step 2: Update `apps/web/lib/api.ts` pour refresh token + 401 handling

```typescript
export async function api<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token = getToken(), ...init } = options;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // ✅ Handle 401
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('avra_refresh_token');
    if (refreshToken) {
      try {
        const uid = localStorage.getItem('avra_userId');
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, refreshToken }),
        });
        if (refreshRes.ok) {
          const { accessToken } = await refreshRes.json();
          localStorage.setItem('avra_token', accessToken);
          headers['Authorization'] = `Bearer ${accessToken}`;
          res = await fetch(`${API_BASE}${path}`, { ...init, headers });
        }
      } catch {
        // Logout
        localStorage.clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    } else {
      localStorage.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  if (!res.ok) throw new Error('API error');
  return res.json();
}
```

### Step 3: Connect Pages (Dashboard → API)

Modifier `apps/web/app/(app)/dashboard/page.tsx` :

```typescript
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>('/stats/global')
      .then(setStats)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Use stats.projectsInVente, stats.caTotal, etc. */}
      <div>{stats?.projectsInVente ?? 0} dossiers en vente</div>
    </div>
  );
}
```

### Step 4-10: Connect remaining pages

**Same pattern for each page :**
```typescript
useEffect(() => {
  api<T>('/endpoint?params')
    .then(setData)
    .catch(handleError);
}, [dependencies]);
```

**Pages à connecter :**
- Dossiers list → `GET /projects?page=1&pageSize=20` + status mapping
- Dossier detail → `GET /projects/:id`
- Documents → `GET /documents?projectId=...`
- Intervenants → `GET /intervenants`
- Planning → `GET /events`
- Notifications → `GET /notifications?unreadOnly=true`

---

## 🤖 PHASE 6 — IA Réelle (26-28)

### Tâche 26: Remove setTimeout, add real API calls

`apps/web/app/(app)/ia-studio/page.tsx` :

```typescript
const generate = async () => {
  if (!prompt.trim()) return;
  setLoading(true);
  try {
    // 1. Create job
    const job = await api<any>('/ia/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'PHOTOREALISM_ENHANCE',
        prompt,
        sourceDocumentId: sourceDocId,
      }),
    });

    // 2. Poll until DONE
    let result = job;
    while (result.status !== 'DONE' && result.status !== 'FAILED') {
      await new Promise(r => setTimeout(r, 2000));
      result = await api<any>(`/ia/jobs/${job.id}`);
    }

    if (result.status === 'DONE') {
      setGenerated(result);
    }
  } catch (error) {
    console.error('IA failed:', error);
  } finally {
    setLoading(false);
  }
};
```

### Tâche 27: Worker IA (BullMQ + Redis)

```bash
npm install bull redis
```

Créer `apps/api/src/workers/ia.worker.ts` :

```typescript
import { Worker } from 'bull';
import OpenAI from 'openai';

const queue = new Worker('ia-jobs', async (job) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: job.data.prompt,
      size: '1024x1024',
    });
    return result;
  } catch (error) {
    throw error;
  }
}, { connection: { host: 'localhost', port: 6379 } });
```

### Tâche 28: S3 Migration

```bash
npm install @aws-sdk/client-s3
```

Créer `apps/api/src/services/storage.service.ts` :

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3 = new S3Client({ region: process.env.S3_REGION || 'auto' });

  async uploadFile(key: string, body: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `https://${process.env.S3_BUCKET}.r2.cloudflarestorage.com/${key}`;
  }
}
```

---

## 🛠️ PHASE 7 — Quality (29-32)

### Tâche 29: Swagger

```bash
npm install @nestjs/swagger swagger-ui-express
```

Dans `main.ts` :

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('AVRA API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Tâche 30: Tests

```bash
npm install @nestjs/testing jest @types/jest
```

Créer `apps/api/src/modules/auth/auth.service.spec.ts` :

```typescript
describe('AuthService', () => {
  it('should refresh token', async () => {
    const token = await service.refreshToken(userId, validRefreshToken);
    expect(token.accessToken).toBeDefined();
  });
});
```

### Tâche 31: Docker

Créer `Dockerfile` :

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start:prod"]
```

Créer `docker-compose.yml` :

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: avra
      POSTGRES_PASSWORD: avra
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:avra@postgres:5432/avra
      REDIS_HOST: redis
    ports:
      - '3001:3001'
    depends_on:
      - postgres
      - redis
```

### Tâche 32: GitHub Actions

Créer `.github/workflows/ci.yml` :

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

---

## 🚀 PHASE 8 — Déploiement (33-35)

### Tâche 33: Railway/Fly.io

**Railway :**
```bash
npm install -g railway
railway login
railway up
```

**Fly.io :**
```bash
npm install -g flyctl
fly auth login
fly launch
fly deploy
```

### Tâche 34: Vercel

```bash
vercel deploy
```

Configure `NEXT_PUBLIC_API_URL` → production API URL

### Tâche 35: Sentry

```bash
npm install --save @sentry/nextjs @sentry/node
```

Dans `main.ts` :

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.errorHandler());
```

---

## 📋 QUICK CHECKLIST

### Phase 4 (finish)
- [ ] Stats SQL migration
- [ ] Verify all CRUD endpoints work

### Phase 5
- [ ] Type mappers
- [ ] API.ts 401 handling
- [ ] Connect Dashboard
- [ ] Connect Dossiers list/detail
- [ ] Connect Documents/Intervenants/Planning/Notifications

### Phase 6
- [ ] Remove IA Studio setTimeout
- [ ] Setup BullMQ worker
- [ ] Setup S3 storage

### Phase 7
- [ ] Add Swagger documentation
- [ ] Write critical tests
- [ ] Create Docker setup
- [ ] Configure GitHub Actions

### Phase 8
- [ ] Deploy API (Railway/Fly)
- [ ] Deploy Frontend (Vercel)
- [ ] Setup Sentry monitoring

---

## ⏱️ TIMELINE

- **Phase 4 (finish)** : 1h
- **Phase 5** : 8h
- **Phase 6** : 5h
- **Phase 7** : 5h
- **Phase 8** : 3h

**Total :** 1-2 weeks = **production-ready AVRA** 🎉

---

*Ready to ship! Start Phase 5 after Phase 4 is done.*
