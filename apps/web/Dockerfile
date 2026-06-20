FROM node:24-alpine AS base
RUN corepack enable pnpm

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/
COPY packages/db/package.json      ./packages/db/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/config/package.json  ./packages/config/
COPY apps/web/package.json         ./apps/web/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/types/   ./packages/types/
COPY packages/db/      ./packages/db/
COPY packages/ui/      ./packages/ui/
COPY packages/config/  ./packages/config/
COPY apps/web/         ./apps/web/
# NEXT_PUBLIC_* vars baked into the bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @deseo/web build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public

USER nextjs
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
