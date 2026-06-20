FROM node:24-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ai/package.json      ./packages/ai/
COPY packages/ast/package.json     ./packages/ast/
COPY packages/db/package.json      ./packages/db/
COPY packages/types/package.json   ./packages/types/
COPY packages/config/package.json  ./packages/config/
COPY apps/api/package.json         ./apps/api/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ai/      ./packages/ai/
COPY packages/ast/     ./packages/ast/
COPY packages/db/      ./packages/db/
COPY packages/types/   ./packages/types/
COPY packages/config/  ./packages/config/
COPY apps/api/         ./apps/api/
RUN pnpm --filter @deseo/api build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ai/package.json      ./packages/ai/
COPY packages/ast/package.json     ./packages/ast/
COPY packages/db/package.json      ./packages/db/
COPY packages/types/package.json   ./packages/types/
COPY apps/api/package.json         ./apps/api/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
