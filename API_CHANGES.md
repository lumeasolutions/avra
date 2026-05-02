# Changements d'API - Optimisations Prisma

## Vue d'ensemble

Les services retournent désormais des réponses paginées au lieu de simples tableaux. Les paramètres de pagination sont optionnels avec des défauts sensés.

---

## Signatures modifiées par service

### Clients Service

#### `findAll()`
```typescript
// AVANT
async findAll(workspaceId: string): Promise<Client[]>

// APRÈS
async findAll(
  workspaceId: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<Client>>
```

**Response AVANT** :
```json
[
  { "id": "...", "companyName": "...", "firstName": "...", "lastName": "...", "email": "...", "phone": "...", "notes": "...", "vatNumber": "...", ... },
  ...
]
```

**Response APRÈS** :
```json
{
  "data": [
    { "id": "...", "type": "PARTICULIER", "companyName": "...", "firstName": "...", "lastName": "...", "email": "...", "phone": "...", "isActive": true, "createdAt": "...", "updatedAt": "..." },
    ...
  ],
  "total": 247,
  "page": 1,
  "pageSize": 50
}
```

**Champs supprimés de la réponse** :
- `notes`
- `vatNumber`

**Migration frontend** :
```typescript
// AVANT
const clients = await clientsService.findAll(workspaceId);
for (const client of clients) { ... }

// APRÈS
const { data, total, page, pageSize } = await clientsService.findAll(workspaceId, 1, 50);
for (const client of data) { ... }

// Avec pagination
const { data: nextPage } = await clientsService.findAll(workspaceId, 2, 50);
```

#### `findOne()`
```typescript
// Signature identique
async findOne(workspaceId: string, id: string): Promise<ClientDetail>

// Mais select() au lieu de include()
// Les relations sont optimisées
```

**Response AVANT** :
```json
{
  "id": "...",
  "companyName": "...",
  "addresses": [
    { "id": "...", "type": "SITE", "line1": "...", "line2": "...", "city": "...", "postalCode": "...", "country": "...", "createdAt": "..." },
    ...
  ],
  "projects": [
    { "id": "...", "name": "...", "reference": "...", "lifecycleStatus": "...", ... TOUS LES CHAMPS ... },
    ...
  ]
}
```

**Response APRÈS** :
```json
{
  "id": "...",
  "type": "PARTICULIER",
  "companyName": "...",
  "firstName": "...",
  "lastName": "...",
  "email": "...",
  "phone": "...",
  "vatNumber": "...",
  "notes": "...",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "...",
  "addresses": [
    { "id": "...", "type": "SITE", "line1": "...", "city": "...", "postalCode": "...", "country": "..." }
  ],
  "projects": [
    { "id": "...", "name": "...", "reference": "...", "lifecycleStatus": "..." }
  ]
}
```

**Champs supprimés des relations** :
- `addresses` : tous les champs à l'exception `id, type, line1, city, postalCode, country`
- `projects` : seulement `id, name, reference, lifecycleStatus`

---

### Projects Service

#### `findAll()`
```typescript
// Signature inchangée (avait déjà pagination)
async findAll(
  workspaceId: string,
  filters?: { status?: ProjectLifecycleStatus; tradeType?: TradeType; page?: number; pageSize?: number },
): Promise<PaginatedResponse<ProjectList>>
```

**Response** : structure paginée inchangée

#### `findOne()`
```typescript
// Signature identique
async findOne(workspaceId: string, id: string): Promise<ProjectDetail>

// Mais select() au lieu de include()
```

**Changements** :
- `client` : Select limité (`id, companyName, firstName, lastName, email, phone`)
- `owner` : Select limité (`id, firstName, lastName, email`)
- `documents` : Limité à 50, seulement `id, title, kind, visibilityClient, createdAt`
- `projectIntervenants` : Select sur `intervenant` limité

---

### Documents Service

#### `findByProject()`
```typescript
// Signature identique
async findByProject(
  workspaceId: string,
  projectId: string,
  folderId?: string,
  page?: number,      // défaut: 1
  pageSize?: number   // défaut: 50
): Promise<PaginatedResponse<DocumentList>>
```

