/**
 * Companies API Route
 * Endpoint: /api/companies
 */

const express = require('express');
const router = express.Router();
const companiesHouse = require('../services/companiesHouse');
const openCorporates = require('../services/openCorporates');

/**
 * GET /api/companies/:companyNumber
 * Get detailed company information
 * 
 * Parameters:
 *   - companyNumber (required): company registration number
 *   - country (required): 2-letter country code
 * 
 * Example:
 *   GET /api/companies/03404908?country=gb
 */
router.get('/:companyNumber', async (req, res) => {
  try {
    const { companyNumber } = req.params;
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({
        error: 'Country parameter is required'
      });
    }

    if (!companyNumber) {
      return res.status(400).json({
        error: 'Company number is required'
      });
    }

    console.log(`[COMPANY DETAILS] ${companyNumber} (${country})`);

    let companyDetails = {};

    if (country === 'gb') {
      companyDetails = await companiesHouse.getCompanyDetails(companyNumber);
    } else {
      companyDetails = await openCorporates.getCompanyDetails(companyNumber, country);
    }

    res.json({
      success: true,
      data: companyDetails
    });
  } catch (error) {
    console.error('[COMPANY DETAILS ERROR]', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Company not found',
        type: 'not_found'
      });
    }

    res.status(500).json({
      error: error.message,
      type: 'company_details_error'
    });
  }
});

/**
 * GET /api/companies/:companyNumber/officers
 * Get company officers/directors
 * 
 * Parameters:
 *   - companyNumber (required): company registration number
 *   - country (required): 2-letter country code
 * 
 * Example:
 *   GET /api/companies/03404908/officers?country=gb
 */
router.get('/:companyNumber/officers', async (req, res) => {
  try {
    const { companyNumber } = req.params;
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({
        error: 'Country parameter is required'
      });
    }

    if (country !== 'gb') {
      return res.status(400).json({
        error: 'Officers information only available for UK companies'
      });
    }

    console.log(`[COMPANY OFFICERS] ${companyNumber}`);

    const officers = await companiesHouse.getCompanyOfficers(companyNumber);

    res.json({
      success: true,
      data: officers
    });
  } catch (error) {
    console.error('[COMPANY OFFICERS ERROR]', error.message);
    res.status(500).json({
      error: error.message,
      type: 'officers_error'
    });
  }
});

module.exports = router;
