require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const result = await pool.query('SELECT version(), current_database()');
    console.log('✅ Connected to Neon Database!');
    console.log('Database:', result.rows[0].current_database);
    console.log('Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    const tables = await pool.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in database:', tables.rows[0].count);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    await pool.end();
  }
}

test();
