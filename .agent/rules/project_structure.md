# Project Structure

## Directory Layout
```
deseo/
├── .agent/rules/         # AI agent guidelines (this folder)
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Backend API
│   └── worker/           # Temporal workers
├── packages/
│   ├── ui/               # Shared UI components
│   ├── db/               # Database + Drizzle
│   ├── ai/               # OpenRouter wrapper
│   ├── integrations/     # CMS, GitHub, GitLab, GSC
│   ├── ast/              # Article AST format
│   ├── types/            # Shared types
│   └── config/           # Shared configs
├── services/
│   └── payload-template/ # Payload template
├── docker/               # Docker Compose files
└── temporal/workflows/   # Temporal workflows
```

## Package Responsibilities
- **@deseo/db**: All database schemas, migrations, client
- **@deseo/ui**: shadcn/ui components, hooks
- **@deseo/ai**: OpenRouter integration, prompt engineering
- **@deseo/integrations**: External API adapters
- **@deseo/ast**: Content AST and converters
