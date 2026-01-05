/**
 * Search API Route
 * Endpoint: /api/search
 */

const express = require('express');
const router = express.Router();
const googleSearchService = require('../services/googleSearchService');
const { validateSearch } = require('../utils/validators');

/**
 * GET /api/search
 * Search for companies by name and hierarchical location filters
 * 
 * Query Parameters:
 *   - query (required): company name to search
 *   - country (optional): 2-letter country code
 *   - state (optional): state/province code
 *   - city (optional): city name
 *   - district (optional): district/local area name
 *   - limit (optional): results per page (default: 20)
 *   - offset (optional): pagination offset (default: 0)
 * 
 * Example:
 *   GET /api/search?query=Google&country=us&state=ca&city=Mountain View&limit=10
 */
router.get('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = validateSearch({
      query: req.query.query,
      country: req.query.country,
      state: req.query.state,
      city: req.query.city,
      district: req.query.district,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { query, country, state, city, district, limit, offset } = value;

    console.log(`[SEARCH] Query: "${query}", Location: ${country || 'global'} → ${state || '-'} → ${city || '-'} → ${district || '-'}`);

    // Use Google Custom Search for all queries
    const results = await googleSearchService.searchCompanies(query, {
      country,
      state,
      city,
      district,
      limit,
      offset
    });

    res.json({
      success: true,
      query,
      location: {
        country: country || 'global',
        state: state || null,
        city: city || null,
        district: district || null
      },
      data: results
    });
  } catch (error) {
    console.error('[SEARCH ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'search_error'
    });
  }
});

/**
 * GET /api/search/by-location
 * Search companies by location
 * 
 * Query Parameters:
 *   - country (required)
 *   - state (optional)
 *   - city (optional)
 *   - limit (optional): results per page
 * 
 * Example:
 *   GET /api/search/by-location?country=gb&state=eng&city=London
 */
router.get('/by-location', async (req, res) => {
  try {
    const { country, state, city, limit = 20, offset = 0 } = req.query;

    if (!country) {
      return res.status(400).json({
        error: 'Country is required'
      });
    }

    // Build location query
    const locationParts = [city, state, country].filter(Boolean);
    const locationQuery = locationParts.join(', ');

    console.log(`[LOCATION SEARCH] ${locationQuery}`);

    let results = {};

    if (country === 'gb') {
      results = await companiesHouse.searchCompanies(locationQuery, { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
    } else {
      results = await openCorporates.searchCompanies(locationQuery, { 
        country,
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
    }

    res.json({
      success: true,
      location: { country, state, city },
      data: results
    });
  } catch (error) {
    console.error('[LOCATION SEARCH ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'location_search_error'
    });
  }
});

module.exports = router;
