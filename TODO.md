# TODO — Orbis Fidei

> Feuille de route incrémentale pour aboutir à une **première version vierge** du site
> (squelette qui démarre, sans logique métier) puis à un **MVP fonctionnel**.

Convention :

- `[ ]` à faire
- `[~]` en cours
- `[x]` fait
- `[?]` à décider / à valider avec l'équipe

---

## Choix techniques retenus (v0)

Ces choix suivent l'architecture proposée dans le cahier des charges (monolithe modulaire + workers).

- **Monorepo** — pnpm workspaces (rapide, léger, natif TS)
- **Frontend** — Vue 3 + Vite + TypeScript (conforme au cahier des charges)
- **Routing / state / i18n** — Vue Router + Pinia + vue-i18n
- **Backend** — Node.js + TypeScript + Fastify (performant, typé, plus léger qu'Express)
- **ORM / DB** — Prisma + PostgreSQL 16 (déjà maîtrisé, cf. projet Jabble)
- **Queue** — BullMQ + Redis 7 (standard Node.js pour jobs asynchrones)
- **Validation** — Zod (partagé backend / frontend via `packages/validation`)
- **Auth** — JWT + refresh tokens (cookies httpOnly) — `[?]` à confirmer
- **Tests** — Vitest (même runner front + back)
- **Lint / format** — ESLint + Prettier (config partagée)
- **Conteneurisation dev** — Docker Compose (Postgres + Redis)
- **CI** — GitHub Actions (lint + type-check + tests + build)

Points à trancher : `[?]` framework CSS (Tailwind ? UnoCSS ? design system maison ?), `[?]` fournisseur IA
pour l'analyse et la traduction (OpenAI, Mistral, Anthropic, modèle local ?).

---

## Phase 0 — Fondations du dépôt

Objectif : le repo est prêt à accueillir du code, tout démarre en local.

- [x] `package.json` racine + `pnpm-workspace.yaml`
- [x] `tsconfig.base.json` partagé
- [x] `.editorconfig`
- [x] `.gitignore` (Node, IDE, env)
- [x] `.env.example` racine
- [x] `.prettierrc` + `.prettierignore`
- [x] ESLint config partagée (`eslint.config.mjs`)
- [x] `docker-compose.yml` : PostgreSQL + Redis + volumes persistants
- [x] Script `pnpm dev` qui lance API + Web en parallèle
- [x] Documentation minimale d'onboarding dans le README

---

## Phase 1 — Base de données (`packages/database`)

Objectif : schéma initial, migrations, client Prisma partagé.

- [x] Init Prisma (`schema.prisma`, URL via `prisma.config.ts`)
- [x] Génération du client Prisma exporté depuis le package
- [x] Entités noyau (v0, tables vides mais schéma versionné) :
  - [x] `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
  - [x] `Source`, `SourceItem`
  - [x] `ArticleProposal`
  - [x] `Article`, `ArticleTranslation`
  - [x] `Category`, `Tag`, `ArticleCategory`, `ArticleTag`
  - [x] `Comment` (auto-référençant pour le nesting)
  - [x] `EditorialAction` (audit trail)
  - [x] `AggregationJob`, `TranslationJob`
- [x] Enums : `Language`, `ArticleStatus`, `TranslationStatus`, `CommentStatus`, `ProposalStatus`, `SourceType`, `SourceStatus`
- [x] Première migration `init` (à générer après `pnpm install`)
- [~] Seeds : permissions + rôles + catégories par défaut faits ; admin de dev à ajouter
- [x] Scripts npm : `db:migrate`, `db:reset`, `db:seed`, `db:studio`

---

## Phase 2 — Backend API (`apps/api`)

Objectif : API Fastify qui démarre, expose `/health`, structure par domaine.

### 2.1 Squelette

- [x] `apps/api/package.json`, `tsconfig.json`
- [x] Bootstrap Fastify + logger Pino
- [x] Middleware : CORS, helmet, rate-limit, body-parser JSON (natif Fastify)
- [x] Endpoint `GET /health` → `{ status: "ok", db: bool, redis: bool }`
- [x] Chargement de la configuration via Zod (fail-fast si invalide)
- [~] Structure `src/<domaine>/` : `health/`, `auth/` créés ; reste : `users/`, `roles/`, `articles/`, `translations/`, `sources/`, `comments/`, `moderation/`, `categories/`, `jobs/`
- [x] Convention par domaine : `routes.ts`, `service.ts`, `schemas.ts` (via `@orbis-fidei/validation`), `*.test.ts` (appliquée sur `auth/`)

### 2.2 Auth & RBAC

- [x] Endpoints `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [x] Hash Argon2id des mots de passe (`@node-rs/argon2`)
- [x] JWT signés (access + refresh) + refresh token en cookie httpOnly SameSite=Lax
- [x] Décorateur / hook Fastify `requirePermission("article.publish")` (+ `requireAuth`)
- [x] Endpoint `GET /me`
- [x] Révocation globale des refresh tokens via `tokenVersion` (migration `add_user_token_version`)
- [x] Seed : utilisateur admin de dev (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)

### 2.3 Domaines métier (CRUD minimaux)

- [ ] Sources : CRUD admin
- [ ] Catégories / tags : CRUD admin
- [ ] Articles (lecture publique + admin) :
  - [ ] `GET /articles?lang=fr&page=…` liste publique paginée
  - [ ] `GET /articles/:slug` détail public (langue courante)
  - [ ] `GET /admin/articles` liste admin (tous statuts)
  - [ ] `POST /admin/articles` création manuelle
  - [ ] `PATCH /admin/articles/:id` édition
  - [ ] `POST /admin/articles/:id/publish` transition d'état
- [ ] Propositions : `GET /admin/proposals`, `POST /admin/proposals/:id/accept|reject`
- [ ] Commentaires : `GET /articles/:id/comments`, `POST /articles/:id/comments`, `POST /comments/:id/report`
- [ ] Modération commentaires : `PATCH /admin/comments/:id` (`hide`, `delete`)

### 2.4 Historique éditorial

- [ ] Service `editorialAction.record(action, articleId, userId, metadata)`
- [ ] Journalisation systématique aux transitions d'état

---

## Phase 3 — Frontend (`apps/web`)

Objectif : SPA Vue qui démarre, deux espaces (public + admin), i18n FR/EN/RU.

### 3.1 Squelette

- [x] `apps/web/package.json`, `vite.config.ts`, `tsconfig.json`
- [x] Vue 3 + Vue Router + Pinia
- [ ] Client API typé (fetch wrapper + gestion 401/refresh)
- [x] `vue-i18n` avec dossiers `i18n/{fr,en,ru}/`
- [~] Sélecteur de langue persistant (localStorage OK ; query param à ajouter)
- [x] Détection langue navigateur au premier chargement

### 3.2 Espace public

- [x] Layout public (header, footer, sélecteur de langue)
- [ ] Page **Accueil / Actualités** : liste compacte + dépliage inline
- [ ] Composant `ArticleCard` (repliée ↔ dépliée)
- [ ] Rendu clair : `title` / `summary` / `analysis` / `source`
- [ ] Page **Article** (route dédiée pour le partage) `/a/:slug`
- [ ] Page **Recherche** avec filtres (langue, date, pays, catégorie, source, tags)
- [ ] Page **Catégories** / listing par catégorie
- [ ] Pages **Login / Register**

### 3.3 Espace admin (routes protégées)

- [ ] Garde de route : redirection si non authentifié / non autorisé
- [ ] Layout admin (sidebar filtrée par permissions)
- [ ] `/admin/suggestions` : file des propositions
- [ ] `/admin/articles` : liste + édition
- [ ] `/admin/translations` : traductions à relire
- [ ] `/admin/comments` : modération
- [ ] `/admin/sources` : CRUD sources
- [ ] `/admin/users` : gestion utilisateurs / rôles

### 3.4 Commentaires

- [ ] Composant `CommentThread` (imbrication)
- [ ] Formulaire de réponse
- [ ] Signalement + modification / suppression de ses propres commentaires

---

## Phase 4 — Workers (`workers/*`)

Objectif : jobs asynchrones découplés du backend via BullMQ.

### 4.1 Infrastructure commune

- [x] `packages/queue` : helpers BullMQ (création de queues, workers, connexions Redis)
- [~] Convention `Job` : queues nommées définies (`AGGREGATION`, `ANALYSIS`, `TRANSLATION`) ; typage payloads à formaliser

### 4.2 `workers/aggregator`

- [ ] Cron : parcourt les `Source` actives
- [ ] Récupération RSS / Atom (avec ETag / Last-Modified)
- [ ] Insertion `SourceItem` (déduplication sur URL + hash contenu)
- [ ] Enqueue `analyze` pour chaque nouvel item

### 4.3 `workers/analyzer`

- [ ] Détection langue (`franc` ou équivalent)
- [ ] Classification catégorie (règles simples puis IA)
- [ ] Détection doublons / similarité (embedding + seuil)
- [ ] Génération résumé (via provider IA abstrait)
- [ ] Création d'un `ArticleProposal`

### 4.4 `workers/translator`

- [ ] Déclenché à `Article.APPROVED`
- [ ] Un job par langue cible (EN, RU)
- [ ] Traduction `title` / `summary` / `analysis`
- [ ] `ArticleTranslation.status = TRANSLATED` (relecture humaine requise)

### 4.5 Abstraction fournisseur IA

- [ ] Interface `AIProvider` (summarize, translate, classify, embed)
- [ ] Implémentation par défaut + config via `.env`
- [ ] Rate-limit + retry exponentiel côté worker

---

## Phase 5 — Packages partagés (`packages/*`)

- [x] `packages/types` : types TS partagés (DTO API, enums métier)
- [x] `packages/validation` : schémas Zod partagés (auth, article, commentaire…)
- [x] `packages/config` : chargement / validation de la config (Zod)
- [x] `packages/queue` : couche BullMQ
- [x] `packages/database` : voir Phase 1

---

## Phase 6 — Sécurité

- [ ] Rate-limit global + strict sur `/auth/*`
- [ ] Helmet + CSP
- [ ] Cookies `httpOnly`, `secure`, `SameSite=Lax`
- [ ] Validation Zod stricte à toutes les frontières
- [ ] Sanitization du HTML des commentaires (allowlist)
- [ ] Secrets **jamais** exposés au frontend
- [ ] Audit `pnpm audit` en CI
- [ ] Journalisation des actions sensibles

---

## Phase 7 — Qualité & CI

- [~] Tests unitaires : Vitest configuré ; tests d'amorçage sur `packages/validation`, `packages/config`, `apps/api` (health). Couverture à étendre au fil des features.
- [~] Tests d'intégration API : `GET /health` couvert via `app.inject()`. Reste : auth, articles, commentaires (à faire au fil des phases).
- [ ] Tests e2e minimaux (Playwright) sur les parcours publics
- [x] GitHub Actions : lint + type-check + tests + build sur PR (`.github/workflows/ci.yml`)
- [x] Vérification des migrations en CI (Prisma `validate` + `format --check`)
- [x] Hooks pre-commit (Husky + lint-staged) — Prettier + ESLint --fix sur les fichiers stagés

---

## Phase 8 — Documentation (`docs/`)

- [ ] `docs/architecture/` : diagrammes (Mermaid) + décisions (ADR)
- [ ] `docs/api/` : OpenAPI générée depuis Fastify
- [ ] `docs/editorial/` : workflow, rôles, permissions
- [ ] Guide contributeur dans le README

---

## Phase 9 — Déploiement (à définir)

- [ ] `[?]` cible d'hébergement (VPS, PaaS, Kubernetes)
- [ ] Dockerfile de production pour `api` et `web`
- [ ] Stratégie de migration Prisma en prod
- [ ] Reverse proxy + TLS
- [ ] Backups PostgreSQL
- [ ] Monitoring (logs + métriques)

---

## Jalons

- **M0 — Site vierge qui démarre** ✅ _code en place_ — reste à exécuter en local : `pnpm install`, `pnpm docker:up`, `pnpm db:migrate`, `pnpm dev`.
- **M1 — Authentification & RBAC** ✅ _API backend_ : register/login/refresh/logout, `GET /me`, `requirePermission`, seed admin. Reste côté frontend : garde de route + pages login/register (Phase 3.2/3.3).
- **M2 — Backoffice minimal** _(prochaine cible)_ : gestion des sources, des catégories, création manuelle d'article.
- **M3 — Interface publique** : liste d'articles + article détaillé + commentaires + i18n.
- **M4 — Agrégation RSS** : worker aggregator + propositions dans le back-office.
- **M5 — IA (résumé + classification + doublons)** : worker analyzer.
- **M6 — Traduction automatique** : worker translator + relecture.
- **M7 — MVP livrable** : tous les critères de la section 20 du cahier des charges.
