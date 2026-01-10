/**
 * Account Model
 * Handles all database operations for Accounts (Companies)
 */

const { pool } = require('../db/connection');
const { getLinkedInCategories, getNAICSCodesForCategory } = require('../data/industry-mapping');

class Account {
  /**
   * Get all accounts with filtering and pagination
   */
  static async findAll(filters = {}, options = {}) {
    const {
      country,
      state_region,
      city,
      district,
      industry,
      company_size,
      revenue,
      search
    } = filters;

    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;

    let query = 'SELECT * FROM accounts WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Add filters
    if (country) {
      query += ` AND country = $${paramCount++}`;
      params.push(country);
    }

    if (state_region) {
      query += ` AND state_region = $${paramCount++}`;
      params.push(state_region);
    }

    if (city) {
      query += ` AND city = $${paramCount++}`;
      params.push(city);
    }

    if (district) {
      query += ` AND (address ILIKE $${paramCount} OR city ILIKE $${paramCount})`;
      params.push(`%${district}%`);
      paramCount++;
    }

    if (industry) {
      // Map LinkedIn category to NAICS codes
      const naicsCodes = getNAICSCodesForCategory(industry);
      if (naicsCodes && naicsCodes.length > 0) {
        // Match any NAICS code that starts with one of the mapped codes
        const conditions = naicsCodes.map((code, idx) => `industry LIKE $${paramCount + idx}`);
        query += ` AND (${conditions.join(' OR ')})`;
        naicsCodes.forEach(code => params.push(`${code}%`));
        paramCount += naicsCodes.length;
      } else {
        // If no mapping found, search as-is
        query += ` AND industry ILIKE $${paramCount++}`;
        params.push(`%${industry}%`);
      }
    }

    if (company_size) {
      query += ` AND company_size = $${paramCount++}`;
      params.push(company_size);
    }

    if (revenue) {
      query += ` AND revenue = $${paramCount++}`;
      params.push(revenue);
    }

    if (search) {
      query += ` AND (company_name ILIKE $${paramCount} OR website ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add ordering
    query += ` ORDER BY ${orderBy} ${orderDirection}`;

    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM accounts WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;
    
    if (country) {
      countQuery += ` AND country = $${countParamCount++}`;
      countParams.push(country);
    }
    if (state_region) {
      countQuery += ` AND state_region = $${countParamCount++}`;
      countParams.push(state_region);
    }
    if (city) {
      countQuery += ` AND city = $${countParamCount++}`;
      countParams.push(city);
    }
    if (district) {
      countQuery += ` AND (address ILIKE $${countParamCount} OR city ILIKE $${countParamCount})`;
      countParams.push(`%${district}%`);
      countParamCount++;
    }
    if (industry) {
      // Map LinkedIn category to NAICS codes
      const naicsCodes = getNAICSCodesForCategory(industry);
      if (naicsCodes && naicsCodes.length > 0) {
        const conditions = naicsCodes.map((code, idx) => `industry LIKE $${countParamCount + idx}`);
        countQuery += ` AND (${conditions.join(' OR ')})`;
        naicsCodes.forEach(code => countParams.push(`${code}%`));
        countParamCount += naicsCodes.length;
      } else {
        countQuery += ` AND industry ILIKE $${countParamCount++}`;
        countParams.push(`%${industry}%`);
      }
    }
    if (company_size) {
      countQuery += ` AND company_size = $${countParamCount++}`;
      countParams.push(company_size);
    }
    if (revenue) {
      countQuery += ` AND revenue = $${countParamCount++}`;
      countParams.push(revenue);
    }
    if (search) {
      countQuery += ` AND (company_name ILIKE $${countParamCount} OR website ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get account by ID with contacts
   */
  static async findById(accountId) {
    const accountQuery = 'SELECT * FROM accounts WHERE account_id = $1';
    const contactsQuery = 'SELECT * FROM contacts WHERE linked_account_id = $1';

    const [accountResult, contactsResult] = await Promise.all([
      pool.query(accountQuery, [accountId]),
      pool.query(contactsQuery, [accountId])
    ]);

    if (accountResult.rows.length === 0) {
      return null;
    }

    return {
      ...accountResult.rows[0],
      contacts: contactsResult.rows
    };
  }

  /**
   * Create new account
   */
  static async create(accountData) {
    const {
      company_name,
      industry,
      company_size,
      country,
      state_region,
      city,
      address,
      website,
      phone_number,
      email_format,
      revenue,
      linkedin_url,
      company_category
    } = accountData;

    const query = `
      INSERT INTO accounts (
        company_name, industry, company_size, country, state_region,
        city, address, website, phone_number, email_format, revenue,
        linkedin_url, company_category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      company_name, industry, company_size, country, state_region,
      city, address, website, phone_number, email_format, revenue,
      linkedin_url, company_category
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update account
   */
  static async update(accountId, accountData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(accountData).forEach(key => {
      if (accountData[key] !== undefined && key !== 'account_id') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(accountData[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(accountId);

    const query = `
      UPDATE accounts
      SET ${fields.join(', ')}
      WHERE account_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete account (cascades to contacts)
   */
  static async delete(accountId) {
    const query = 'DELETE FROM accounts WHERE account_id = $1 RETURNING *';
    const result = await pool.query(query, [accountId]);
    return result.rows[0];
  }

  /**
   * Get filter options (distinct values for dropdowns)
   */
  static async getFilterOptions() {
    const queries = {
      countries: 'SELECT DISTINCT country FROM accounts WHERE country IS NOT NULL ORDER BY country',
      companySizes: 'SELECT DISTINCT company_size FROM accounts WHERE company_size IS NOT NULL ORDER BY company_size',
      revenues: 'SELECT DISTINCT revenue FROM accounts WHERE revenue IS NOT NULL ORDER BY revenue'
    };

    const [countries, companySizes, revenues] = await Promise.all([
      pool.query(queries.countries),
      pool.query(queries.companySizes),
      pool.query(queries.revenues)
    ]);

    return {
      countries: countries.rows.map(r => r.country),
      industries: getLinkedInCategories(), // Use LinkedIn professional categories
      companySizes: companySizes.rows.map(r => r.company_size),
      revenues: revenues.rows.map(r => r.revenue),
      regions: [],
      cities: []
    };
  }

  /**
   * Get states/regions for a country
   */
  static async getRegionsByCountry(country) {
    const query = `
      SELECT DISTINCT state_region 
      FROM accounts 
      WHERE country = $1 AND state_region IS NOT NULL 
      ORDER BY state_region
    `;
    const result = await pool.query(query, [country]);
    return result.rows.map(r => r.state_region);
  }

  /**
   * Get cities for a region
   */
  static async getCitiesByRegion(country, state_region) {
    const query = `
      SELECT DISTINCT city 
      FROM accounts 
      WHERE country = $1 AND state_region = $2 AND city IS NOT NULL 
      ORDER BY city
    `;
    const result = await pool.query(query, [country, state_region]);
    return result.rows.map(r => r.city);
  }

  /**
   * Get statistics
   */
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT country) as countries,
        COUNT(DISTINCT industry) as industries,
        COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END) as "withWebsite",
        COUNT(CASE WHEN phone_number IS NOT NULL AND phone_number != '' THEN 1 END) as "withPhone",
        COUNT(CASE WHEN email_format IS NOT NULL AND email_format != '' THEN 1 END) as "withEmail"
      FROM accounts
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Account;
