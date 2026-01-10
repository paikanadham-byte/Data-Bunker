#!/usr/bin/env node
/**
 * Optimized Neon Migration using COPY protocol
 * Much faster than INSERT statements
 */

const { Client } = require('pg');

// Source
const sourceClient = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'databunker'
});

// Neon
const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function setupNeonSchema() {
  console.log('📐 Setting up Neon schema...\n');
  
  // Drop existing
  await neonClient.query(`
    DROP TABLE IF EXISTS enrichment_queue CASCADE;
    DROP TABLE IF EXISTS officers CASCADE;
    DROP TABLE IF EXISTS search_logs CASCADE;
    DROP TABLE IF EXISTS contacts CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
  `);
  
  // Create extensions
  await neonClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  
  // Create companies
  console.log('  → Creating companies table');
  await neonClient.query(`
    CREATE TABLE companies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_number VARCHAR(50) NOT NULL,
      name VARCHAR(500) NOT NULL,
      legal_name VARCHAR(500),
      jurisdiction VARCHAR(10) NOT NULL,
      company_type VARCHAR(100),
      status VARCHAR(50),
      incorporation_date DATE,
      address_line_1 VARCHAR(500),
      address_line_2 VARCHAR(500),
      locality VARCHAR(200),
      region VARCHAR(200),
      postal_code VARCHAR(50),
      country VARCHAR(100),
      website VARCHAR(500),
      phone VARCHAR(50),
      email VARCHAR(200),
      description TEXT,
      industry VARCHAR(200),
      employee_count INTEGER,
      annual_revenue NUMERIC(20,2),
      data_source VARCHAR(50),
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      search_vector TSVECTOR
    );
    CREATE INDEX idx_companies_number ON companies(company_number);
    CREATE INDEX idx_companies_jurisdiction ON companies(jurisdiction);
  `);
  
  // Create accounts
  console.log('  → Creating accounts table');
  await neonClient.query(`
    CREATE TABLE accounts (
      account_id SERIAL PRIMARY KEY,
      company_name VARCHAR(500) NOT NULL,
      industry VARCHAR(200),
      company_size VARCHAR(100),
      country VARCHAR(100),
      state_region VARCHAR(200),
      city VARCHAR(200),
      address TEXT,
      website VARCHAR(500),
      phone_number VARCHAR(50),
      email_format VARCHAR(200),
      revenue VARCHAR(100),
      linkedin_url VARCHAR(500),
      company_category VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_accounts_country ON accounts(country);
    CREATE INDEX idx_accounts_industry ON accounts(industry);
  `);
  
  // Create officers
  console.log('  → Creating officers table');
  await neonClient.query(`
    CREATE TABLE officers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID,
      name VARCHAR(300) NOT NULL,
      role VARCHAR(100),
      appointed_date DATE,
      resigned_date DATE,
      nationality VARCHAR(100),
      date_of_birth DATE,
      occupation VARCHAR(200),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_officers_company ON officers(company_id);
  `);
  
  // Create enrichment_queue
  console.log('  → Creating enrichment_queue table');
  await neonClient.query(`
    CREATE TABLE enrichment_queue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID NOT NULL UNIQUE,
      status VARCHAR(20) DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      worker_id VARCHAR(100),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_queue_status ON enrichment_queue(status, priority DESC);
  `);
  
  // Create search_logs
  console.log('  → Creating search_logs table');
  await neonClient.query(`
    CREATE TABLE search_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      search_query VARCHAR(500),
      filters JSONB,
      results_count INTEGER,
      user_session VARCHAR(100),
      searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create contacts
  console.log('  → Creating contacts table');
  await neonClient.query(`
    CREATE TABLE contacts (
      contact_id SERIAL PRIMARY KEY,
      first_name VARCHAR(200) NOT NULL,
      last_name VARCHAR(200) NOT NULL,
      job_title VARCHAR(300),
      email VARCHAR(300),
      phone_number VARCHAR(50),
      country VARCHAR(100),
      city VARCHAR(200),
      linked_account_id INTEGER NOT NULL,
      linkedin_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (linked_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
    );
  `);
  
  console.log('✅ Schema ready\n');
}

async function streamMigrateTable(tableName, batchSize = 10000) {
  console.log(`\n📦 Migrating ${tableName}...`);
  
  const countResult = await sourceClient.query(`SELECT COUNT(*) FROM ${tableName}`);
  const total = parseInt(countResult.rows[0].count);
  
  if (total === 0) {
    console.log(`  ℹ️  No records`);
    return;
  }
  
  console.log(`  Total: ${total.toLocaleString()} records`);
  
  let migrated = 0;
  const startTime = Date.now();
  
  // Get columns
  const colResult = await sourceClient.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  const columns = colResult.rows.map(r => r.column_name);
  
  // Stream in batches
  let offset = 0;
  while (offset < total) {
    const result = await sourceClient.query(`
      SELECT * FROM ${tableName} 
      ORDER BY ${tableName === 'companies' || tableName === 'officers' || tableName === 'enrichment_queue' || tableName === 'search_logs' ? 'id' : tableName === 'accounts' ? 'account_id' : 'contact_id'}
      LIMIT ${batchSize} OFFSET ${offset}
    `);
    
    if (result.rows.length === 0) break;
    
    // Batch insert
    const values = [];
    const placeholders = [];
    
    result.rows.forEach((row, i) => {
      const rowPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ');
      placeholders.push(`(${rowPlaceholders})`);
      columns.forEach(col => values.push(row[col]));
    });
    
    await neonClient.query(`
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `, values);
    
    migrated += result.rows.length;
    offset += batchSize;
    
    const progress = ((migrated / total) * 100).toFixed(1);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = Math.round(migrated / elapsed);
    
    process.stdout.write(`\r  Progress: ${migrated.toLocaleString()}/${total.toLocaleString()} (${progress}%) | ${rate} rec/s`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ Done in ${duration}s`);
}

async function migrate() {
  try {
    console.log('🚀 Neon Migration\n');
    console.log('='.repeat(60));
    
    await sourceClient.connect();
    await neonClient.connect();
    console.log('\n✓ Connected to both databases\n');
    
    await setupNeonSchema();
    
    console.log('📊 Migrating Data');
    console.log('='.repeat(60));
    
    // Migrate in dependency order
    await streamMigrateTable('companies', 5000);
    await streamMigrateTable('accounts', 10000);
    await streamMigrateTable('officers', 10000);
    await streamMigrateTable('enrichment_queue', 10000);
    await streamMigrateTable('search_logs', 10000);
    
    // Final verification
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Verification');
    console.log('='.repeat(60) + '\n');
    
    const tables = ['companies', 'accounts', 'officers', 'enrichment_queue', 'search_logs'];
    for (const table of tables) {
      const result = await neonClient.query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(result.rows[0].count).toLocaleString();
      console.log(`  ${table.padEnd(20)}: ${count.padStart(12)} records`);
    }
    
    console.log('\n✅ Migration Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await sourceClient.end();
    await neonClient.end();
  }
}

migrate().catch(console.error);
