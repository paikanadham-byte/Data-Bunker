#!/bin/bash

# Clean Migration Script - drops existing data and migrates fresh

echo "🚀 Clean Migration to Neon"
echo "============================================================"

NEON_DB="postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-fancy-flower-a4ntmd3k"

echo ""
echo "🧹 Step 1: Cleaning Neon database..."
psql "$NEON_DB" <<EOF
DROP TABLE IF EXISTS enrichment_queue CASCADE;
DROP TABLE IF EXISTS officers CASCADE;
DROP TABLE IF EXISTS search_logs CASCADE;
DROP TABLE IF EXISTS tracking_history CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP FUNCTION IF EXISTS update_search_vector CASCADE;
EOF

echo "✅ Database cleaned"

echo ""
echo "📊 Step 2: Exporting schema..."
docker exec data-bunker-db pg_dump -U postgres -d databunker --schema-only --no-owner --no-acl \
  --exclude-table=spatial_ref_sys \
  > /tmp/schema_clean.sql

echo "✅ Schema exported"

echo ""
echo "📥 Step 3: Creating schema in Neon..."
psql "$NEON_DB" -f /tmp/schema_clean.sql 2>&1 | grep -i "error" || echo "✅ Schema created"

echo ""
echo "📦 Step 4: Exporting companies data (4M records)..."
echo "   This will take 2-3 minutes..."
docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --table=companies \
  --data-only \
  --no-owner \
  --no-acl \
  > /tmp/companies.sql

echo "✅ Companies data exported ($(wc -l < /tmp/companies.sql) lines)"

echo ""
echo "📥 Step 5: Importing companies to Neon..."
echo "   This will take 3-5 minutes..."
psql "$NEON_DB" -f /tmp/companies.sql 2>&1 | tail -n 5

echo ""
echo "📦 Step 6: Exporting accounts data (2M records)..."
docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --table=accounts \
  --data-only \
  --no-owner \
  --no-acl \
  > /tmp/accounts.sql

echo "✅ Accounts data exported"

echo ""
echo "📥 Step 7: Importing accounts to Neon..."
psql "$NEON_DB" -f /tmp/accounts.sql 2>&1 | tail -n 3

echo ""
echo "📦 Step 8: Exporting officers data..."
docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --table=officers \
  --data-only \
  --no-owner \
  --no-acl \
  > /tmp/officers.sql

echo ""
echo "📥 Importing officers to Neon..."
psql "$NEON_DB" -f /tmp/officers.sql 2>&1 | tail -n 3

echo ""
echo "📦 Step 9: Exporting enrichment_queue data..."
docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --table=enrichment_queue \
  --data-only \
  --no-owner \
  --no-acl \
  > /tmp/enrichment.sql

echo ""
echo "📥 Importing enrichment_queue to Neon..."
psql "$NEON_DB" -f /tmp/enrichment.sql 2>&1 | tail -n 3

echo ""
echo "📦 Step 10: Exporting search_logs data..."
docker exec data-bunker-db pg_dump -U postgres -d databunker \
  --table=search_logs \
  --data-only \
  --no-owner \
  --no-acl \
  > /tmp/search_logs.sql

echo ""
echo "📥 Importing search_logs to Neon..."
psql "$NEON_DB" -f /tmp/search_logs.sql 2>&1 | tail -n 3

echo ""
echo "============================================================"
echo "📊 Final Verification"
echo "============================================================"
echo ""

psql "$NEON_DB" -c "
SELECT 
  table_name,
  to_char(record_count, '999,999,999') as records
FROM (
  SELECT 'companies' as table_name, COUNT(*) as record_count FROM companies
  UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
  UNION ALL SELECT 'officers', COUNT(*) FROM officers
  UNION ALL SELECT 'enrichment_queue', COUNT(*) FROM enrichment_queue
  UNION ALL SELECT 'search_logs', COUNT(*) FROM search_logs
  UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
) t
ORDER BY record_count DESC;
"

echo ""
echo "✅ Migration Complete!"
echo ""
echo "🧹 Cleanup temp files: rm /tmp/*.sql"
rm /tmp/companies.sql /tmp/accounts.sql /tmp/officers.sql /tmp/enrichment.sql /tmp/search_logs.sql /tmp/schema_clean.sql
