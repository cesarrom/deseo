# Deseo SEO Platform - Architecture & Implementation Plan

A comprehensive SEO automation platform with AI-powered content generation, repository optimization, and multi-CMS integration, built on a self-hosted infrastructure with per-client isolation.

---

## 📊 IMPLEMENTATION STATUS (Last Updated: 2026-04-12)

### ✅ COMPLETED PHASES
- **Phase 1.0, 1.1, 1.3**: Foundation complete (monorepo, database, Docker, Temporal)
- **Phase 2.1, 2.2**: AI content engine complete (AST format, 5 converters, OpenRouter integration)
- **Phase 4**: Partially complete (Next.js app, basic dashboard, tRPC integration)

### 🚧 IN PROGRESS
- **Phase 4.2**: Dashboard screens (basic version working, needs enhancement)

### ⏸️ NOT STARTED
- **Phase 1.2**: Authentication & Multi-tenancy
- **Phase 1.4**: Dokploy Integration
- **Phase 2.3**: RAG Context System
- **Phase 3**: Repository Optimization (GitHub/GitLab integration)
- **Phase 5**: CMS API Integrations (converters done, APIs not integrated)
- **Phase 6**: Google Search Console
- **Phase 7**: DevOps & Production
- **Phase 8**: Polish & Launch

### 🎯 CORE FUNCTIONALITY STATUS
✅ **Working**: Database, API, AI article generation, Temporal workflows, tRPC client, basic dashboard  
⚠️ **Missing**: Auth, real-time updates, CMS publishing, GitHub integration, GSC integration

---

## Executive Summary

**Architecture Decision**: Monorepo with pnpm workspaces + Turborepo
- **Rationale**: Multiple apps sharing SDKs, design system, and domain logic; frequent cross-cutting changes; need for consistent DX
- **Trade-off**: Requires discipline in boundaries but eliminates integration hell across repos

**Tech Stack Core**:
- **Monorepo**: pnpm workspaces + Turborepo (lightweight, fast caching, minimal ceremony)
- **Backend**: Node.js/TypeScript with tRPC for type-safe APIs
- **Frontend**: Next.js 16 (App Router) + React + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL (primary) + Redis (caching, queues)
- **AI**: OpenRouter via Vercel AI SDK
- **Durable Execution**: Temporal.io (battle-tested, widely adopted, TypeScript SDK)
- **Container Orchestration**: Docker + Dokploy API
- **Per-client CMS**: Payload v3 instances (isolated Docker containers)

---

## Phase 1: Foundation & Core Infrastructure (Weeks 1-3)

### ✅ 1.0 Project Setup - COMPLETE
- ✅ Initialize monorepo structure (pnpm + Turborepo) using mostly cli commands
- ✅ Set up Docker Compose for Dokploy deployment
- ✅ talk via Docker cli to the local postgres service to setup a DB for this project and some credentials
- ✅ Setup drizzle
- ✅ write .agent/rules/{project_architecture, overview, design_system, project_structure, integrations, migrations, deployment, code_practices, documentation}.md so everytime an AI wants to perform a task to make the project grow, we ensure it will have a set of guidelines so the project does not get unmaintainable
- ✅ write AGENTS.md

### ✅ 1.1 Monorepo Initialization - COMPLETE
**Target Directory structure**:
```
deseo/
├── .agent/
│   ├── rules/*.md        # Guidelines for AI agents
├── apps/
│   ├── web/              # Next.js frontend (dashboard, onboarding, article review)
│   ├── api/              # Backend API server (tRPC, REST endpoints)
│   └── worker/           # Temporal workers for long-running jobs
├── packages/
│   ├── ui/               # Shared UI components (shadcn/ui wrapper)
│   ├── db/               # Database schema (Drizzle ORM)
│   ├── ai/               # OpenRouter + Vercel AI SDK wrapper
│   ├── integrations/     # CMS, GitHub, GitLab, GSC adapters
│   ├── ast/              # Article AST format & converters
│   └── types/            # Shared TypeScript types
├── services/
│   └── payload-template/ # Payload v3 template for client instances
├── docker/
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── temporal/
│   └── workflows/        # Temporal workflow definitions
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── AGENTS.md
└── README.md
```

