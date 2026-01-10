#!/bin/bash

# Quick status check for bulk import

echo "📊 Bulk Import Progress"
echo "======================="
echo ""

STATUS=$(curl -s http://localhost:5000/api/bulk-import/status 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to server"
    exit 1
fi

echo "$STATUS" | python3 -m json.tool 2>/dev/null

echo ""
echo "📈 Database Statistics"
echo "======================="
echo ""

curl -s http://localhost:5000/api/db/analytics/stats 2>/dev/null | python3 -m json.tool 2>/dev/null

echo ""
echo "💡 Tips:"
echo "   Monitor continuously: ./scripts/monitor-import.sh"
echo "   Stop import: curl -X POST http://localhost:5000/api/bulk-import/stop"
