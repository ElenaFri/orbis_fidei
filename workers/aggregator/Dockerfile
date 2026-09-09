FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && addgroup -S orbis && adduser -S orbis -G orbis
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY workers/aggregator/package.json workers/aggregator/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/queue/package.json packages/queue/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY workers/aggregator workers/aggregator
COPY packages packages
RUN pnpm --filter @orbis-fidei/database generate
USER orbis
CMD ["node", "--import", "tsx", "workers/aggregator/src/main.ts"]
