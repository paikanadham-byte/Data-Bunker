#!/bin/bash

echo "🇬🇧 UK Companies Bulk Import"
echo "================================"
echo ""
echo "✅ Duplicate Prevention: ON (updates existing records)"
echo ""
echo "This will import active UK companies from Companies House API."
echo ""
echo "Options:"
echo "  1) Test - Import 1,000 companies (~5 minutes)"
echo "  2) Small - Import 10,000 companies (~1 hour)"
echo "  3) Medium - Import 100,000 companies (~10 hours)"
echo "  4) ALL - Import all ~5 million companies (run in background)"
echo "  5) Custom amount"
echo ""
read -p "Choose option (1-5): " option

MAX_COMPANIES="null"
ENRICH="false"

case $option in
  1)
    MAX_COMPANIES="1000"
    echo "✅ Will import 1,000 companies"
    ;;
  2)
    MAX_COMPANIES="10000"
    echo "✅ Will import 10,000 companies"
    ;;
  3)
    MAX_COMPANIES="100000"
    echo "✅ Will import 100,000 companies"
    ;;
  4)
    MAX_COMPANIES="null"
    echo "✅ Will import ALL companies (~5 million)"
    ;;
  5)
    read -p "Enter number of companies: " MAX_COMPANIES
    echo "✅ Will import $MAX_COMPANIES companies"
    ;;
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

echo ""
read -p "Enrich with contact info? (slower but more data) [y/N]: " enrich_choice
if [[ $enrich_choice == "y" || $enrich_choice == "Y" ]]; then
  ENRICH="true"
  echo "⚠️  Warning: Enrichment significantly increases import time"
fi

echo ""
echo "🚀 Starting import..."
echo "   Max companies: ${MAX_COMPANIES:-unlimited}"
echo "   Contact enrichment: $ENRICH"
echo "   Duplicate handling: Updates existing records"
echo ""
echo "📊 Monitor progress: http://localhost:5000/api/bulk-import/status"
echo ""

curl -X POST http://localhost:5000/api/bulk-import/start \
  -H "Content-Type: application/json" \
  -d "{
    \"maxCompanies\": $MAX_COMPANIES,
    \"batchSize\": 100,
    \"delayBetweenBatches\": 2000,
    \"enrichWithContacts\": $ENRICH
  }" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Server not responding. Is it running?"

echo ""
echo "✅ Import started in background!"
echo ""
echo "📊 Check status:"
echo "   curl http://localhost:5000/api/bulk-import/status | python3 -m json.tool"
echo ""
echo "🛑 Stop import:"
echo "   curl -X POST http://localhost:5000/api/bulk-import/stop"
echo ""
echo "💡 Tip: Import runs in background. You can close this terminal."
