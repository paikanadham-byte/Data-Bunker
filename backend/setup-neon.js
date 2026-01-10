require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_kPZpR7iBLnj5@ep-fancy-flower-a4ntmd3k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Neon database...\n');
    
    // Create accounts table
    console.log('Creating accounts table...');
    await pool.query(`
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
      )
    `);
    console.log('✅ Accounts table created');
    
    // Create contacts table
    console.log('Creating contacts table...');
    await pool.query(`
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
        linkedin_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_account FOREIGN KEY (linked_account_id) 
          REFERENCES accounts(account_id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Contacts table created');
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(country)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_state_region ON accounts(state_region)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts(industry)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_accounts_city ON accounts(city)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_linked_account ON contacts(linked_account_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_contacts_job_title ON contacts(job_title)');
    console.log('✅ Indexes created');
    
    // Insert sample data
    console.log('Inserting sample data...');
    await pool.query(`
      INSERT INTO accounts (company_name, country, state_region, city, industry, company_size, website)
      VALUES 
        ('Acme Corp', 'United States', 'California', 'San Francisco', 'Technology', '51-200', 'https://acmecorp.com'),
        ('TechStart Inc', 'United States', 'New York', 'New York', 'Technology', '11-50', 'https://techstart.com'),
        ('Global Solutions', 'United Kingdom', 'England', 'London', 'Consulting', '201-500', 'https://globalsol.co.uk'),
        ('InnovateLab', 'United States', 'California', 'Los Angeles', 'Research', '11-50', 'https://innovatelab.com'),
        ('DataFlow Systems', 'United States', 'Texas', 'Austin', 'Software', '51-200', 'https://dataflow.io')
      ON CONFLICT DO NOTHING
    `);
    
    const accountCount = await pool.query('SELECT account_id FROM accounts LIMIT 1');
    if (accountCount.rows.length > 0) {
      const accountId = accountCount.rows[0].account_id;
      
      await pool.query(`
        INSERT INTO contacts (first_name, last_name, job_title, email, linked_account_id, country, city)
        VALUES 
          ('John', 'Smith', 'CEO', 'john.smith@acmecorp.com', $1, 'United States', 'San Francisco'),
          ('Sarah', 'Johnson', 'CTO', 'sarah.j@acmecorp.com', $1, 'United States', 'San Francisco'),
          ('Mike', 'Brown', 'VP Sales', 'mike.brown@acmecorp.com', $1, 'United States', 'San Francisco')
        ON CONFLICT DO NOTHING
      `, [accountId]);
    }
    console.log('✅ Sample data inserted');
    
    // Get stats
    const accountStats = await pool.query('SELECT COUNT(*) FROM accounts');
    const contactStats = await pool.query('SELECT COUNT(*) FROM contacts');
    
    console.log('\n📊 Database Setup Complete!');
    console.log('Accounts:', accountStats.rows[0].count);
    console.log('Contacts:', contactStats.rows[0].count);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
