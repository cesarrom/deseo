# Project Architecture

## Monorepo Structure
- **pnpm workspaces + Turborepo**: All packages in single repo
- **apps/**: Next.js frontend, API server, Temporal workers
- **packages/**: Shared code (ui, db, ai, integrations, ast, types)
- **services/**: Payload CMS templates for clients

## Tech Stack
- **Backend**: Node.js/TypeScript + tRPC
- **Frontend**: Next.js 16 + React + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM + Redis
- **AI**: OpenRouter via Vercel AI SDK
- **Jobs**: Temporal.io for durable workflows
- **Deployment**: Docker + Dokploy

## Key Principles
- Type-safe APIs (tRPC)
- Monorepo for shared code
- Per-client Payload CMS instances (isolated)
- CMS-agnostic AST format for articles
