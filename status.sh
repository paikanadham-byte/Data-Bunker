#!/bin/bash

# Data Bunker - Status Dashboard

clear
echo "═══════════════════════════════════════════════════════════"
echo "              DATA BUNKER - LIVE STATUS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Database
if docker exec data-bunker-db pg_isready -U postgres >/dev/null 2>&1; then
    DB_STATUS="${GREEN}✅ RUNNING${NC}"
    COMPANY_COUNT=$(docker exec data-bunker-db psql -U postgres -d databunker -t -c "SELECT COUNT(*) FROM companies;" 2>/dev/null | tr -d ' ')
else
    DB_STATUS="${RED}❌ STOPPED${NC}"
    COMPANY_COUNT="N/A"
fi

# Check Backend
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    BACKEND_STATUS="${GREEN}✅ RUNNING${NC}"
else
    BACKEND_STATUS="${RED}❌ STOPPED${NC}"
fi

# Check Frontend
if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    FRONTEND_STATUS="${GREEN}✅ RUNNING${NC}"
else
    FRONTEND_STATUS="${YELLOW}⏳ STARTING${NC}"
fi

# Get enrichment stats
if [ "$BACKEND_STATUS" == "${GREEN}✅ RUNNING${NC}" ]; then
    STATS=$(curl -s http://localhost:5000/api/enrichment/stats 2>/dev/null)
    ENRICHED=$(echo "$STATS" | jq -r '.data.companies_with_website' 2>/dev/null || echo "N/A")
    PENDING=$(echo "$STATS" | jq -r '.queue.pending' 2>/dev/null || echo "N/A")
    PROCESSING=$(echo "$STATS" | jq -r '.queue.processing' 2>/dev/null || echo "N/A")
    COMPLETED=$(echo "$STATS" | jq -r '.queue.completed' 2>/dev/null || echo "N/A")
    WORKERS=$(echo "$STATS" | jq -r '.workers.active' 2>/dev/null || echo "N/A")
else
    ENRICHED="N/A"
    PENDING="N/A"
    PROCESSING="N/A"
    COMPLETED="N/A"
    WORKERS="N/A"
fi

# Display Status
echo -e "${BLUE}📊 SERVICES:${NC}"
echo -e "   Database:  $DB_STATUS"
echo -e "   Backend:   $BACKEND_STATUS  (http://localhost:5000)"
echo -e "   Frontend:  $FRONTEND_STATUS  (http://localhost:3000)"
echo ""

echo -e "${BLUE}💾 DATABASE:${NC}"
echo -e "   Total Companies: ${GREEN}$COMPANY_COUNT${NC}"
echo -e "   Enriched:        ${GREEN}$ENRICHED${NC}"
echo ""

echo -e "${BLUE}⚡ ENRICHMENT QUEUE:${NC}"
echo -e "   Pending:         ${YELLOW}$PENDING${NC}"
echo -e "   Processing:      ${BLUE}$PROCESSING${NC}"
echo -e "   Completed:       ${GREEN}$COMPLETED${NC}"
echo -e "   Active Workers:  ${GREEN}$WORKERS${NC}"
echo ""

echo -e "${BLUE}📂 LOGS:${NC}"
echo "   tail -f /tmp/data-bunker-backend.log"
echo "   tail -f /tmp/enrichment-workers.log"
echo ""

echo -e "${BLUE}🔧 COMMANDS:${NC}"
echo "   ./start-all.sh     # Start all services"
echo "   ./stop-all.sh      # Stop all services"
echo "   ./status.sh        # This dashboard"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Press Ctrl+C to exit | Run: watch -n 5 ./status.sh for live"
echo "═══════════════════════════════════════════════════════════"
