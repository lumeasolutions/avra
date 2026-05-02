# 🚀 Guide de Continuité AVRA — Tâches 8-35

**Statut :** Phases 1 & 2 complétées ✅ (tâches 1-7)
- ✅ Transaction createWithClient
- ✅ Suppression StoredFile
- ✅ Helmet + ThrottlerModule
- ✅ Validation env
- ✅ @Roles() appliqué (Projects, Clients, Documents, Stock)
- ✅ AuditInterceptor global

**À faire :** Tâches 8-35 (Phases 3-8)

---

## 🔑 PHASE 3 — Auth complète (Tâches 8-9)

### TÂCHE 8️⃣ — Refresh Token

**Étape 1 : Mettre à jour le modèle User dans Prisma**

```bash
cd /sessions/peaceful-charming-wright/mnt/Avra
# Éditer prisma/schema.prisma
# Ajouter au modèle User :
# refreshToken      String?        // Hashed refresh token
# refreshTokenExpiresAt DateTime?
```

**Étape 2 : Créer le service refresh**

Éditer `apps/api/src/modules/auth/auth.service.ts` :

```typescript
import * as crypto from 'crypto';

async refreshToken(userId: string, refreshToken: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });
  if (!user || !user.refreshToken) throw new UnauthorizedException('Invalid refresh token');

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid || !user.refreshTokenExpiresAt || new Date() > user.refreshTokenExpiresAt) {
    throw new UnauthorizedException('Refresh token expired');
  }

  // Generate new tokens
  const newAccessToken = this.jwt.sign({ sub: user.id, email: user.email });
  const newRefreshToken = crypto.randomBytes(32).toString('hex');
  const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);

  await this.prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: hashedRefresh,
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async logout(userId: string) {
  return this.prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null, refreshTokenExpiresAt: null },
  });
}
```

**Étape 3 : Endpoints**

Éditer `apps/api/src/modules/auth/auth.controller.ts` :

```typescript
@Post('refresh')
async refresh(@Body('refreshToken') refreshToken: string, @Body('userId') userId: string) {
  return this.auth.refreshToken(userId, refreshToken);
}

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@CurrentUser() user: JwtPayload) {
  return this.auth.logout(user.sub);
}
```

---

### TÂCHE 9️⃣ — Inscription / Onboarding

Créer `apps/api/src/modules/auth/dto/register.dto.ts` :

```typescript
import { IsEmail, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  workspaceName: string;
}
```

Ajouter dans `auth.service.ts` :

```typescript
async register(dto: RegisterDto) {
  // Check if user exists
  const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
  if (existing) throw new ConflictException('Email already registered');

  return this.prisma.$transaction(async (tx) => {
    // Create workspace
    const workspace = await tx.workspace.create({
      data: { name: dto.workspaceName, plan: 'STARTER' },
    });

    // Create user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await tx.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: true,
      },
    });

    // Link user to workspace
    await tx.userWorkspace.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      },
    });

    return { userId: user.id, workspaceId: workspace.id };
  });
}
```

Endpoint dans `auth.controller.ts` :

```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  const result = await this.auth.register(dto);
  // Generate tokens and return
  return { success: true, ...result };
}
```

---

## 📦 PHASE 4 — CRUD complet sur modules stubs (Tâches 10-14)

### TÂCHE 1️⃣0️⃣ — OrdersModule CRUD complet

Créer `apps/api/src/modules/orders/orders.controller.ts` :

```typescript
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.orders.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return projectId
      ? this.orders.findByProject(user.workspaceId, projectId)
      : this.orders.findByWorkspace(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.findOne(user.workspaceId, id);
  }

  @Put(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.orders.updateStatus(user.workspaceId, id, status);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.remove(user.workspaceId, id);
  }
}
```

Mettre à jour `orders.service.ts` :

```typescript
async create(workspaceId: string, dto: any) {
  return this.prisma.supplierOrder.create({
    data: {
      ...dto,
      workspaceId,
    },
    include: { project: true, supplier: true },
  });
}

async findOne(workspaceId: string, id: string) {
  return this.prisma.supplierOrder.findFirst({
    where: { id, workspaceId },
    include: { project: true, supplier: true, lines: true },
  });
}

async updateStatus(workspaceId: string, id: string, status: string) {
  return this.prisma.supplierOrder.update({
    where: { id },
    data: { status: status as any },
  });
}

async remove(workspaceId: string, id: string) {
  const existing = await this.prisma.supplierOrder.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;
  return this.prisma.supplierOrder.delete({ where: { id } });
}
```

