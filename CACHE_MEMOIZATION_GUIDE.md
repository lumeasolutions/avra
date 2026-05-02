# Guide d'utilisation: Cache + Memoization Avra

## 🚀 Démarrage rapide

### API - Ajouter du cache à un endpoint:

```typescript
import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('my-resource')
export class MyController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  findAll() {
    return this.service.findAll();
  }
}
```

### Invalider le cache sur mutation:

```typescript
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export class MyController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  async create(@Body() dto: MyDto) {
    const result = await this.service.create(dto);
    // Invalider les caches relatifs
    await this.cacheManager.del(`my-resource:${userId}`);
    return result;
  }
}
```

### React - Memoizer un composant avec props:

```typescript
interface MyComponentProps {
  data: string;
  onClick: (id: string) => void;
}

// Avant (re-render à chaque fois)
export function MyComponent({ data, onClick }: MyComponentProps) {
  return <div onClick={() => onClick(data)}>{data}</div>;
}

// Après (re-render uniquement si props changent)
export const MyComponent = React.memo(function MyComponent({
  data,
  onClick,
}: MyComponentProps) {
  return <div onClick={() => onClick(data)}>{data}</div>;
});
```

### React - Optimiser les calculs coûteux:

```typescript
export default function MyPage() {
  const [filter, setFilter] = useState('');
  const data = useData(); // retourne []

  // ❌ Mauvais - re-calcule à chaque render
  const filtered = data.filter(d => d.name.includes(filter));

  // ✅ Bon - re-calcule seulement si data ou filter changent
  const filtered = useMemo(
    () => data.filter(d => d.name.includes(filter)),
    [data, filter]
  );

  return (
    <div>
      {filtered.map(item => (
        <Item key={item.id} item={item} onDelete={handleDelete} />
      ))}
    </div>
  );
}

// ✅ Pour les handlers passés en props - useCallback
const handleDelete = useCallback((id: string) => {
  deleteData(id);
}, [deleteData]); // dépendances externes
```

---

## 📊 Endpoints cachés

| Endpoint | Méthode | TTL | Raison |
|----------|---------|-----|--------|
| `/stats/global` | GET | 5 min | Stats recalculées fréquemment |
| `/projects` | GET | 5 min | Listes fréquemment consultées |
| `/projects/:id` | GET | 10 min | Détail plus stable |
| `/orders` | GET | 5 min | Listes fréquemment consultées |
| `/orders/:id` | GET | 10 min | Détail plus stable |
| `/clients` | GET | 5 min | Listes fréquemment consultées |
| `/clients/:id` | GET | 10 min | Détail plus stable |
| `/stock` | GET | 5 min | Listes fréquemment consultées |
| `/stock/:id` | GET | 10 min | Détail plus stable |

---

## ⚠️ Quand (NE PAS) utiliser le cache

### ❌ NE PAS cacher:
- Endpoints d'authentification (`/auth/*`)
- Endpoints avec données sensibles
- Endpoints avec paramètres dynamiques variés
- Données temps réel (WebSocket)

### ✅ À cacher:
- Listes (GET sans filtres dynamiques)
- Détails fixes (GET /:id)
- Données publiques
- Stats/analytics

---

## ⚠️ Quand (NE PAS) utiliser React.memo

### ❌ NE PAS memoizer:
- Pages entières (trop coûteux, pas utile)
- Composants sans props
- Composants avec refs instables
- Composants simples (render < 1ms)

### ✅ À memoizer:
- Composants dans des listes (`map()`)
- Composants "lourds" (calculs DOM complexes)
- Composants avec props complexes passées via context
- Composants réutilisables

---

## 🔍 Vérifier que le cache fonctionne

### Via DevTools NestJS:

```bash
# Terminal 1: Serveur API
npm run dev -w @avra/api

# Terminal 2: Tester le cache
curl http://localhost:3000/api/stats/global

# Devrait être plus rapide la 2e fois
curl http://localhost:3000/api/stats/global
```

### Via React DevTools Profiler:

1. Ouvrir React DevTools dans Chrome
2. Aller à l'onglet "Profiler"
3. Enregistrer une session
4. Vérifier que PageHeader ne re-render que si props changent
5. Vérifier que les listes (Item) ne re-render que si item change

---

## 🚀 Prochaines étapes

### Pour escalader le cache:

1. **Remplacer par Redis** (au-delà de 500 items cachés):
   ```bash
   npm install redis @nestjs/cache-manager-redis
   ```

2. **Ajouter du cache côté client** (HTTP caching headers):
   ```typescript
   @Get()
   @SetMetadata('cache', { ttl: 3600 }) // 1 heure
   getData() { }
   ```

3. **Monitorer les hits du cache**:
   ```typescript
   // Ajouter des logs pour tracker hit/miss
   console.log(`Cache ${hit ? 'HIT' : 'MISS'}: ${cacheKey}`);
   ```

---

## 📈 Gains de performance attendus

- **API**: 60-80% moins de requêtes lentes aux 5 minutes
- **Frontend**: 30-50ms gain par page avec listes
- **UX**: Listes + détails plus rapides à charger
- **DB**: Réduction du load de 40-60%

---

## 🐛 Troubleshooting

### Q: Cache pas invalidé après POST?
**A**: Vérifiez que `cacheManager.del()` est appelé avec la bonne clé

### Q: Composant re-render même avec memo?
**A**: Vérifiez les dépendances (`useMemo`, `useCallback`) et les contextes

### Q: Données stales après 5 min?
**A**: Réduire le TTL ou invalider manuellement lors des mutations

### Q: Cache prend trop de mémoire?
**A**: Passer à Redis ou réduire le max de items (voir cache.module.ts)
