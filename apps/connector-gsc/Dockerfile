FROM node:24.16-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY packages/config/package.json          ./packages/config/
COPY apps/connector-gsc/package.json       ./apps/connector-gsc/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/connector-sdk/   ./packages/connector-sdk/
COPY packages/config/          ./packages/config/
COPY apps/connector-gsc/       ./apps/connector-gsc/
RUN pnpm --filter @deseo/connector-gsc build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY apps/connector-gsc/package.json       ./apps/connector-gsc/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/connector-gsc/dist ./apps/connector-gsc/dist

WORKDIR /app/apps/connector-gsc
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
