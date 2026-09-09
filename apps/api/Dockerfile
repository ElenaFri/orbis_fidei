FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @orbis-fidei/database generate && pnpm --filter @orbis-fidei/api build

FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S orbis && adduser -S orbis -G orbis
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages
USER orbis
EXPOSE 3001
CMD ["node", "--import", "tsx", "apps/api/src/main.ts"]
