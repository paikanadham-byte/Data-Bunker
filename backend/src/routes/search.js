/**
 * Search API Route
 * Endpoint: /api/search
 */

const express = require('express');
const router = express.Router();
const companiesHouse = require('../services/companiesHouse');
const openCorporates = require('../services/openCorporates');
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

    let results = {};

    // Use Companies House for UK searches, OpenCorporates for other countries
    if (country && (country.toLowerCase() === 'gb' || country.toLowerCase() === 'uk')) {
      console.log('[SEARCH] Using Companies House API');
      results = await companiesHouse.searchCompanies(query, { limit, offset });
    } else if (country) {
      console.log('[SEARCH] Using OpenCorporates API');
      results = await openCorporates.searchCompanies(query, { country, limit, offset });
    } else {
      console.log('[SEARCH] Using Google Custom Search');
      results = await googleSearchService.searchCompanies(query, {
        country,
        state,
        city,
        district,
        limit,
        offset
      });
    }

    console.log(`[SEARCH] Found ${results.companies?.length || 0} companies`);

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
    console.error('[SEARCH ERROR]', {
      message: error.message,
      query: req.query.query,
      country: req.query.country
    });
    res.status(500).json({
      success: false,
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

    if (country.toLowerCase() === 'gb' || country.toLowerCase() === 'uk') {
      console.log('[LOCATION SEARCH] Using Companies House API');
      results = await companiesHouse.searchCompanies(locationQuery, { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
    } else {
      console.log('[LOCATION SEARCH] Using OpenCorporates API');
      results = await openCorporates.searchCompanies(locationQuery, { 
        country,
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
    }

    console.log(`[LOCATION SEARCH] Found ${results.companies?.length || 0} companies`);

    res.json({
      success: true,
      location: { country, state, city },
      data: results
    });
  } catch (error) {
    console.error('[LOCATION SEARCH ERROR]', {
      message: error.message,
      country: req.query.country
    });
    res.status(500).json({
      success: false,
      error: error.message,
      type: 'location_search_error'
    });
  }
});

module.exports = router;
