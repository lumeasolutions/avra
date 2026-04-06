# 🚀 AVRA — Guide de déploiement Cloud

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│  www.avra.fr          → Landing page (Vercel Static)         │
│  app.avra.fr          → Dashboard Next.js (Vercel)           │
│  api.avra.fr          → API NestJS (Railway)                 │
│  db                   → PostgreSQL serverless (Neon)         │
└─────────────────────────────────────────────────────────────┘
```

Coût estimé pour démarrer : **~20-30 €/mois** (Vercel Pro + Railway Starter + Neon Free)

---

## Étape 1 — Base de données PostgreSQL avec Neon (GRATUIT pour démarrer)

**Neon** est un PostgreSQL serverless : gratuit jusqu'à 10 Go, scale automatique.

1. Allez sur **https://neon.tech** → créer un compte
2. Créer un nouveau projet : `avra-production`
3. Région : `eu-west-1` (Paris / Europe)
4. Copier la **connection string** qui ressemble à :
   ```
   postgresql://avra_user:motdepasse@ep-xxx-xxx.eu-west-1.aws.neon.tech/avradb?sslmode=require
   ```
5. Garder cette URL pour l'étape suivante

---

## Étape 2 — Backend NestJS avec Railway

**Railway** déploie votre API depuis le Dockerfile automatiquement.

1. Allez sur **https://railway.app** → créer un compte
2. Nouveau projet → **Deploy from GitHub repo**
3. Connectez votre repo GitHub AVRA
4. Railway détecte le `Dockerfile` dans `apps/api/`
5. Configurez les variables d'environnement dans Railway (Settings → Variables) :

```
DATABASE_URL        = [url Neon de l'étape 1]
JWT_SECRET          = [générer: openssl rand -base64 64]
JWT_REFRESH_SECRET  = [générer: openssl rand -base64 64]
JWT_EXPIRES_IN      = 7d
JWT_REFRESH_EXPIRES_IN = 30d
API_URL             = https://api.avra.fr
WEB_URL             = https://app.avra.fr
NODE_ENV            = production
PORT                = 3001
```

6. Domaine custom : Settings → Networking → Add custom domain → `api.avra.fr`
7. Après le premier déploiement, lancer la migration :
   ```bash
   railway run npx prisma migrate deploy
   ```

---

## Étape 3 — Frontend Next.js avec Vercel

**Vercel** est la plateforme officielle de Next.js.

1. Allez sur **https://vercel.com** → créer un compte
2. **Import Project** → connecter GitHub → sélectionner le repo AVRA
3. Configuration du projet :
   - **Framework Preset** : Next.js
   - **Root Directory** : `apps/web`
   - **Build Command** : `cd ../.. && pnpm --filter @avra/web build`
   - **Install Command** : `cd ../.. && pnpm install`
4. Variables d'environnement Vercel :
   ```
   NEXT_PUBLIC_API_URL = https://api.avra.fr
   ```
5. Domaine custom : Settings → Domains → `app.avra.fr`

---

## Étape 4 — Landing page avec Vercel Static

1. Dans le même compte Vercel, créer un **deuxième projet**
2. Root Directory : `apps/landing`
3. Framework : **Other** (site statique)
4. Build Command : laisser vide
5. Output Directory : `.` (racine)
6. Domaine custom : `www.avra.fr`

---

## Étape 5 — Nom de domaine avra.fr

1. Acheter `avra.fr` sur OVH / Namecheap / Gandi (~10€/an)
2. Configurer les DNS :
   ```
   Type   Nom    Valeur
   CNAME  www    cname.vercel-dns.com
   CNAME  app    cname.vercel-dns.com
   CNAME  api    [domaine Railway fourni]
   ```

---

## Étape 6 — Seed de production (optionnel)

Après le déploiement, créer le compte admin :
```bash
railway run npx tsx prisma/seed-demo.ts
```

---

## Récapitulatif des URLs

| Service     | URL                  | Plateforme |
|-------------|----------------------|------------|
| Landing     | https://www.avra.fr  | Vercel     |
| Dashboard   | https://app.avra.fr  | Vercel     |
| API         | https://api.avra.fr  | Railway    |
| Base de données | (interne)        | Neon       |

---

## Coûts mensuels estimés

| Service  | Plan          | Coût/mois |
|----------|---------------|-----------|
| Vercel   | Hobby (gratuit) | 0 €     |
| Railway  | Starter       | ~5 €      |
| Neon     | Free tier     | 0 €       |
| Domaine  | (annuel/12)   | ~1 €      |
| **Total**|               | **~6 €/mois** |

> Pour la production avec trafic réel, prévoir Vercel Pro (20€) + Railway Pro (20€) = ~40€/mois.

---

## Variables à ne JAMAIS committer

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL` (contient le mot de passe)
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`

Ces variables doivent être saisies **directement dans l'interface Railway / Vercel**, jamais dans un fichier `.env` pushé sur GitHub.