---

### TÂCHE 1️⃣1️⃣ — PaymentsModule CRUD

Même pattern que Orders. Ajouter endpoints :
- `POST /payments` → créer `PaymentRequest`
- `PUT /payments/:id/status`
- `DELETE /payments/:id`
- `POST /payments/stripe-webhook` (prep seulement)

---

### TÂCHE 1️⃣2️⃣ — SignatureModule CRUD

Même pattern. Ajouter :
- `POST /signatures` → créer `SignatureRequest`
- `PUT /signatures/:id/status`
- `POST /signatures/yousign-webhook` (prep seulement)

---

### TÂCHE 1️⃣3️⃣ — StatsModule réécrire en SQL

Éditer `stats.service.ts` :

```typescript
async getGlobal(workspaceId: string) {
  // ✅ SQL aggregations instead of JS
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
  const signes = statusCounts.filter(s => ['SIGNE', 'EN_CHANTIER'].includes(s.lifecycleStatus))
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

---

### TÂCHE 1️⃣4️⃣ — Pagination sur tous les `findMany`

Créer un type utilitaire dans `@avra/types/pagination.ts` :

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const paginate = (page = 1, pageSize = 20) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

Appliquer sur tous les services : Clients, Intervenants, Events, etc.

---

### TÂCHE 1️⃣5️⃣ — Changer POST /auth/me en GET

```typescript
@Get('me')  // ← change POST to GET
@UseGuards(JwtAuthGuard)
async me(@CurrentUser() user: JwtPayload) {
  // ...
}
```

---

## 🔄 PHASE 5 — Connexion Frontend ↔ Backend (Tâches 16-25)

### TÂCHE 1️⃣6️⃣ — Aligner types front/back

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
  'URGENT': 'VENTE', // Treat URGENT as VENTE
  'PERDU': 'PERDU',
};
```

---

### TÂCHE 1️⃣7️⃣ — Gérer erreurs 401 dans api.ts

Éditer `apps/web/lib/api.ts` :

```typescript
async function api<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token = getToken(), ...init } = options;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // ✅ Handle 401 — try refresh, else redirect
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('avra_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const { accessToken } = await refreshRes.json();
          localStorage.setItem('avra_token', accessToken);
          headers['Authorization'] = `Bearer ${accessToken}`;
          res = await fetch(`${API_BASE}${path}`, { ...init, headers });
        } else {
          throw new Error('Refresh failed');
        }
      } catch {
        // Redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('avra_token');
          localStorage.removeItem('avra_refresh_token');
          window.location.href = '/login';
        }
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'API error');
  }
  return res.json();
}
```

---

### TÂCHE 1️⃣8️⃣ — Connecter Dashboard

Éditer `apps/web/app/(app)/dashboard/page.tsx` :

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
      .catch(e => console.error('Failed to load stats:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Utiliser stats au lieu du store local */}
      <div className="text-2xl font-bold">{stats?.projectsInVente ?? 0} dossiers en vente</div>
      {/* ... */}
    </div>
  );
}
```

---

### TÂCHE 1️⃣9️⃣ — Connecter liste Dossiers

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { statusMap } from '@avra/types';

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<any>('/projects?page=' + page)
      .then(res => setDossiers(res.data.map(d => ({
        ...d,
        status: statusMap[d.lifecycleStatus] || d.lifecycleStatus,
      }))))
      .catch(console.error);
  }, [page]);

  return (
    <div>
      {dossiers.map(d => (
        <div key={d.id}>{d.name} — {d.status}</div>
      ))}
    </div>
  );
}
```

---

### TÂCHE 2️⃣0️⃣ — Connecter détail Dossier

```typescript
useEffect(() => {
  api<any>('/projects/' + id)
    .then(setProject)
    .catch(console.error);
}, [id]);
```

---

### TÂCHE 2️⃣1️⃣ — Nouveau Dossier

Créer un formulaire qui appelle `POST /projects/with-client`

---

### TÂCHE 2️⃣2️⃣-2️⃣5️⃣ — Connecter Documents, Intervenants, Planning, Notifications

Même pattern : `useEffect` + `api<T>('/endpoint?params')` + state

---

## 🤖 PHASE 6 — IA Studio réelle (Tâches 26-28)

### TÂCHE 2️⃣6️⃣ — Remplacer setTimeout par vrais appels