**Key tasks**:
- ✅ Initialize pnpm workspace with TypeScript 5.x
- ✅ Configure Turborepo with dev/build/test/lint pipelines
- ✅ Set up ESLint + Prettier (shared configs in `packages/config`)
- ✅ Configure Docker Compose for local development (Postgres, Redis, Temporal)
- ✅ Set up Drizzle ORM with initial schema (users, clients, articles, jobs)

### ⏸️ 1.2 Authentication & Multi-tenancy - NOT STARTED
- Implement auth with NextAuth.js (GitHub OAuth + email/password)
- Design client isolation model:
  - `clients` table with `slug`, `payload_instance_url`, `payload_api_key`
  - Row-level security for all resources tied to `client_id`
- Create client onboarding flow (collect business info, spawn Payload instance)

### 1.3 Temporal Setup
- Deploy Temporal server (Docker Compose locally, dedicated service in prod)
- Create workflow scaffolding:
  - `generateArticleWorkflow(payload, clientId, targetCMS)`
  - `optimizeSEOWorkflow(repoUrl, commitSha, clientId)`
  - `keywordResearchWorkflow(domain, clientId)`
- Implement worker in `apps/worker` with graceful shutdown

### 1.4 Dokploy Integration
- Research Dokploy API for programmatic deployments
- Create service in `packages/integrations/dokploy` for:
  - Spawning new Payload v3 containers
  - Passing environment variables (DB connection, API keys)
  - Health checks and status monitoring
- Implement fallback to Docker CLI for local dev

---

## Phase 2: Core AI Content Engine (Weeks 4-6)

### ✅ 2.1 Article AST Format - COMPLETE
**Design philosophy**: CMS-agnostic, extensible, human-readable
```typescript
// Example AST structure
interface ArticleAST {
  metadata: {
    title: string;
    slug: string;
    description: string;
    keywords: string[];
    author?: string;
    publishDate?: string;
  };
  content: ContentNode[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage?: string;
    schema?: Record<string, unknown>; // JSON-LD
  };
}

type ContentNode = 
  | HeadingNode 
  | ParagraphNode 
  | ListNode 
  | ImageNode 
  | CodeNode 
  | CalloutNode;
```

**Converters**:
- ✅ AST → Markdown (bidirectional)
- ✅ AST → Strapi rich text
- ✅ AST → Payload blocks
- ✅ AST → WordPress Gutenberg blocks
- ✅ AST → HTML (for preview)

### ✅ 2.2 AI Article Generation - COMPLETE
**Workflow steps**:
1. Accept arbitrary payload (JSON, text, keywords, URL)
2. Fetch client's Payload instance to retrieve RAG context (products, services, company info)
3. Perform keyword research (GSC API integration)
4. Generate article outline (OpenRouter via Vercel AI SDK)
5. Generate sections iteratively with streaming
6. Optimize for SEO (meta tags, schema.org, internal linking suggestions)
7. Store draft in database with status `pending_review`

**OpenRouter model strategy**:
- Use GPT-4o or Claude 3.5 Sonnet for high-quality content
- Allow model selection per client (stored in `clients.ai_model_preference`)
- Implement token tracking for billing/limits

### 2.3 RAG Context System
- Query client's Payload instance via REST API
- Build vector embeddings for client content (use OpenAI embeddings)
- Store vectors in pgvector extension on PostgreSQL
- Retrieve relevant context during article generation

---

## Phase 3: Repository Optimization (Weeks 7-8) - NOT STARTED

### ⏸️ 3.1 GitHub/GitLab Integration - NOT STARTED
**OAuth flow**:
- Add GitHub App integration (read repos, write PRs)
- Add GitLab OAuth app
- Store tokens encrypted in database

**Webhook handling**:
- Listen for `push` events on monitored repos
- Trigger `optimizeSEOWorkflow` via Temporal
- Parse commit diff to identify frontend files (`.tsx`, `.jsx`, `.html`)

### 3.2 SEO Optimization Logic
**Analysis pipeline**:
1. Clone repository to temporary directory
2. Analyze HTML structure:
   - Missing `<title>`, `<meta description>`, Open Graph tags
   - Missing or improper heading hierarchy (`<h1>`, `<h2>`)
   - Images without `alt` attributes
   - Missing schema.org JSON-LD
   - Slow-loading resources (flag for manual review)
3. Generate fixes:
   - Add meta tags to `<head>`
   - Suggest semantic HTML improvements
   - Add structured data
