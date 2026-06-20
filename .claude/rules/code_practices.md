# Code Practices

## TypeScript
- Strict mode enabled
- No `any` types
- Use branded types for IDs
- Export types from packages

## Database
- All queries via Drizzle ORM
- Row-level security (filter by `clientId`)
- Use transactions for multi-step operations
- Never bypass migrations

## API Design
- tRPC for type-safe APIs
- Input validation with Zod
- Error handling with proper codes
- Rate limiting on all endpoints

## Testing
- Unit tests for business logic
- Integration tests for workflows
- E2E tests for critical paths

## Monorepo
- Use workspace protocol: `"@deseo/db": "workspace:*"`
- Run commands with filters: `pnpm --filter <package>`
- Turborepo handles build order
