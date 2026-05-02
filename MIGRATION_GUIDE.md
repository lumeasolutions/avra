# Guide de migration - Optimisations Prisma

## Étapes de déploiement

### Phase 1 : Préparation (0h)

1. **Créer une branche feature**
   ```bash
   git checkout -b feat/prisma-optimizations
   ```

2. **Vérifier l'état actuel de la base de données**
   ```bash
   npx prisma db execute --stdin < check_db.sql
   ```

### Phase 2 : Mise à jour du schéma (1h)

1. **Générer la migration Prisma**
   ```bash
   npx prisma migrate dev --name add_database_indexes
   ```

   Cette commande va :
   - Créer les nouveaux index sur `Notification`, `AuditLog`
   - Générer un fichier migration SQL dans `prisma/migrations/`
   - Mettre à jour `prisma/schema.prisma`

2. **Vérifier la migration générée**
   ```bash
   cat prisma/migrations/[timestamp]_add_database_indexes/migration.sql
   ```

3. **Appliquer en staging**
   ```bash
   npm run migrate:staging
   ```

### Phase 3 : Déploiement du code (2h)

1. **Build et tests**
   ```bash
   npm run build
   npm run test
   ```

2. **Tester les services individuellement**
   ```typescript
   // Test clients.service.ts
   const result = await this.clientsService.findAll(workspaceId, 1, 50);
   console.log(result.data.length <= 50); // true
   console.log(result.total); // total count

   // Vérifier les champs retournés
   console.log(Object.keys(result.data[0])); // [id, type, companyName, ...]
   ```

3. **Push vers le dépôt**
   ```bash
   git add .
   git commit -m "feat: optimize Prisma queries with select, pagination, and indexes"
   git push origin feat/prisma-optimizations
   ```

4. **Créer une Pull Request**

### Phase 4 : Mise à jour du frontend (4h)

Les services retournent maintenant des objets paginés :

**AVANT**
```typescript
const clients = await this.clientsService.findAll(workspaceId);
// Result: Client[]
```

**APRÈS**
```typescript
const result = await this.clientsService.findAll(workspaceId, 1, 50);
// Result: { data: Client[], total: number, page: number, pageSize: number }
```

#### Fichiers à mettre à jour

1. **src/app.controller.ts** - Extraire les paramètres de pagination
   ```typescript
   @Get('clients')
   async getClients(
     @Req() req,
     @Query('page') page: number = 1,
     @Query('pageSize') pageSize: number = 50,
   ) {
     return this.clientsService.findAll(req.workspaceId, page, pageSize);
   }
   ```

2. **Frontend (React/Vue/Angular)** - Gérer la pagination
   ```typescript
   const [page, setPage] = useState(1);
   const [clients, setClients] = useState([]);
   const [total, setTotal] = useState(0);

   useEffect(() => {
     const result = await fetch(`/api/clients?page=${page}&pageSize=50`);
     const { data, total } = await result.json();
     setClients(data);
     setTotal(total);
   }, [page]);
   ```

### Phase 5 : Validation en production (Continu)

1. **Monitorer les performances**
   ```bash
   # Vérifier les requêtes lentes
   SELECT * FROM pg_stat_statements WHERE mean_time > 100 ORDER BY mean_time DESC;
   ```

2. **Analyser les logs**
   ```bash
   # Chercher les erreurs 500 liées aux modifications
   grep "Prisma\|query\|select" logs/api.*.log
   ```

3. **Tester les cas limites**
   - Requêtes avec beaucoup de filtres
   - Workspaces avec millions de records
   - Requêtes concurrentes

---

## Rollback d'urgence

Si un problème se produit en production :

```bash
# 1. Reverter le code
git revert <commit-hash>

# 2. Reverter la migration (attention!)
npx prisma migrate resolve --rolled-back <migration-name>

# 3. Redéployer
npm run deploy:prod
```

**Important** : Les contrôles et validations doivent être implémentés AVANT les changements de signature API.

---

## Checklist de déploiement

### Avant le merge
- [ ] Tests unitaires passent (`npm run test`)
- [ ] Tests d'intégration passent (`npm run test:e2e`)
- [ ] Aucune erreur de compilation (`npm run build`)
- [ ] Code review approuvée
- [ ] Migration Prisma testée en staging
- [ ] Pas de breaking changes non documentés

### Avant le déploiement prod
- [ ] Backup de la base de données
- [ ] Migration exécutée en staging
- [ ] Performance testé avec load testing (voir section Load Testing)
- [ ] Nouvelle version déployée avec feature flag (optional)
- [ ] Monitoring/alertes configurés

### Après le déploiement
- [ ] Vérifier les métriques de performance
- [ ] Vérifier les logs pour erreurs Prisma
- [ ] Tester quelques requêtes manuellement
- [ ] Confirmer que le frontend fonctionne
- [ ] Archiver les logs de déploiement

---

## Load Testing

### Setup : k6
```bash
npm install -D k6
```

### Script de test (`test/load-test.js`)
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up
    { duration: '1m30s', target: 100 }, // Stay at 100
    { duration: '20s', target: 0 },    // Ramp-down
  ],
};

export default function () {
  // Test findAll avec pagination
  const res = http.get('http://localhost:3000/api/clients?page=1&pageSize=50', {
    headers: { 'Authorization': 'Bearer TOKEN' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'data.length <= 50': (r) => JSON.parse(r.body).data.length <= 50,
  });

  sleep(1);
}
```

### Exécuter
```bash
k6 run test/load-test.js
```

---

## Performance Baseline

### Métriques avant optimisation
Extraire avec :
```sql
SELECT
  query,
  calls,
  mean_time,
  max_time,
  total_time
FROM pg_stat_statements
WHERE query LIKE '%Client%'
ORDER BY mean_time DESC;
```

### Métriques après optimisation
Comparer avec les mêmes requêtes :
```sql
-- Attendre 1h de trafic production
SELECT
  query,
  calls,
  mean_time,
  max_time,
  total_time
FROM pg_stat_statements
WHERE query LIKE '%Client%'
  AND query_timestamp > now() - interval '1 hour'
ORDER BY mean_time DESC;
```

**Objectif** : Réduction de 70-80% du temps d'exécution des requêtes de liste

---

## FAQ

### Q: Pourquoi la pagination ?
A: Éviter les timeouts, réduire la consommation mémoire, améliorer la réactivité frontend.

### Q: Pourquoi select au lieu de include ?
A: Les includes chargent TOUS les champs. Select charge seulement ce qui est nécessaire → -30-70% bande passante.

### Q: Comment gérer les vieux clients API ?
A: Utiliser des paramètres optionnels avec défauts. Les vieux clients reçoivent des objets paginés (`{ data, total, ...}`).

### Q: Les index ralentissent-ils les inserts ?
A: Oui, légèrement (~5%), mais les SELECT deviennent ~10x plus rapides. Avec 90% de SELECT en production, c'est un bon tradeoff.

### Q: Quand les index sont-ils utilisés ?
A: PostgreSQL utilise les index automatiquement si :
- WHERE clause sur colonnes indexées
- ORDER BY sur colonnes indexées
- JOIN sur colonnes indexées

Vérifier avec `EXPLAIN ANALYZE`.

---

## Contacts support

- **Questions Prisma** : Consulter les commentaires `// OPTIMISATION` dans le code
- **Problèmes DB** : Vérifier `pg_stat_statements` et logs PostgreSQL
- **Erreurs frontend** : Adapter le code pour gérer les réponses paginées