4. Create PR with changes and detailed explanation

**Implementation**:
- Use AST parsing for React/Next.js (Babel parser)
- Use cheerio for HTML parsing
- Generate clean, minimal diffs (no code style changes)

---

## Phase 4: Frontend Dashboard (Weeks 9-11) - IN PROGRESS

### 🚧 4.1 UI/UX Design Principles - PARTIALLY COMPLETE
- ⏸️ Modern, clean interface with shadcn/ui components - NOT DONE
- ⏸️ Lucide icons throughout - NOT DONE
- ✅ TailwindCSS for styling
- ⏸️ Dark mode support - NOT DONE
- ✅ Responsive design (mobile-first)

### 🚧 4.2 Key Screens - PARTIALLY COMPLETE

**Onboarding Flow**:
1. ⏸️ Sign up / Sign in - NOT DONE
2. ⏸️ Connect integration (GitHub/GitLab/CMS) - NOT DONE
3. ⏸️ Configure AI preferences (model, tone, keywords) - NOT DONE
4. ⏸️ Deploy Payload instance (show progress, health checks) - NOT DONE

**Dashboard**:
- 🚧 Overview cards (articles generated, PRs created, keyword rankings) - BASIC VERSION DONE
- ⏸️ Recent activity feed - NOT DONE
- ⏸️ Quick actions (generate article, trigger SEO scan) - NOT DONE

**Keyword Research**:
- ⏸️ ⏸️ Search bar for manual quer - NOT DONEies - NOT DONE
- ⏸️ ⏸️ Table with columns: keyword, volume, difficulty, opportunity sc - NOT DONEore - NOT DONE
- ⏸️ ⏸️ GSC integration to show current ranki - NOT DONEngs - NOT DONE
- ⏸️ ⏸️ Bulk actions (add to content calend - NOT DONEar) - NOT DONE

**Article Management**:
- ⏸️ ⏸️ List view with filters (status, CMS, da - NOT DONEte) - NOT DONE
- ⏸️ ⏸️ Draft editor (rich text preview of A - NOT DONEST) - NOT DONE
- ⏸️ ⏸️ Side-by-side comparison (original payload → generated artic - NOT DONEle) - NOT DONE
- ⏸️ ⏸️ Publish button (triggers push to C - NOT DONEMS) - NOT DONE
- ⏸️ ⏸️ Analytics per article (views, rankings, conversio - NOT DONEns) - NOT DONE

**Repository Monitor**:
- ⏸️ ⏸️ Connected repositories l - NOT DONEist - NOT DONE
- ⏸️ ⏸️ PR history (status, SEO improvements ma - NOT DONEde) - NOT DONE
- ⏸️ ⏸️ Settings (enable/disable auto-optimization, approval requir - NOT DONEed) - NOT DONE

**Metrics & Analytics**:
- ⏸️ ⏸️ Chart.js or Recharts for visualizati - NOT DONEons - NOT DONE
- ⏸️ ⏸️ Compare keyword rankings over t - NOT DONEime - NOT DONE
- ⏸️ ⏸️ Article performance (traffic, engageme - NOT DONEnt) - NOT DONE
- ⏸️ ⏸️ ROI calculator (time saved, traffic gain - NOT DONEed) - NOT DONE

### ⏸️ ⏸️ 4.3 Real-time Upda - NOT STARTEDtes - NOT STARTED
- Use Server-Sent Events or WebSockets for job progress
- Optimistic UI updates for better UX
- Toast notifications for job completions

---

## Phase 5: CMS Integrations (Weeks 12-14)

### 5.1 Strapi Integration
- Create plugin: `@deseo/strapi-publisher`
- Use Strapi REST API to create/update entries
- Map AST to Strapi content types (dynamic mapping based on content type schema)

### 5.2 WordPress Integration
- Use WordPress REST API (Application Password auth)
- Convert AST to Gutenberg blocks JSON
- Support custom post types
- Handle featured images, categories, tags

### 5.3 Payload CMS Integration
- Direct API calls to client's Payload instance
- Use Payload's flexible schema to map AST nodes
- Support Payload's block-based editor

### 5.4 Generic CMS Adapter
- Define interface for custom CMS integrations
- Allow clients to implement adapters via plugin system
- Provide examples and documentation

