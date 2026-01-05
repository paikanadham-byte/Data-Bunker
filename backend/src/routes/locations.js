/**
 * Locations API Route
 * Endpoint: /api/locations
 */

const express = require('express');
const router = express.Router();
const locationsData = require('../../../data/locations/index.json');

/**
 * GET /api/locations/countries
 * Get all supported countries
 */
router.get('/countries', (req, res) => {
  try {
    const countries = locationsData.countries.map(country => ({
      code: country.code,
      name: country.name,
      region: country.region,
      dataSource: country.dataSource
    }));

    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    console.error('[LOCATIONS ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'locations_error'
    });
  }
});

/**
 * GET /api/locations/countries/:countryCode/states
 * Get states/provinces for a country
 */
router.get('/countries/:countryCode/states', (req, res) => {
  try {
    const { countryCode } = req.params;
    const country = locationsData.countries.find(c => c.code === countryCode.toLowerCase());

    if (!country) {
      return res.status(404).json({
        error: 'Country not found',
        supportedCountries: locationsData.countries.map(c => c.code)
      });
    }

    const states = country.states.map(state => ({
      code: state.code,
      name: state.name
    }));

    res.json({
      success: true,
      country: country.name,
      data: states
    });
  } catch (error) {
    console.error('[STATES ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'states_error'
    });
  }
});

/**
 * GET /api/locations/countries/:countryCode/states/:stateCode/cities
 * Get cities for a state/province
 */
router.get('/countries/:countryCode/states/:stateCode/cities', (req, res) => {
  try {
    const { countryCode, stateCode } = req.params;
    const country = locationsData.countries.find(c => c.code === countryCode.toLowerCase());

    if (!country) {
      return res.status(404).json({
        error: 'Country not found'
      });
    }

    const state = country.states.find(s => s.code === stateCode.toLowerCase());

    if (!state) {
      return res.status(404).json({
        error: 'State not found',
        availableStates: country.states.map(s => s.code)
      });
    }

    const cities = state.cities.map(city => ({
      name: city.name
    }));

    res.json({
      success: true,
      country: country.name,
      state: state.name,
      data: cities
    });
  } catch (error) {
    console.error('[CITIES ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'cities_error'
    });
  }
});

/**
 * GET /api/locations/countries/:countryCode/states/:stateCode/cities/:cityName/districts
 * Get districts for a city
 */
router.get('/countries/:countryCode/states/:stateCode/cities/:cityName/districts', (req, res) => {
  try {
    const { countryCode, stateCode, cityName } = req.params;
    const country = locationsData.countries.find(c => c.code === countryCode.toLowerCase());

    if (!country) {
      return res.status(404).json({
        error: 'Country not found'
      });
    }

    const state = country.states.find(s => s.code === stateCode.toLowerCase());

    if (!state) {
      return res.status(404).json({
        error: 'State not found'
      });
    }

    const city = state.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());

    if (!city) {
      return res.status(404).json({
        error: 'City not found',
        availableCities: state.cities.map(c => c.name)
      });
    }

    res.json({
      success: true,
      country: country.name,
      state: state.name,
      city: city.name,
      data: city.districts || []
    });
  } catch (error) {
    console.error('[DISTRICTS ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'districts_error'
    });
  }
});

/**
 * GET /api/locations/industries
 * Get all supported industries
 */
router.get('/industries', (req, res) => {
  try {
    const industries = [
      'Technology',
      'Finance & Banking',
      'Healthcare',
      'Retail',
      'Manufacturing',
      'Real Estate',
      'Energy',
      'Transportation',
      'Education',
      'Hospitality',
      'Legal Services',
      'Consulting',
      'Media & Entertainment',
      'Telecommunications',
      'Agriculture',
      'Construction',
      'Insurance',
      'Automotive',
      'Pharmaceuticals',
      'Other'
    ];

    res.json({
      success: true,
      data: industries
    });
  } catch (error) {
    console.error('[INDUSTRIES ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'industries_error'
    });
  }
});

module.exports = router;
