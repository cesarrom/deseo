# Deployment

## Local Development
```bash
# Start services
docker compose -f docker/docker-compose.dev.yml up -d

# Run app
pnpm dev
```

## Production (Dokploy)
- Main app: Single Docker image
- Workers: Separate service
- Payload instances: Per-client containers
- PostgreSQL: External managed instance
- Redis: Managed or containerized

## Environment Variables
See `.env.example` for all required vars

## CI/CD
- GitHub Actions
- Turborepo remote caching
- Automatic staging deploys
- Manual production approval
