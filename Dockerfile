# ─────────────────────────────────────────────────────────────────
# Tetragram — Production Dockerfile
# Monorepo: apps/api (NestJS/Fastify) + apps/web (Nuxt 4)
#
# Build targets:
#   docker build --target api -t tetragram-api .
#   docker build --target web -t tetragram-web .
#   docker build -t tetragram .          ← combined (default)
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: base ─────────────────────────────────────────────────
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

# ── Stage 2: install ──────────────────────────────────────────────
# Copy manifests only first so this layer is cached independently
# from source changes.
FROM base AS install

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 3: build API ────────────────────────────────────────────
FROM install AS build-api

COPY apps/api ./apps/api

# Produces apps/api/dist/
RUN pnpm --filter api build

# ── Stage 4: build Web ────────────────────────────────────────────
FROM install AS build-web

COPY apps/web ./apps/web

# Produces apps/web/.output/
RUN pnpm --filter web build

# ── Stage 5: production API image ─────────────────────────────────
FROM node:22-alpine AS api

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=build-api /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]

# ── Stage 6: production Web image ─────────────────────────────────
FROM node:22-alpine AS web

WORKDIR /app

# Nuxt standalone output bundles its own dependencies
COPY --from=build-web /app/apps/web/.output ./

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

EXPOSE 3000

CMD ["node", "server/index.mjs"]

# ── Stage 7: combined image ────────────────────────────────────────
FROM node:22-alpine AS combined

RUN apk add --no-cache supervisor \
    && corepack enable \
    && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

# API production deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prod

# API build output
COPY --from=build-api /app/apps/api/dist ./apps/api/dist

# Web standalone output
COPY --from=build-web /app/apps/web/.output ./apps/web/.output

# Supervisor config
RUN mkdir -p /etc/supervisor/conf.d && cat > /etc/supervisor/conf.d/tetragram.conf << 'SUPERVISORD'
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

[program:api]
command=node /app/apps/api/dist/main
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production"

[program:web]
command=node /app/apps/web/.output/server/index.mjs
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production",NITRO_HOST="0.0.0.0",NITRO_PORT="3000"
SUPERVISORD

ENV NODE_ENV=production

EXPOSE 3000 9876

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/tetragram.conf"]