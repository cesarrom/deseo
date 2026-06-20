#!/bin/bash
# Deseo System Verification Script

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Starting Deseo System Verification...${NC}"

# 1. Check Docker Services
echo "--- Checking Infrastructure ---"
if docker compose -f docker/docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Docker services are running${NC}"
else
    echo -e "${RED}❌ Docker services are NOT running${NC}"
fi

# 2. Check API Health
echo "--- Checking API Server ---"
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$API_HEALTH" == "200" ]; then
    echo -e "${GREEN}✅ API Server is healthy (3001)${NC}"
else
    echo -e "${RED}❌ API Server is unreachable (Status: $API_HEALTH)${NC}"
fi

# 3. Check Temporal UI
echo "--- Checking Temporal ---"
TEMPORAL_UI=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$TEMPORAL_UI" == "200" ]; then
    echo -e "${GREEN}✅ Temporal UI is healthy (8080)${NC}"
else
    echo -e "${RED}❌ Temporal UI is unreachable${NC}"
fi

echo -e "${GREEN}Verification Complete!${NC}"