---

## Phase 6: Google Search Console (Weeks 15-16)

### 6.1 GSC OAuth Integration
- Implement Google OAuth 2.0 flow
- Request `https://www.googleapis.com/auth/webmasters.readonly` scope
- Store refresh tokens securely

### 6.2 Keyword Research Features
- Fetch search queries for client's domains
- Calculate opportunity score:
  - High impressions, low CTR → optimization opportunity
  - Rising queries → trending topics
  - Position 11-20 → low-hanging fruit
- Store keyword data in database for historical analysis

### 6.3 Performance Tracking
- Daily cron job to fetch keyword rankings
- Compare before/after article publication
- Alert users to significant ranking changes
- Generate weekly/monthly reports

---

## Phase 7: Productionization & DevOps (Weeks 17-19)

###1 Dokploy Deployment
**Architecture**:
- Main app (`web` + `api`): Single Docker image, deployed via Dokploy
- Temporal workers: Separate service, auto-scaling based on queue depth
- Payload instances: Spawned per-client via Dokploy API
- PostgreSQL: Managed instance (Supabase, Railway, or self-hosted)
- Redis: Managed instance or Docker container

**Environment variables**:
- `NODE_ENV=production`
- `DATABASE_URL`, `REDIS_URL`, `TEMPORAL_URL`
- `OPENROUTER_API_KEY`, `GITHUB_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_ID`
- `DOKPLOY_API_URL`, `DOKPLOY_API_KEY`

### 7.2 CI/CD Pipeline
- GitHub Actions for automated testing and deployment
- Turborepo remote caching (Vercel or self-hosted)
- Lint, type-check, and test on every PR
- Automatic deployment to staging on `develop` branch
- Manual approval for production deployment

