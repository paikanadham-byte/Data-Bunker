require('dotenv').config();
const { Pool } = require('pg');

const neon = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkStatus() {
  try {
    console.log('📊 Neon Database Status\n');
    
    const result = await neon.query(`
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
    `);
    
    console.log('Table Name          | Records');
    console.log('--------------------|--------------');
    result.rows.forEach(row => {
      console.log(`${row.table_name.padEnd(19)} | ${row.records}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await neon.end();
  }
}

checkStatus();
