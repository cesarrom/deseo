FROM node:24-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ai/package.json      ./packages/ai/
COPY packages/ast/package.json     ./packages/ast/
COPY packages/db/package.json      ./packages/db/
COPY packages/types/package.json   ./packages/types/
COPY packages/config/package.json  ./packages/config/
COPY apps/worker/package.json      ./apps/worker/
COPY temporal/package.json         ./temporal/
# All deps needed — typescript is required by Temporal's workflow webpack bundler at startup
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ai/      ./packages/ai/
COPY packages/ast/     ./packages/ast/
COPY packages/db/      ./packages/db/
COPY packages/types/   ./packages/types/
COPY packages/config/  ./packages/config/
COPY apps/worker/      ./apps/worker/
COPY temporal/         ./temporal/
RUN pnpm --filter @deseo/worker build

# ── Runtime ───────────────────────────────────────────────────────────────────
# Keep all deps (including devDeps) so Temporal can webpack-compile workflow TS at startup
FROM deps AS runner
COPY packages/ai/      ./packages/ai/
COPY packages/ast/     ./packages/ast/
COPY packages/db/      ./packages/db/
COPY packages/types/   ./packages/types/
COPY packages/config/  ./packages/config/
COPY apps/worker/      ./apps/worker/
COPY temporal/         ./temporal/
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
