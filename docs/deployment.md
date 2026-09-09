# Deploiement initial

Cette procedure cible un VPS Linux avec Docker Compose. L'application est composee de PostgreSQL, Redis, l'API, le frontend et trois workers. PostgreSQL et Redis ne sont jamais exposes publiquement.

## 1. Prerequis

- Docker Engine et Docker Compose plugin ;
- un nom de domaine pointe vers le VPS ;
- un reverse proxy TLS devant `127.0.0.1:8080` (Caddy, Nginx ou Traefik) ;
- un fichier `.env` prive, non versionne.

## 2. Variables de production

Copiez `.env.example` vers `.env`, puis remplacez au minimum :

```env
POSTGRES_USER=orbis
POSTGRES_PASSWORD=<mot-de-passe-long-et-aleatoire>
POSTGRES_DB=orbis_fidei
PUBLIC_ORIGIN=https://example.org
PUBLIC_API_URL=https://api.example.org
JWT_ACCESS_SECRET=<au-moins-32-caracteres-aleatoires>
JWT_REFRESH_SECRET=<autre-secret-aleatoire-de-32-caracteres>
AI_PROVIDER=openai
AI_API_KEY=<cle-api-secrete>
AI_MODEL=gpt-4o-mini
```

Generez chaque secret avec `openssl rand -base64 48`. Ne mettez jamais ce fichier dans Git ni dans le frontend.

## 3. Migration et lancement

Sur le VPS, depuis la racine du depot :

```bash
# Construit et demarre tous les services.
docker compose -f docker-compose.prod.yml up -d --build

# Applique les migrations Prisma avant de servir les premieres requetes.
docker compose -f docker-compose.prod.yml exec api \
  /app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
```

Verifiez ensuite :

```bash
docker compose -f docker-compose.prod.yml ps
curl --fail http://127.0.0.1:8080/
```

L'API et le frontend sont disponibles uniquement en boucle locale sur `127.0.0.1:3001` et `127.0.0.1:8080`. Configurez le reverse proxy vers ces deux adresses. PostgreSQL et Redis ne sont pas exposes.

## 4. Reverse proxy et TLS

Le reverse proxy doit :

- terminer TLS et rediriger HTTP vers HTTPS ;
- proxyfier le frontend vers `127.0.0.1:8080` ;
- proxyfier l'API vers le service Docker `api:3001` ;
- ajouter les en-tetes `X-Forwarded-For` et `X-Forwarded-Proto` ;
- limiter la taille des corps de requete et les connexions lentes.

Conservez `PUBLIC_ORIGIN` et `PUBLIC_API_URL` strictement sur les URL HTTPS finales. La CSP et CORS les utilisent.

## 5. Sauvegardes

Effectuez chaque jour une sauvegarde hors du VPS :

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backup-$(date +%F).sql.gz"
```

Testez periodiquement une restauration sur une base vide. Les volumes Docker seuls ne constituent pas une strategie de backup.

## 6. Mise a jour

```bash
git pull --ff-only
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm api \
  /app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
docker compose -f docker-compose.prod.yml up -d
pnpm audit --audit-level=high
```

Surveillez les logs des workers apres chaque mise a jour :

```bash
docker compose -f docker-compose.prod.yml logs -f aggregator analyzer translator
```

## Limites connues avant ouverture publique

- Les deux vulnerabilites moderees signalees par `pnpm audit` doivent etre suivies a chaque mise a jour.
- Il faut encore une supervision externe (uptime, CPU/memoire, erreurs et espace disque).
- Les traductions generees par IA doivent etre relues avant toute publication editoriale.