**Response** :
```json
{
  "data": [
    {
      "id": "...",
      "title": "...",
      "kind": "DEVIS",
      "visibilityClient": true,
      "version": 1,
      "createdAt": "...",
      "updatedAt": "...",
      "storedFile": {
        "id": "...",
        "originalName": "devis.pdf",
        "mimeType": "application/pdf",
        "mimeCategory": "PDF",
        "sizeBytes": 245000,
        "publicUrl": "..."
      }
    },
    ...
  ],
  "total": 145,
  "page": 1,
  "pageSize": 50
}
```

---

### Events Service

#### `findAll()`
```typescript
// AVANT
async findAll(
  workspaceId: string,
  calendarType?: EventCalendarType,
  from?: Date,
  to?: Date,
): Promise<EventList[]>

// APRÈS
async findAll(
  workspaceId: string,
  calendarType?: EventCalendarType,
  from?: Date,
  to?: Date,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 100
): Promise<PaginatedResponse<EventList>>
```

---

### Intervenants Service

#### `findAll()`
```typescript
// AVANT
async findAll(
  workspaceId: string,
  type?: IntervenantType,
): Promise<IntervenantList[]>

// APRÈS
async findAll(
  workspaceId: string,
  type?: IntervenantType,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<IntervenantList>>
```

---

### Stock Service

#### `findAll()`
```typescript
// AVANT
async findAll(
  workspaceId: string,
  status?: StockItemStatus,
): Promise<StockItem[]>

// APRÈS
async findAll(
  workspaceId: string,
  status?: StockItemStatus,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<StockItemList>>
```

---

### IA Service

#### `findJobsByWorkspace()`
```typescript
// AVANT
async findJobsByWorkspace(
  workspaceId: string,
  projectId?: string,
): Promise<IaJob[]>

// APRÈS
async findJobsByWorkspace(
  workspaceId: string,
  projectId?: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<IaJobList>>
```

**Response** :
```json
{
  "data": [
    {
      "id": "...",
      "type": "PHOTOREALISM_ENHANCE",
      "status": "DONE",
      "prompt": "...",
      "errorMessage": null,
      "completedAt": "2024-01-15T10:30:00Z",
      "createdAt": "...",
      "updatedAt": "...",
      "sourceDocument": {
        "id": "...",
        "title": "Photo originale",
        "storedFile": {
          "id": "...",
          "originalName": "photo.jpg",
          "publicUrl": "..."
        }
      },
      "resultDocument": { ... }
    },
    ...
  ],
  "total": 342,
  "page": 1,
  "pageSize": 50
}
```

---

### Orders Service

#### `findByWorkspace()`
```typescript
// AVANT
async findByWorkspace(workspaceId: string): Promise<SupplierOrder[]>

// APRÈS
async findByWorkspace(
  workspaceId: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<SupplierOrderList>>
```

#### `findByProject()`
```typescript
// Signature inchangée, mais retour optimisé
async findByProject(
  workspaceId: string,
  projectId: string,
): Promise<SupplierOrderList[]>
```

**Response** :
```json
[
  {
    "id": "...",
    "reference": "CMD-2024-001",
    "notes": "...",
    "orderedAt": "2024-01-15T09:00:00Z",
    "createdAt": "...",
    "updatedAt": "...",
    "project": { "id": "...", "name": "...", "reference": "..." },
    "supplier": { "id": "...", "name": "...", "email": "...", "phone": "..." },
    "_count": { "lines": 5 }
  },
  ...
]
```

---

### Payments Service

#### `findByWorkspace()`
```typescript
// AVANT
async findByWorkspace(workspaceId: string): Promise<PaymentRequest[]>

// APRÈS
async findByWorkspace(
  workspaceId: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<PaymentRequestList>>
```

#### `findByProject()`
```typescript
// AVANT
async findByProject(workspaceId: string, projectId: string): Promise<PaymentRequest[]>

// APRÈS
async findByProject(
  workspaceId: string,
  projectId: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<PaymentRequestList>>
```

**Response** :
```json
{
  "data": [
    {
      "id": "...",
      "type": "ACOMPTE",
      "amount": "5000.00",
      "status": "PAID",
      "paidAt": "2024-01-15T14:30:00Z",
      "createdAt": "...",
      "updatedAt": "...",
      "project": { "id": "...", "name": "...", "reference": "..." }
    },
    ...
  ],
  "total": 24,
  "page": 1,
  "pageSize": 50
}
```