```typescript
const generate = async () => {
  if (!prompt.trim()) return;
  setLoading(true);
  try {
    // 1. Upload source si présente
    let sourceDocId = null;
    if (sourceImage) {
      const fd = new FormData();
      fd.append('file', sourceImage);
      const { documentId } = await apiUpload<any>('/ia/upload', fd);
      sourceDocId = documentId;
    }

    // 2. Créer job
    const job = await api<any>('/ia/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'PHOTOREALISM_ENHANCE',
        prompt,
        sourceDocumentId: sourceDocId,
      }),
    });

    // 3. Poll jusqu'à DONE
    let result = job;
    while (result.status !== 'DONE') {
      await new Promise(r => setTimeout(r, 2000));
      result = await api<any>('/ia/jobs/' + job.id);
    }

    setGenerated(result);
  } catch (error) {
    console.error('IA generation failed:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### TÂCHE 2️⃣7️⃣ — Worker IA (BullMQ + Redis)

```bash
npm install --save bull redis
```

Créer `apps/api/src/workers/ia.worker.ts` :

```typescript
import { Worker } from 'bull';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const queue = new Bull('ia-jobs', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: 6379 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaService();

queue.process(async (job) => {
  const iaJob = await prisma.iaJob.findUnique({ where: { id: job.data.jobId } });

  try {
    await prisma.iaJob.update({
      where: { id: job.data.jobId },
      data: { status: 'PROCESSING' },
    });

    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: iaJob.prompt,
      size: '1024x1024',
    });

    // Save result...
    await prisma.iaJob.update({
      where: { id: job.data.jobId },
      data: { status: 'DONE' },
    });
  } catch (error) {
    await prisma.iaJob.update({
      where: { id: job.data.jobId },
      data: { status: 'FAILED', details: error.message },
    });
  }
});
```

---

### TÂCHE 2️⃣8️⃣ — S3/R2 Migration

```bash
npm install --save @aws-sdk/client-s3
```

Créer `apps/api/src/services/storage.service.ts` :

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async uploadFile(key: string, body: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'avra',
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT}/${key}`;
  }
}
```

Remplacer `fs.writeFileSync` dans `IaService` par `StorageService.uploadFile()`

---

## 🛠️ PHASE 7 — Qualité (Tâches 29-32)

### TÂCHE 2️⃣9️⃣ — Swagger

```bash
npm install --save @nestjs/swagger swagger-ui-express
```

Éditer `main.ts` :

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('AVRA API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('/api/docs', app, document);
```

---

### TÂCHE 3️⃣0️⃣ — Tests

```bash
npm install --save @nestjs/testing jest @types/jest
```

Créer `apps/api/src/modules/auth/auth.service.spec.ts` :

```typescript
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [AuthService] }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should hash passwords', async () => {
    const result = await service.hashPassword('test123');
    expect(result).not.toEqual('test123');
  });
});
```

---

### TÂCHE 3️⃣1️⃣ — Docker

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

---

### TÂCHE 3️⃣2️⃣ — GitHub Actions

Créer `.github/workflows/ci.yml` :

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
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

## 🚀 PHASE 8 — Déploiement (Tâches 33-35)

### TÂCHE 3️⃣3️⃣ — Railway / Fly.io

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
fly launch  # Generates fly.toml
fly deploy
```

---

### TÂCHE 3️⃣4️⃣ — Vercel

```bash
vercel deploy
# Configure NEXT_PUBLIC_API_URL → production API URL
```

---

### TÂCHE 3️⃣5️⃣ — Sentry

```bash
npm install --save @sentry/nextjs @sentry/node
```

Dans `apps/api/src/main.ts` :

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.errorHandler());
```

---

## 📋 Checklist de continuité

- [ ] Tâche 8 — Refresh token
- [ ] Tâche 9 — Inscription
- [ ] Tâche 10-12 — CRUD complets (Orders, Payments, Signatures)
- [ ] Tâche 13-14 — Stats SQL + Pagination
- [ ] Tâche 15 — POST → GET /auth/me
- [ ] Tâche 16-17 — Types alignment + 401 handling
- [ ] Tâche 18-25 — Connecter tous les endpoints frontend
- [ ] Tâche 26-28 — IA réelle + S3 + Worker
- [ ] Tâche 29-32 — Swagger + Tests + Docker + CI/CD
- [ ] Tâche 33-35 — Déploiement + Sentry

**Temps estimé :** 2-3 semaines en parallèle, 1 semaine en accéléré

---

*Généré le 23 mars 2026 — Claude AVRA Implementation Guide*
