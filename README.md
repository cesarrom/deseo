# Deseo

An SEO automation platform for agencies and developers. Deseo turns any input into SEO-optimized articles with AI, researches keywords from Google Search Console, publishes to the client's CMS, and can open pull requests that improve a frontend repository's SEO. Each capability is a **connector**: a small standalone service that registers itself with the platform, so features can be added or removed per client.

## Features

- **AI article generation**: transform a brief, URL or notes into an article stored as a typed AST (`@deseo/ast`), with generation running as durable Temporal workflows
- **Repository SEO optimization**: the GitHub connector analyzes a frontend repository and opens pull requests with SEO fixes
- **Keyword research**: the Google Search Console connector pulls queries and performance data
- **Multi-CMS publishing**: connectors for Payload CMS and for CMS content kept in a GitHub repository (`connector-github-cms`)
- **Per-client isolation**: clients are separate records, and a client can have a dedicated Payload CMS instance
- **Connector marketplace**: a public marketplace and a dashboard section to browse, install and configure connectors, plus a developer area for building your own
- **Dashboard**: clients, products, articles, jobs, intelligence and settings pages in the web app

## Architecture

pnpm workspaces + Turborepo monorepo.

```
apps/
  web/                    Next.js dashboard and marketplace
  api/                    HTTP API
  worker/                 Temporal worker that runs the long-running jobs
  mobile/                 Expo app
  connector-github/       GitHub repository SEO connector
  connector-github-cms/   GitHub-backed CMS publishing connector
  connector-gsc/          Google Search Console connector
  connector-payload/      Payload CMS connector
  connector-mock/         Mock connector for development and tests
  test-payload/           Payload CMS app used for integration tests
packages/
  ai/ ast/ types/         generation helpers, article AST, shared types
  db/                     Drizzle ORM schema and migrations
  connector-sdk/          what a connector implements to register with the platform
  integrations/           third-party integrations
  api-client/ cli/        typed API client and a command-line tool
  ui/ config/             shared components and ESLint/TypeScript config
temporal/                 workflows and activities
docker/                   Compose files, Caddyfile and migration scripts
```

Each connector ships a `deseo.config.json` (name, slug, type, base URL, configuration page, port) and a `register` script that announces it to the platform.

## Built with

TypeScript · Next.js 16 · React · Tailwind CSS · shadcn/ui · Node.js · PostgreSQL + Drizzle ORM · Redis · Temporal · OpenRouter via the Vercel AI SDK · Payload CMS · Expo · Docker + Caddy (deployed with Dokploy) · pnpm + Turborepo

## Running it locally

You need Node.js 20+, pnpm 10 and Docker.

```bash
pnpm install
cp .env.example .env                                    # then fill in the values
docker compose -f docker/docker-compose.dev.yml up -d   # PostgreSQL, Redis, Temporal (+ UI)
pnpm --filter @deseo/db db:migrate
pnpm dev                                                # turbo runs all apps
```

Local services: PostgreSQL on `localhost:5432`, Redis on `6379`, Temporal on `7233` and its UI on `http://localhost:8080`. See [`docker/README.md`](docker/README.md) and [`QUICKSTART.md`](QUICKSTART.md) for details.

Environment variables (see `.env.example`): `DATABASE_URL`, `REDIS_URL`, `TEMPORAL_URL`, `OPENROUTER_API_KEY`, GitHub / GitLab / Google OAuth client IDs and secrets, `DOKPLOY_API_URL` / `DOKPLOY_API_KEY`, `NEXTAUTH_URL`, and `GITHUB_APP_PRIVATE_KEY_BASE64` (the GitHub App key used by the GitHub connectors; the `.pem` file is never committed). `DATABASE_ADMIN_URL` is optional and enables a one-time database grant at API start. Each connector has its own `.env.example`.

Other root scripts: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm db:generate`, `pnpm clean`.

## Documentation

- [`AGENTS.md`](AGENTS.md) and `.agent/rules/`: development conventions (also used by AI coding agents)
- [`initial_plan.md`](initial_plan.md): the original roadmap; [`STRATEGY.md`](STRATEGY.md): product strategy
- [`PROGRESS.md`](PROGRESS.md), [`TASK_LOG.md`](TASK_LOG.md), [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md): what has been built so far

## Status

Active development; last worked on in June 2026. The foundation, connector architecture, marketplace and the GitHub, Search Console and Payload connectors are in place. Remaining work is tracked in `PROGRESS.md` and `TASK_LOG.md`.

## License

[MIT](LICENSE)