### 7.3 Monitoring & Observability
- Sentry for error tracking
- Axiom or Loki for log aggregation
- Prometheus + Grafana for metrics (optional, can start with Dokploy's built-in monitoring)
- Temporal Web UI for workflow debugging

### 7.4 Security Hardening
- Rate limiting on API endpoints
- Input validation and sanitization
- Secrets management (use environment variables, never commit)
- Regular dependency updates (Dependabot)
- HTTPS everywhere (Let's Encrypt via Dokploy)

---

## Phase 8: Polish & Launch Readiness (Week 20)

### 8.1 Documentation
- User documentation (onboarding, features, troubleshooting)
- API documentation (tRPC auto-generated + Swagger for REST endpoints)
- Developer documentation (monorepo setup, contributing guide)
- Video tutorials (screen recordings for key workflows)

### ⏸️ 8.2 Billing & Limits - NOT STARTED
- Implement usage tracking (articles generated, API calls, storage)
- Define tier system (free, pro, enterprise)
- Integrate Stripe for payments
- Soft and hard limits per tier

### ⏸️ 8.3 Beta Testing - NOT STARTED
- Invite 5-10 early users
- Gather feedback on UX, bugs, missing features
- Iterate based on feedback
- Prepare launch marketing (landing page, demo video, social media)

---

## Technical Deep Dives

### Temporal Workflow Example
```typescript
// temporal/workflows/generateArticle.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const { 
  fetchClientContext, 
  generateOutline, 
  generateSection,
  optimizeSEO,
  saveArticleDraft 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 3 }
});

export async function generateArticleWorkflow(
  payload: unknown,
  clientId: string,
  targetCMS: string
): Promise<string> {
  // Step 1: Fetch RAG context
  const context = await fetchClientContext(clientId);
  
  // Step 2: Generate outline
  const outline = await generateOutline(payload, context);
  
  // Step 3: Generate sections
  const sections = [];
  for (const section of outline.sections) {
    const content = await generateSection(section, context);
    sections.push(content);
  }
  
  // Step 4: Optimize for SEO
  const article = await optimizeSEO({ outline, sections });
  
  // Step 5: Save draft
  const articleId = await saveArticleDraft(article, clientId, targetCMS);
  
  return articleId;
}
```

### Dokploy API Integration
```typescript
// packages/integrations/dokploy/client.ts
export class DokployClient {
  private apiUrl: string;
  private apiKey: string;

  async deployPayloadInstance(clientSlug: string) {
    const response = await fetch(`${this.apiUrl}/api/deploy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `payload-${clientSlug}`,
        image: 'payloadcms/payload:latest',
        env: {
          PAYLOAD_SECRET: generateSecret(),
          DATABASE_URI: `${DB_URL}?schema=${clientSlug}`,
          PAYLOAD_PUBLIC_SERVER_URL: `https://${clientSlug}.payloadcms.deseo.app`
        },
        port: 3000,
        domain: `${clientSlug}.payloadcms.deseo.app`
      })
    });
    
    return response.json();
  }
}
```

### AST to CMS Converters
```typescript
// packages/ast/converters/payload.ts
export function astToPayloadBlocks(ast: ArticleAST) {
  return ast.content.map(node => {
    switch (node.type) {
      case 'heading':
        return {
          blockType: 'heading',
          level: node.level,
          text: node.text
        };
      case 'paragraph':
        return {
          blockType: 'richText',
          content: [{ type: 'text', text: node.text }]
        };
      // ... more converters
    }
  });
}
```

---

## Alternative Architectures Considered

### Why Not Next.js Monolith?
**Pros**: Simpler mental model, fewer repos, Next.js API routes for backend
**Cons**: 
- API routes not ideal for long-running jobs (Temporal workers need separate process)
- Harder to scale backend independently
- No clear separation for worker processes
- Turborepo monorepo provides flexibility to scale later

### Why Not Separate Repos?
**Pros**: Clear boundaries, independent deployments
**Cons**:
- Integration hell (syncing types, versions, breaking changes)
- Repeated CI setup across repos
- Harder to refactor across boundaries
- Given the frequency of shared code (UI, types, AI logic), monorepo wins

### Why Temporal Over Alternatives?
- **Inngest/Trigger.dev**: Great for serverless, but we're self-hosted and need local dev support
- **BullMQ**: Simpler, but lacks durability guarantees and workflow visualization
- **AWS Step Functions**: Cloud-specific, not self-hosted
- **Temporal**: Battle-tested, TypeScript SDK, visual debugging, self-hosted

---

## Migration & Scaling Strategy

### Vertical Scaling (Phase 1-8)
- Single monorepo
- Shared Postgres instance (with schemas per client for Payload)
- All services on one Dokploy instance

### Horizontal Scaling (Post-Launch)
- Extract `packages/ai` into separate service if OpenRouter rate limits hit
- Scale Temporal workers independently
- Use PostgreSQL read replicas for analytics queries
- CDN for static assets (Cloudflare)
- Consider splitting monorepo into:
  - `deseo-platform` (core app)
  - `deseo-integrations` (CMS plugins)
  - `deseo-workers` (Temporal workers)

---

## Open Questions & Risks

### Technical Risks
1. **Payload v3 instance cost**: Each client gets a container → could be expensive at scale
   - **Mitigation**: Tier-based (free tier shares instance, paid tiers get dedicated)
2. **OpenRouter rate limits**: High article volume could hit API limits
   - **Mitigation**: Queue system, allow clients to bring their own keys
3. **SEO PR quality**: AI-generated code changes might not always be production-ready
   - **Mitigation**: Always require human review, focus on low-risk changes (meta tags)

### Product Risks
1. **Differentiation**: Lots of AI content tools exist
   - **Mitigation**: Focus on integration depth + SEO optimization loop (measure results)
2. **User adoption**: Developers might resist AI PRs
   - **Mitigation**: Make it opt-in, provide detailed explanations, track PR acceptance rate

---

## Success Metrics

### Technical
- ✅ All tests passing in CI/CD
- ✅ <2s average response time for API
- ✅ <5min article generation time (end-to-end)
- ✅ 99.9% uptime for core services

### Product
- 🎯 100 beta users onboarded
- 🎯 500 articles generated in first 3 months
- 🎯 10% average traffic increase for clients using the platform
- 🎯 50% of generated articles published by clients

---

## Next Steps After Plan Approval

1. Initialize monorepo structure (pnpm + Turborepo)
2. Set up Docker Compose for local development
3. Create database schema with Drizzle ORM
4. Implement basic auth and client onboarding
5. Build "Hello World" Temporal workflow
6. Create first AST converter (Markdown)
7. Integrate OpenRouter for basic article generation
8. Deploy to staging environment on Dokploy

Estimated timeline: **20 weeks to production-ready MVP** (can be accelerated with focused scope)
