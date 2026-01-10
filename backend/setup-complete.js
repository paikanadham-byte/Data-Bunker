require('dotenv').config();
const { Pool } = require('pg');

const neon = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function setupComplete() {
  try {
    console.log('🚀 Complete Neon Database Setup\n');

    // Step 1: Create all tables
    console.log('📋 Creating tables...');
    await neon.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_number VARCHAR(50) UNIQUE,
        name VARCHAR(500),
        legal_name VARCHAR(500),
        jurisdiction VARCHAR(20),
        company_type VARCHAR(200),
        status VARCHAR(100),
        incorporation_date TIMESTAMP,
        address_line_1 TEXT,
        address_line_2 TEXT,
        locality VARCHAR(200),
        region VARCHAR(200),
        postal_code VARCHAR(50),
        country VARCHAR(100),
        website VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(300),
        description TEXT,
        industry TEXT,
        employee_count INTEGER,
        annual_revenue NUMERIC,
        data_source VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        search_vector tsvector
      );

      CREATE TABLE IF NOT EXISTS officers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(500),
        officer_role VARCHAR(200),
        appointed_on DATE,
        resigned_on DATE,
        nationality VARCHAR(100),
        occupation VARCHAR(300),
        address_line_1 TEXT,
        locality VARCHAR(200),
        postal_code VARCHAR(50),
        country VARCHAR(100),
        date_of_birth DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
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

      CREATE TABLE IF NOT EXISTS contacts (
        contact_id SERIAL PRIMARY KEY,
        first_name VARCHAR(200) NOT NULL,
        last_name VARCHAR(200) NOT NULL,
        job_title VARCHAR(300),
        email VARCHAR(300),
        phone_number VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(200),
        linked_account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_account FOREIGN KEY (linked_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS enrichment_queue (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        priority INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_attempt TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        result_count INTEGER,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tables created\n');

    // Step 2: Create indexes
    console.log('📊 Creating indexes...');
    await neon.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_jurisdiction ON companies(jurisdiction);
      CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
      CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
      CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING gin(search_vector);
      CREATE INDEX IF NOT EXISTS idx_officers_company_id ON officers(company_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(country);
      CREATE INDEX IF NOT EXISTS idx_accounts_state_region ON accounts(state_region);
      CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts(industry);
      CREATE INDEX IF NOT EXISTS idx_contacts_linked_account ON contacts(linked_account_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_job_title ON contacts(job_title);
      CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON enrichment_queue(status);
    `);
    console.log('✅ Indexes created\n');

    // Step 3: Populate accounts from companies
    console.log('📥 Populating accounts from companies...');
    const accountsResult = await neon.query(`
      INSERT INTO accounts (
        company_name, 
        country, 
        state_region, 
        city, 
        address, 
        website, 
        phone_number, 
        industry, 
        created_at
      )
      SELECT 
        COALESCE(name, legal_name),
        CASE 
          WHEN jurisdiction = 'gb' THEN 'United Kingdom'
          WHEN jurisdiction LIKE 'us_%' THEN 'United States'
          ELSE jurisdiction
        END,
        CASE 
          WHEN jurisdiction = 'us_ny' THEN 'New York'
          WHEN jurisdiction = 'us_ca' THEN 'California'
          WHEN region IS NOT NULL THEN region
        END,
        locality,
        CONCAT_WS(', ', address_line_1, address_line_2),
        website,
        phone,
        industry,
        COALESCE(incorporation_date, created_at)
      FROM companies
      WHERE COALESCE(name, legal_name) IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Added ${accountsResult.rowCount} accounts\n`);

    // Step 4: Show status
    console.log('📊 Database Status:\n');
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

    console.log('\n✅ Setup complete! All data consolidated.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await neon.end();
  }
}

setupComplete();
