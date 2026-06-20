FROM node:24-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY packages/config/package.json          ./packages/config/
COPY apps/connector-github/package.json    ./apps/connector-github/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/connector-sdk/   ./packages/connector-sdk/
COPY packages/config/          ./packages/config/
COPY apps/connector-github/    ./apps/connector-github/
RUN pnpm --filter @deseo/connector-github build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY apps/connector-github/package.json    ./apps/connector-github/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/connector-github/dist ./apps/connector-github/dist

WORKDIR /app/apps/connector-github
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
