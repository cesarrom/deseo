# Database Migrations

## Critical Rules
1. **NEVER use `db:push`** - Always use migrations
2. **Always generate migrations**: `pnpm --filter @deseo/db db:generate`
3. **Review generated SQL** before applying
4. **Apply migrations**: `pnpm --filter @deseo/db db:migrate`

## Workflow
```bash
# 1. Modify schema in packages/db/src/schema/
# 2. Generate migration
pnpm --filter @deseo/db db:generate
# 3. Review drizzle/*.sql
# 4. Apply migration
pnpm --filter @deseo/db db:migrate
```

## Custom Migrations
- Complex data migrations go in separate files
- Name: `drizzle/XXXX_custom_description.sql`
- Test locally before production
