#!/usr/bin/env node
/**
 * Complete Data Migration Script from Local PostgreSQL to Neon
 * Migrates: companies (4M), accounts (2M), officers (16K), enrichment_queue (12K), search_logs (59)
 */

const { Pool } = require('pg');

// Source: Local PostgreSQL
const sourcePool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'databunker',
  max: 10
});

// Destination: Neon
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 10
});

const BATCH_SIZE = 1000;
let totalMigrated = 0;

async function createNeonSchema() {
  console.log('📐 Creating schema in Neon...\n');
  
  // Drop existing tables to start fresh
  console.log('  → Dropping existing tables...');
  await neonPool.query(`
    DROP TABLE IF EXISTS enrichment_queue CASCADE;
    DROP TABLE IF EXISTS officers CASCADE;
    DROP TABLE IF EXISTS search_logs CASCADE;
    DROP TABLE IF EXISTS tracking_history CASCADE;
    DROP TABLE IF EXISTS contacts CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
  `);
  
  // Create companies table
  console.log('  → Creating companies table...');
  await neonPool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
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
    CREATE INDEX idx_companies_name ON companies(name);
    CREATE INDEX idx_companies_jurisdiction ON companies(jurisdiction);
    CREATE INDEX idx_companies_status ON companies(status);
    CREATE INDEX idx_companies_search ON companies USING GIN(search_vector);
  `);
  
  // Create accounts table
  console.log('  → Creating accounts table...');
  await neonPool.query(`
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
    
    CREATE INDEX idx_accounts_city ON accounts(city);
    CREATE INDEX idx_accounts_company_name ON accounts(company_name);
    CREATE INDEX idx_accounts_company_size ON accounts(company_size);
    CREATE INDEX idx_accounts_country ON accounts(country);
    CREATE INDEX idx_accounts_industry ON accounts(industry);
    CREATE INDEX idx_accounts_state_region ON accounts(state_region);
  `);
  
  // Create contacts table
  console.log('  → Creating contacts table...');
  await neonPool.query(`
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
      CONSTRAINT fk_account FOREIGN KEY (linked_account_id) 
        REFERENCES accounts(account_id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_contacts_linked_account ON contacts(linked_account_id);
    CREATE INDEX idx_contacts_job_title ON contacts(job_title);
  `);
  
  // Create officers table
  console.log('  → Creating officers table...');
  await neonPool.query(`
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
      CONSTRAINT officers_company_id_fkey FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_officers_company ON officers(company_id);
  `);
  
  // Create enrichment_queue table
  console.log('  → Creating enrichment_queue table...');
  await neonPool.query(`
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
      CONSTRAINT enrichment_queue_company_id_fkey FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_queue_company ON enrichment_queue(company_id);
    CREATE INDEX idx_queue_status ON enrichment_queue(status, priority DESC, created_at);
    CREATE INDEX idx_queue_worker ON enrichment_queue(worker_id);
  `);
  
  // Create search_logs table
  console.log('  → Creating search_logs table...');
  await neonPool.query(`
    CREATE TABLE search_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      search_query VARCHAR(500),
      filters JSONB,
      results_count INTEGER,
      user_session VARCHAR(100),
      searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create tracking_history table
  console.log('  → Creating tracking_history table...');
  await neonPool.query(`
    CREATE TABLE IF NOT EXISTS tracking_history (
      id SERIAL PRIMARY KEY,
      table_name VARCHAR(100),
      action VARCHAR(50),
      record_id VARCHAR(100),
      changes JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Schema created successfully!\n');
}

async function migrateTable(tableName, columns, orderBy = 'created_at') {
  console.log(`\n📦 Migrating ${tableName}...`);
  
  // Get total count
  const countResult = await sourcePool.query(`SELECT COUNT(*) FROM ${tableName}`);
  const totalRecords = parseInt(countResult.rows[0].count);
  
  if (totalRecords === 0) {
    console.log(`  ℹ️  No records to migrate`);
    return;
  }
  
  console.log(`  Total records: ${totalRecords.toLocaleString()}`);
  
  let migrated = 0;
  let offset = 0;
  const startTime = Date.now();
  
  while (offset < totalRecords) {
    // Fetch batch from source
    const result = await sourcePool.query(`
      SELECT ${columns.join(', ')} 
      FROM ${tableName} 
      ORDER BY ${orderBy}
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `);
    
    if (result.rows.length === 0) break;
    
    // Insert batch into Neon using COPY for better performance
    const copyQuery = `COPY ${tableName} (${columns.join(', ')}) FROM STDIN WITH (FORMAT csv)`;
    
    try {
      // Convert rows to CSV format
      const csvData = result.rows.map(row => {
        return columns.map(col => {
          const val = row[col];
          if (val === null) return '\\N';
          if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
          return String(val).replace(/"/g, '""');
        }).join(',');
      }).join('\n');
      
      // For now, use regular INSERT since COPY FROM STDIN is tricky with pg library
      // We'll batch insert instead
      const placeholders = result.rows.map((_, i) => {
        const valueIndices = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ');
        return `(${valueIndices})`;
      }).join(', ');
      
      const values = result.rows.flatMap(row => columns.map(col => row[col]));
      
      await neonPool.query(`
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
      `, values);
      
      migrated += result.rows.length;
      offset += BATCH_SIZE;
      
      const progress = ((migrated / totalRecords) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(migrated / elapsed);
      
      process.stdout.write(`\r  Progress: ${migrated.toLocaleString()}/${totalRecords.toLocaleString()} (${progress}%) | ${rate} records/sec`);
      
    } catch (error) {
      console.error(`\n  ❌ Error at offset ${offset}:`, error.message);
      throw error;
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ Migrated ${migrated.toLocaleString()} records in ${duration}s`);
  totalMigrated += migrated;
}

async function migrate() {
  try {
    console.log('🚀 Starting Migration to Neon\n');
    console.log('=' .repeat(60));
    
    // Test connections
    console.log('\n🔌 Testing connections...');
    await sourcePool.query('SELECT 1');
    console.log('  ✓ Source (Local PostgreSQL) connected');
    
    await neonPool.query('SELECT 1');
    console.log('  ✓ Destination (Neon) connected');
    
    // Create schema
    await createNeonSchema();
    
    console.log('\n📊 Starting Data Migration');
    console.log('=' .repeat(60));
    
    // Migrate in order (respecting foreign keys)
    
    // 1. Companies (base table, no dependencies)
    await migrateTable('companies', [
      'id', 'company_number', 'name', 'legal_name', 'jurisdiction',
      'company_type', 'status', 'incorporation_date', 'address_line_1',
      'address_line_2', 'locality', 'region', 'postal_code', 'country',
      'website', 'phone', 'email', 'description', 'industry',
      'employee_count', 'annual_revenue', 'data_source', 'last_updated', 'created_at'
    ]);
    
    // 2. Accounts (independent table)
    await migrateTable('accounts', [
      'account_id', 'company_name', 'industry', 'company_size', 'country',
      'state_region', 'city', 'address', 'website', 'phone_number',
      'email_format', 'revenue', 'linkedin_url', 'company_category',
      'created_at', 'updated_at'
    ], 'account_id');
    
    // 3. Officers (depends on companies)
    await migrateTable('officers', [
      'id', 'company_id', 'name', 'role', 'appointed_date', 'resigned_date',
      'nationality', 'date_of_birth', 'occupation', 'address', 'created_at'
    ]);
    
    // 4. Enrichment Queue (depends on companies)
    await migrateTable('enrichment_queue', [
      'id', 'company_id', 'status', 'priority', 'attempts', 'max_attempts',
      'error_message', 'created_at', 'started_at', 'completed_at', 'worker_id'
    ]);
    
    // 5. Search Logs (independent)
    await migrateTable('search_logs', [
      'id', 'search_query', 'filters', 'results_count', 'user_session', 'searched_at'
    ]);
    
    // Final stats
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 Migration Summary');
    console.log('=' .repeat(60));
    
    const tables = ['companies', 'accounts', 'officers', 'enrichment_queue', 'search_logs'];
    for (const table of tables) {
      const result = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      console.log(`  ${table.padEnd(20)}: ${count.toLocaleString()} records`);
    }
    
    console.log('\n✅ Migration Complete!');
    console.log(`   Total records migrated: ${totalMigrated.toLocaleString()}`);
    
  } catch (error) {
    console.error('\n\n❌ Migration failed:', error);
    throw error;
  } finally {
    await sourcePool.end();
    await neonPool.end();
  }
}

// Run migration
migrate().catch(console.error);
