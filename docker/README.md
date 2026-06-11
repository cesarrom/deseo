# Docker Services

## Development

Start all services for local development:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Stop services:

```bash
docker compose -f docker/docker-compose.dev.yml down
```

Stop and remove volumes:

```bash
docker compose -f docker/docker-compose.dev.yml down -v
```

## Services

- **PostgreSQL**: `localhost:5432`
  - User: `deseo`
  - Password: `deseo_dev_password`
  - Database: `deseo_dev`

- **Redis**: `localhost:6379`

- **Temporal**: `localhost:7233`
  - UI: `http://localhost:8080`

## Production

For production deployment, copy `.env.example` to `.env` and set proper credentials:

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```
