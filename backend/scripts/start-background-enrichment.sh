#!/bin/bash

# Start Background Enrichment as a daemon

echo "🚀 Starting Background Enrichment Service..."
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This will:"
echo "  ✅ Run continuously in the background"
echo "  🔍 Find website, email, phone, LinkedIn for ALL companies"
echo "  📊 Process ~10 companies every 5 seconds"
echo "  🔄 Auto-restart if it crashes"
echo "  💾 Save logs to: logs/enrichment.log"
echo ""

# Create logs directory
mkdir -p logs

# Check if already running
if [ -f "logs/enrichment.pid" ]; then
  PID=$(cat logs/enrichment.pid)
  if ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Enrichment service already running (PID: $PID)"
    echo ""
    echo "To stop it:"
    echo "  ./scripts/stop-background-enrichment.sh"
    echo ""
    echo "To check status:"
    echo "  ./scripts/check-enrichment-status.sh"
    exit 1
  fi
fi

echo "Starting in background..."

# Start with nohup (keeps running after terminal closes)
nohup node start-enrichment.js > logs/enrichment.log 2>&1 &
PID=$!

# Save PID
echo $PID > logs/enrichment.pid

echo ""
echo "✅ Background enrichment started!"
echo "═══════════════════════════════════════════════════════════"
echo "   PID: $PID"
echo "   Log file: logs/enrichment.log"
echo ""
echo "Monitor progress:"
echo "   tail -f logs/enrichment.log"
echo ""
echo "Check statistics:"
echo "   ./scripts/check-enrichment-status.sh"
echo ""
echo "Stop service:"
echo "   ./scripts/stop-background-enrichment.sh"
echo "═══════════════════════════════════════════════════════════"
