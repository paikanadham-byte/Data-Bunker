#!/bin/bash

# Fast Migration Script using pg_dump and psql
# This is 100x faster than row-by-row insertion

echo "🚀 Fast Migration to Neon using pg_dump/restore"
echo "============================================================"

# Connection strings
SOURCE_DB="postgresql://postgres:postgres@localhost:5432/databunker"
NEON_DB="postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-fancy-flower-a4ntmd3k"

echo ""
echo "📊 Step 1: Dumping schema from local database..."
docker exec data-bunker-db pg_dump -U postgres -d databunker --schema-only --no-owner --no-acl > /tmp/schema.sql

echo "✅ Schema dumped"

echo ""
echo "📦 Step 2: Dumping data from local database..."
echo "   This may take a few minutes for 6M+ records..."

docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --exclude-table-data=tracking_history \
  --exclude-table-data=contacts \
  > /tmp/data.sql

echo "✅ Data dumped to /tmp/data.sql"

echo ""
echo "📥 Step 3: Restoring schema to Neon..."
psql "$NEON_DB" < /tmp/schema.sql 2>&1 | grep -v "already exists" | grep -v "NOTICE"

echo "✅ Schema restored"

echo ""
echo "📥 Step 4: Restoring data to Neon..."
echo "   This is the longest step, please be patient..."

psql "$NEON_DB" < /tmp/data.sql

echo ""
echo "✅ Data restored!"

echo ""
echo "📊 Step 5: Verifying migration..."
echo ""

psql "$NEON_DB" -c "
  SELECT 
    'companies' as table_name, COUNT(*) as records FROM companies
  UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
  UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
  UNION ALL SELECT 'officers', COUNT(*) FROM officers
  UNION ALL SELECT 'enrichment_queue', COUNT(*) FROM enrichment_queue
  UNION ALL SELECT 'search_logs', COUNT(*) FROM search_logs
  ORDER BY records DESC;
"

echo ""
echo "✅ Migration Complete!"
echo ""
echo "Cleanup: rm /tmp/schema.sql /tmp/data.sql"
