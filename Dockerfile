# ============================================================
# Base – shared pnpm setup
# ============================================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

# Copy manifests only (layer-cache friendly)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# ============================================================
# Deps – install ALL workspace dependencies once
# ============================================================
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================
# API builder (NestJS)
# ============================================================
FROM deps AS api-builder
COPY apps/api ./apps/api
RUN pnpm --filter api build

# ============================================================
# API runtime
# ============================================================
FROM node:22-alpine AS api
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter api

# Copy only the compiled output
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 9877
CMD ["node", "dist/main.js"]

# ============================================================
# Web builder (Nuxt)
# ============================================================
FROM deps AS web-builder
COPY apps/web ./apps/web
RUN pnpm --filter web build

# ============================================================
# Web runtime (Nuxt – Node server preset)
# ============================================================
FROM node:22-alpine AS web
ENV NODE_ENV=production
ENV PORT=9877

WORKDIR /app

# Nuxt's .output is fully self-contained (no node_modules needed)
COPY --from=web-builder /app/apps/web/.output ./

EXPOSE 9876
CMD ["node", "server/index.mjs"]