# Deseo Platform - Quickstart Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker Desktop running
- pnpm installed (`npm install -g pnpm`)

### Step 1: Clone & Install

```bash
cd deseo
pnpm install
```

### Step 2: Start Infrastructure

```bash
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

**Services started:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`  
- Temporal: `localhost:7233`
- Temporal UI: `http://localhost:8080`

### Step 3: Setup Database

```bash
# Apply migrations
pnpm --filter @deseo/db db:migrate
```

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add:
# - DATABASE_URL (already set for local dev)
# - OPENROUTER_API_KEY (get from https://openrouter.ai)
```

### Step 5: Start Development Servers

Open **3 terminal tabs** and run:

```bash
# Terminal 1 - API Server (port 3001)
pnpm --filter @deseo/api dev

# Terminal 2 - Temporal Worker
pnpm --filter @deseo/worker dev

# Terminal 3 - Frontend (port 3000)
pnpm --filter @deseo/web dev
```

### Step 6: Open the App

Visit **http://localhost:3000**

Click "Go to Dashboard" to see the live tRPC connection!

---

## ✅ What's Working

### Frontend (http://localhost:3000)
- Landing page with features
- Dashboard page with tRPC queries
- Real-time data from API
- TypeScript autocomplete for API calls

### API (http://localhost:3001)
- tRPC endpoints:
  - `/trpc/client.list` - List clients
  - `/trpc/client.getById` - Get client by ID
  - `/trpc/client.create` - Create client
  - `/trpc/article.list` - List articles
  - `/trpc/job.list` - List jobs
- Health check: `/health`

### Worker
- Listening on `deseo-main-queue`
- 3 workflows ready:
  - `generateArticleWorkflow`
  - `optimizeSEOWorkflow`
  - `keywordResearchWorkflow`

### Database
- 4 tables created: users, clients, articles, jobs
- Migrations applied
- Drizzle ORM ready

---

## 🧪 Testing the Stack

### Test 1: Create a Client via API

```bash
curl -X POST http://localhost:3001/trpc/client.create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "name": "My First Client",
    "slug": "my-first-client"
  }'
```

### Test 2: View Client in Dashboard

1. Open http://localhost:3000/dashboard
2. Should see "My First Client" listed

### Test 3: Generate an Article (Coming Soon)

The AI article generation workflow is scaffolded but needs:
- OpenRouter API key in `.env`
- Workflow trigger implementation

---

## 📁 Project Structure

```
deseo/
├── apps/
│   ├── web/         → Next.js frontend (localhost:3000)
│   ├── api/         → tRPC API server (localhost:3001)
│   └── worker/      → Temporal worker
├── packages/
│   ├── db/          → Database schemas + migrations
│   ├── ai/          → OpenRouter AI integration
│   ├── ast/         → Article AST + CMS converters
│   └── types/       → Shared TypeScript types
└── temporal/
    ├── workflows/   → Temporal workflow definitions
    └── activities/  → Temporal activity functions
```

---

## 🔧 Useful Commands

### Development
```bash
# Install all dependencies
pnpm install

# Run everything in dev mode
pnpm dev

# Run specific app
pnpm --filter @deseo/web dev
pnpm --filter @deseo/api dev
pnpm --filter @deseo/worker dev
```

### Database
```bash
# Generate migration (after schema changes)
pnpm --filter @deseo/db db:generate

# Apply migrations
pnpm --filter @deseo/db db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @deseo/db db:studio
```

### Docker
```bash
# Start services
cd docker && docker-compose -f docker-compose.dev.yml up -d

# Stop services
cd docker && docker-compose -f docker-compose.dev.yml down

# View logs
cd docker && docker-compose -f docker-compose.dev.yml logs -f
```

### Build
```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter @deseo/web build
```

---

## 🐛 Troubleshooting

### Port Already in Use
If you see "port already in use" errors:

```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Find process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
cd docker && docker-compose -f docker-compose.dev.yml restart postgres
```

### TypeScript Errors
Most TypeScript errors are expected during development. They resolve when:
1. All dependencies are installed
2. Applications are built
3. Type generation completes

To ignore during development, you can:
```bash
# Run without type checking
pnpm dev --no-type-check
```

### Temporal Worker Can't Find Workflows
Make sure:
1. Temporal server is running (`docker ps`)
2. Worker is pointing to correct workflow path
3. Workflows are compiled (use tsx in dev mode)

---

## 🎯 Next Steps

### Immediate Tasks
1. **Add OpenRouter API key** to generate AI articles
2. **Create first client** via dashboard
3. **Test article generation** workflow

### Feature Development
1. Build article editor UI
2. Add GitHub/GitLab integration
3. Implement Google Search Console sync
4. Add authentication (NextAuth.js)
5. Create job monitoring dashboard

---

## 📚 Documentation

- **Full Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Progress Tracking**: `PROGRESS.md`
- **AI Agent Rules**: `.agent/rules/`
- **API Documentation**: Auto-generated via tRPC

---

## 🆘 Need Help?

### Check Logs
```bash
# API logs (terminal where api dev is running)
# Worker logs (terminal where worker dev is running)  
# Frontend logs (terminal where web dev is running)

# Docker logs
cd docker && docker-compose -f docker-compose.dev.yml logs
```

### Verify Services
```bash
# Check API health
curl http://localhost:3001/health

# Check Temporal UI
open http://localhost:8080

# Check database
psql postgres://deseo:deseo_dev_password@localhost:5432/deseo_dev
```

---

**Status**: ✅ All systems operational, ready for development!
