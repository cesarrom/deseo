# Deseo - AI-Powered SEO Platform

Comprehensive SEO automation platform with AI-powered content generation, repository optimization, and multi-CMS integration.

## Features

- 🤖 **AI Article Generation**: Transform any input into SEO-optimized content
- 🔧 **Repository SEO Optimization**: Automated PRs for frontend SEO improvements
- 🔍 **Keyword Research**: Google Search Console integration
- 📝 **Multi-CMS Publishing**: Strapi, WordPress, Payload support
- 🏢 **Per-Client Isolation**: Dedicated Payload CMS instances

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Node.js/TypeScript + tRPC
- **Frontend**: Next.js 16 + React + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenRouter via Vercel AI SDK
- **Jobs**: Temporal.io
- **Deployment**: Docker + Dokploy

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in credentials
3. Start services:
```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

4. Install dependencies:
```bash
pnpm install
```

5. Run migrations:
```bash
pnpm --filter @deseo/db db:migrate
```

6. Start development:
```bash
pnpm dev
```

## Project Structure

```
deseo/
├── apps/           # Applications (web, api, worker)
├── packages/       # Shared packages (ui, db, ai, integrations)
├── services/       # Payload CMS templates
├── docker/         # Docker Compose files
└── temporal/       # Temporal workflows
```

## Documentation

- See `.agent/rules/` for AI agent guidelines
- See `AGENTS.md` for development conventions
- See `initial_plan.md` for complete roadmap

## License

MIT
