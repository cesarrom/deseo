docker compose -f docker/docker-compose.dev.yml down -v && docker compose -f docker/docker-compose.dev.yml up -d &&
pnpm run db:migrate &&
cd apps/connector-gsc && pnpm run db:migrate &&
cd ../connector-github && pnpm run db:migrate &&
cd ../connector-payload && pnpm run db:migrate &&
sleep 5 &&
cd ../.. && pnpm run dev