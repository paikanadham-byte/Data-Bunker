/**
 * Accounts Routes
 * API endpoints for Account management and filtering
 */

const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const locations = require('../data/locations');

/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      country,
      state_region,
      city,
      district,
      industry,
      company_size,
      search,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = req.query;

    const filters = {
      country,
      state_region,
      city,
      district,
      industry,
      company_size,
      search
    };

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy,
      orderDirection
    };

    const result = await Account.findAll(filters, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/stats
 * Get account statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Account.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/filter-options
 * Get available filter options (countries, industries, sizes)
 */
router.get('/filter-options', async (req, res) => {
  try {
    const options = await Account.getFilterOptions();
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/regions/:country
 * Get states/regions for a specific country
 */
router.get('/regions/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    // First try comprehensive locations data
    if (locations[country]) {
      const regions = Object.keys(locations[country]).sort();
      return res.json({
        success: true,
        data: regions
      });
    }
    
    // Fallback to database
    const regions = await Account.getRegionsByCountry(country);
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regions',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/cities/:country/:region
 * Get cities for a specific country and region
 */
router.get('/cities/:country/:region', async (req, res) => {
  try {
    const { country, region } = req.params;
    
    // First try comprehensive locations data
    if (locations[country] && locations[country][region]) {
      const cities = locations[country][region].sort();
      return res.json({
        success: true,
        data: cities
      });
    }
    
    // Fallback to database
    const cities = await Account.getCitiesByRegion(country, region);
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cities',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/districts/:country/:region/:city
 * Get districts/neighborhoods for a specific city
 */
router.get('/districts/:country/:region/:city', async (req, res) => {
  try {
    const { country, region, city } = req.params;
    const { pool } = require('../db/connection');
    
    // Extract distinct districts from addresses
    const result = await pool.query(`
      SELECT DISTINCT 
        TRIM(SPLIT_PART(address, ',', 1)) as district,
        COUNT(*) as company_count
      FROM accounts 
      WHERE country = $1 
        AND state_region = $2 
        AND city = $3
        AND address IS NOT NULL
        AND address != ''
      GROUP BY TRIM(SPLIT_PART(address, ',', 1))
      HAVING TRIM(SPLIT_PART(address, ',', 1)) != ''
      ORDER BY company_count DESC
      LIMIT 100
    `, [country, region, city]);
    
    res.json({
      success: true,
      data: result.rows.map(r => ({
        name: r.district,
        count: parseInt(r.company_count)
      }))
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch districts',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/:id
 * Get single account by ID with contacts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account',
      message: error.message
    });
  }
});

/**
 * POST /api/accounts
 * Create new account
 */
router.post('/', async (req, res) => {
  try {
    const accountData = req.body;

    // Validate required fields
    if (!accountData.company_name || accountData.company_name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'company_name is required and cannot be empty'
      });
    }

    const account = await Account.create(accountData);

    res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
      message: error.message
    });
  }
});

/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const accountData = req.body;

    // Validate company_name if provided
    if (accountData.company_name !== undefined && accountData.company_name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'company_name cannot be empty'
      });
    }

    const account = await Account.update(id, accountData);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update account',
      message: error.message
    });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete account (cascades to contacts)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.delete(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
      data: account
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
});

module.exports = router;
