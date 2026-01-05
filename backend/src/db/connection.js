/**
 * PostgreSQL Database Connection & Pool Manager
 * Handles all database operations with connection pooling
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Database pool configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'data_bunker',
  max: parseInt(process.env.DB_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection event handlers
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('✓ Database connection established');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

/**
 * Execute a query with connection from pool
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB Query] ${duration}ms - ${text.substring(0, 50)}...`);
    return result;
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  }
};

/**
 * Execute multiple queries in a transaction
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction Error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Initialize database schema from migration files
 */
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database schema...');
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`  → Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Check database connection
 */
const checkConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const stats = {
      companies: await query('SELECT COUNT(*) FROM companies'),
      contacts: await query('SELECT COUNT(*) FROM contacts'),
      countries: await query('SELECT COUNT(*) FROM countries'),
      updates: await query('SELECT COUNT(*) FROM update_log'),
      pool: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
    return stats;
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return null;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await pool.end();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  initializeDatabase,
  checkConnection,
  getDatabaseStats,
  closeConnection,
};
