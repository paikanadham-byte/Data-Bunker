const { Pool } = require('pg');

const local = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'databunker',
  max: 5
});

const neon = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 5
});

const BATCH = 3000;

async function migrate(table, cols, orderCol) {
  console.log(`\n📦 ${table}...`);
  
  const {rows: [{count}]} = await local.query(`SELECT COUNT(*) FROM ${table}`);
  const total = parseInt(count);
  
  if (total === 0) {
    console.log(`  ℹ️  Empty`);
    return;
  }
  
  console.log(`  Total: ${total.toLocaleString()}`);
  
  let done = 0;
  const start = Date.now();
  
  while (done < total) {
    const {rows} = await local.query(`
      SELECT ${cols.join(', ')} FROM ${table}
      ORDER BY ${orderCol} LIMIT ${BATCH} OFFSET ${done}
    `);
    
    if (rows.length === 0) break;
    
    const placeholders = rows.map((_, i) => 
      `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`
    ).join(',');
    
    const values = rows.flatMap(r => cols.map(c => r[c]));
    
    await neon.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`, values);
    
    done += rows.length;
    const pct = ((done/total)*100).toFixed(1);
    const rate = Math.round(done / ((Date.now()-start)/1000));
    process.stdout.write(`\r  ${done.toLocaleString()}/${total.toLocaleString()} (${pct}%) | ${rate}/s `);
  }
  
  console.log(`\n  ✅ ${((Date.now()-start)/1000).toFixed(1)}s`);
}

async function run() {
  try {
    console.log('🚀 Migrating Remaining Tables to Neon\n');
    
    await local.query('SELECT 1');
    await neon.query('SELECT 1');
    console.log('✓ Connected\n');
    
    // Accounts
    await migrate('accounts', [
      'account_id','company_name','industry','company_size','country','state_region',
      'city','address','website','phone_number','email_format','revenue',
      'linkedin_url','company_category','created_at','updated_at'
    ], 'account_id');
    
    // Officers
    await migrate('officers', [
      'id','company_id','name','role','appointed_date','resigned_date','nationality',
      'date_of_birth','occupation','address','created_at'
    ], 'created_at');
    
    // Enrichment queue
    await migrate('enrichment_queue', [
      'id','company_id','status','priority','attempts','max_attempts','error_message',
      'created_at','started_at','completed_at','worker_id'
    ], 'created_at');
    
    // Search logs
    await migrate('search_logs', [
      'id','search_query','filters','results_count','user_session','searched_at'
    ], 'searched_at');
    
    console.log('\n✅ All Done!\n');
    
  } catch (err) {
    console.error('\n❌', err.message);
  } finally {
    await local.end();
    await neon.end();
  }
}

run();
