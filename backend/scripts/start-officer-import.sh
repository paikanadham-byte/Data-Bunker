#!/bin/bash

# Officers Import Script for UK Companies
# Uses Companies House API to fetch and store officer data

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       UK COMPANIES OFFICERS IMPORT - Status & Setup           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if API key is set
if [ -z "$COMPANIES_HOUSE_API_KEY" ]; then
    echo "⚠️  COMPANIES_HOUSE_API_KEY is not set in environment"
    echo ""
    echo "📝 To set it:"
    echo "   1. Get your API key from: https://developer.company-information.service.gov.uk/"
    echo "   2. Add to backend/.env:"
    echo "      COMPANIES_HOUSE_API_KEY=your_api_key_here"
    echo ""
    echo "❌ Cannot proceed without API key"
    exit 1
fi

echo "✅ Companies House API key is configured"
echo ""

# Check database connection
echo "🔌 Checking database..."
docker exec data-bunker-db psql -U postgres -d databunker -c "\dt officers" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Officers table exists"
else
    echo "❌ Officers table not found"
    exit 1
fi

# Get statistics
echo ""
echo "📊 Current Database Status:"
echo "─────────────────────────────────────────────────────────────────"

STATS=$(docker exec data-bunker-db psql -U postgres -d databunker -t -c "
SELECT 
    (SELECT COUNT(*) FROM companies WHERE jurisdiction = 'gb') as total_companies,
    (SELECT COUNT(DISTINCT company_id) FROM officers) as companies_with_officers,
    (SELECT COUNT(*) FROM officers) as total_officers
")

echo "$STATS" | awk '{
    printf "  Total UK Companies:        %10s\n", $1
    printf "  Companies with Officers:   %10s\n", $3
    printf "  Total Officers:            %10s\n", $5
}'

# Calculate companies without officers
WITHOUT_OFFICERS=$(docker exec data-bunker-db psql -U postgres -d databunker -t -c "
SELECT COUNT(*) FROM companies c 
WHERE c.jurisdiction = 'gb' 
AND NOT EXISTS (SELECT 1 FROM officers o WHERE o.company_id = c.id)
" | xargs)

echo "  Companies without Officers: $(printf '%10s' $WITHOUT_OFFICERS)"
echo ""

if [ "$WITHOUT_OFFICERS" -eq 0 ]; then
    echo "✅ All companies already have officers imported!"
    exit 0
fi

echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "📋 Import Options:"
echo ""
echo "  1. Single Company Import:"
echo "     curl -X POST http://localhost:5000/api/officers/import/00000006"
echo ""
echo "  2. Batch Import (100 companies):"
echo "     curl -X POST http://localhost:5000/api/officers/batch-import \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"limit\": 100}'"
echo ""
echo "  3. Large Batch Import (via script):"
echo "     node backend/scripts/batch-import-officers.js --limit 10000"
echo ""

echo "⚠️  API Rate Limits:"
echo "  - Companies House: 600 requests per 5 minutes"
echo "  - ~7,200 companies per hour"
echo "  - For $WITHOUT_OFFICERS companies: ~$(echo "scale=1; $WITHOUT_OFFICERS / 7200" | bc) hours"
echo ""

echo "💡 Recommendation:"
echo "  - Start with small batch (100-1000 companies) to test"
echo "  - Then run larger batches overnight"
echo "  - Monitor logs: tail -f backend/officer-import.log"
echo ""

read -p "Start importing officers? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting batch import of 100 companies..."
    curl -X POST http://localhost:5000/api/officers/batch-import \
      -H 'Content-Type: application/json' \
      -d '{"limit": 100}'
    echo ""
    echo ""
    echo "✅ Import started! Monitor progress in server logs."
else
    echo ""
    echo "ℹ️  Import not started. Run the commands above when ready."
fi

echo ""
