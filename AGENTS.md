# AI Agent Guidelines

This project uses AI agents for development. Follow these rules:

## Before Making Changes
1. Read `.agent/rules/*.md` files
2. Understand monorepo structure
3. Check existing patterns

## Key Rules
- **Migrations**: Never `db:push`, always generate + migrate
- **Types**: TypeScript strict mode, no `any`
- **Architecture**: Follow monorepo patterns
- **Testing**: Write tests for new features

## Common Commands
```bash
# Install dependencies
pnpm install

# Run dev
pnpm dev

# Database
pnpm --filter @deseo/db db:generate
pnpm --filter @deseo/db db:migrate

# Lint
pnpm lint
```

See `.agent/rules/` for detailed guidelines.
