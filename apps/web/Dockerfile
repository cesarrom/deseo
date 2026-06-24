FROM node:24.16-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/
COPY packages/db/package.json          ./packages/db/
COPY packages/ui/package.json          ./packages/ui/
COPY packages/config/package.json      ./packages/config/
COPY packages/api-client/package.json  ./packages/api-client/
COPY packages/ai/package.json          ./packages/ai/
COPY packages/ast/package.json         ./packages/ast/
COPY apps/api/package.json             ./apps/api/
COPY apps/web/package.json             ./apps/web/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/types/       ./packages/types/
COPY packages/db/          ./packages/db/
COPY packages/ui/          ./packages/ui/
COPY packages/config/      ./packages/config/
COPY packages/api-client/  ./packages/api-client/
COPY packages/ai/          ./packages/ai/
COPY packages/ast/         ./packages/ast/
COPY apps/api/             ./apps/api/
COPY apps/web/             ./apps/web/
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN mkdir -p ./apps/web/public
RUN pnpm --filter @deseo/web build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
# Reinstall prod deps so pnpm workspace symlinks are set up correctly
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/
COPY packages/db/package.json          ./packages/db/
COPY packages/ui/package.json          ./packages/ui/
COPY packages/config/package.json      ./packages/config/
COPY packages/api-client/package.json  ./packages/api-client/
COPY packages/ai/package.json          ./packages/ai/
COPY packages/ast/package.json         ./packages/ast/
COPY apps/api/package.json             ./apps/api/
COPY apps/web/package.json             ./apps/web/
RUN pnpm install --frozen-lockfile --prod
# Workspace package sources (pnpm symlinks point into these)
COPY --from=builder /app/packages/types/ ./packages/types/
COPY --from=builder /app/packages/db/    ./packages/db/
COPY --from=builder /app/packages/ui/    ./packages/ui/
# Built Next.js output and config
COPY --from=builder /app/apps/web/.next        ./apps/web/.next
COPY --from=builder /app/apps/web/public       ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts

WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
