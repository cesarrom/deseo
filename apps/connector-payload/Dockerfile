FROM node:24-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY packages/ast/package.json             ./packages/ast/
COPY packages/types/package.json           ./packages/types/
COPY packages/config/package.json          ./packages/config/
COPY apps/connector-payload/package.json   ./apps/connector-payload/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/connector-sdk/   ./packages/connector-sdk/
COPY packages/ast/             ./packages/ast/
COPY packages/types/           ./packages/types/
COPY packages/config/          ./packages/config/
COPY apps/connector-payload/   ./apps/connector-payload/
RUN pnpm --filter @deseo/connector-payload build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/connector-sdk/package.json   ./packages/connector-sdk/
COPY packages/ast/package.json             ./packages/ast/
COPY packages/types/package.json           ./packages/types/
COPY apps/connector-payload/package.json   ./apps/connector-payload/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/connector-payload/dist ./apps/connector-payload/dist

WORKDIR /app/apps/connector-payload
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