---

### Signature Service

#### `findByWorkspace()`
```typescript
// AVANT
async findByWorkspace(workspaceId: string): Promise<SignatureRequest[]>

// APRÈS
async findByWorkspace(
  workspaceId: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<SignatureRequestList>>
```

---

### Notifications Service

#### `findForUser()`
```typescript
// AVANT
async findForUser(
  workspaceId: string,
  userId: string,
  unreadOnly?: boolean,
): Promise<Notification[]>

// APRÈS
async findForUser(
  workspaceId: string,
  userId: string,
  unreadOnly?: boolean,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 50
): Promise<PaginatedResponse<NotificationList>>
```

---

### Audit Service

#### `findByWorkspace()`
```typescript
// AVANT
async findByWorkspace(
  workspaceId: string,
  projectId?: string,
  limit?: number,       // défaut: 100
): Promise<AuditLog[]>

// APRÈS
async findByWorkspace(
  workspaceId: string,
  projectId?: string,
  page?: number,        // défaut: 1
  pageSize?: number     // défaut: 100
): Promise<PaginatedResponse<AuditLogList>>
```

---

## Types génériques

### PaginatedResponse
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Exemples d'utilisation côté client

#### React
```typescript
const [page, setPage] = useState(1);
const [clients, setClients] = useState([]);
const [total, setTotal] = useState(0);
const [pageSize] = useState(50);

useEffect(() => {
  const fetchClients = async () => {
    const { data, total } = await api.get(`/clients?page=${page}&pageSize=${pageSize}`);
    setClients(data);
    setTotal(total);
  };
  fetchClients();
}, [page, pageSize]);

const totalPages = Math.ceil(total / pageSize);

return (
  <>
    {clients.map((client) => (
      <ClientRow key={client.id} client={client} />
    ))}
    <Pagination
      current={page}
      total={totalPages}
      onChange={setPage}
    />
  </>
);
```

#### Angular
```typescript
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  total = 0;
  page = 1;
  pageSize = 50;

  constructor(private clientsService: ClientsService) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.clientsService.findAll(this.workspaceId, this.page, this.pageSize).subscribe((result) => {
      this.clients = result.data;
      this.total = result.total;
    });
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadClients();
  }
}
```

#### Vue 3
```typescript
<template>
  <div>
    <ClientList :clients="clients" />
    <Pagination
      :current-page="page"
      :total-pages="Math.ceil(total / pageSize)"
      @page-change="page = $event"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { clientsService } from '@/services';

const page = ref(1);
const pageSize = ref(50);
const clients = ref([]);
const total = ref(0);

watch(page, async () => {
  const result = await clientsService.findAll(workspaceId, page.value, pageSize.value);
  clients.value = result.data;
  total.value = result.total;
});
</script>
```

---

## Migration des contrôleurs NestJS

### AVANT
```typescript
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Req() req) {
    return this.clientsService.findAll(req.workspace.id);
  }
}
```

### APRÈS
```typescript
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.clientsService.findAll(req.workspace.id, page, pageSize);
  }
}
```

---

## Backward compatibility

Pour maintenir la compatibilité, les anciens clients peuvent :

1. **Ignorer les métadonnées de pagination** et utiliser seulement `data`
2. **Passer des paramètres optionnels** pour la pagination
3. **Adapter progressivement** le code

Exemple :
```typescript
// Code ancien qui fonctionne toujours
const result = await clientsService.findAll(workspaceId);
const clients = result.data;  // Récupérer le tableau

// Code nouveau avec pagination
const { data, total, page } = await clientsService.findAll(workspaceId, 2, 100);
```

---

## Notes importantes

1. **Tous les `pageSize` par défaut** sont configurés pour les cas courants
2. **Les réponses paginées incluent `total`** pour permettre la pagination intelligente
3. **Les relations sont optimisées** avec `select` au lieu de `include`
4. **Les migrations DB** doivent être exécutées pour les nouveaux index
5. **Les tests doivent être mis à jour** pour tester avec pagination
