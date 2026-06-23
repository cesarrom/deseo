FROM node:24.16-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY packages/config/package.json          ./packages/config/
COPY apps/connector-github-cms/package.json    ./apps/connector-github-cms/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/connector-sdk/   ./packages/connector-sdk/
COPY packages/config/          ./packages/config/
COPY apps/connector-github-cms/    ./apps/connector-github-cms/
RUN pnpm --filter @deseo/connector-github-cms build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY apps/connector-github-cms/package.json    ./apps/connector-github-cms/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/connector-github-cms/dist ./apps/connector-github-cms/dist

WORKDIR /app/apps/connector-github-cms
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
