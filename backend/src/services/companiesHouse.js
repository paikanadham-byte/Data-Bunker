/**
 * Companies House API Service (UK)
 * https://developer.companieshouse.gov.uk/
 */

const axios = require('axios');
const cache = require('../utils/cache');
const RateLimiter = require('../utils/rateLimiter');

const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const BASE_URL = 'https://api.companieshouse.gov.uk';
const API_AUTH = Buffer.from(`${API_KEY}:`).toString('base64');

// Rate limiter: 10 requests per 10 seconds
const rateLimiter = new RateLimiter(10, 10000);

class CompaniesHouseService {
  /**
   * Search companies by name
   */
  async searchCompanies(query, options = {}) {
    if (!API_KEY) {
      throw new Error('Companies House API key not configured');
    }

    const params = { query, ...options };
    
    // Check cache
    const cached = cache.get('companieshouse:search', params);
    if (cached) return cached;

    // Check rate limit
    if (!rateLimiter.isAllowed('companieshouse')) {
      throw new Error('Rate limit exceeded for Companies House API');
    }

    try {
      const searchParams = {
        q: query,
        items_per_page: options.limit || 20,
        start_index: options.offset || 0,
        company_status: options.status || 'active'
      };

      const response = await axios.get(`${BASE_URL}/search/companies`, {
        params: searchParams,
        headers: {
          'Authorization': `Basic ${API_AUTH}`,
          'User-Agent': 'DataBunker/1.0'
        },
        timeout: 10000
      });

      const formatted = this._formatSearchResults(response.data);
      cache.set('companieshouse:search', params, formatted, 3600); // Cache for 1 hour
      return formatted;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Get company details
   */
  async getCompanyDetails(companyNumber) {
    if (!API_KEY) {
      throw new Error('Companies House API key not configured');
    }

    const params = { companyNumber };
    
    // Check cache
    const cached = cache.get('companieshouse:details', params);
    if (cached) return cached;

    // Check rate limit
    if (!rateLimiter.isAllowed('companieshouse')) {
      throw new Error('Rate limit exceeded for Companies House API');
    }

    try {
      const response = await axios.get(`${BASE_URL}/company/${companyNumber}`, {
        headers: {
          'Authorization': `Basic ${API_AUTH}`,
          'User-Agent': 'DataBunker/1.0'
        },
        timeout: 10000
      });

      const formatted = this._formatCompanyDetails(response.data);
      cache.set('companieshouse:details', params, formatted, 86400); // Cache for 24 hours
      return formatted;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Get company officers/directors
   */
  async getCompanyOfficers(companyNumber) {
    if (!API_KEY) {
      throw new Error('Companies House API key not configured');
    }

    const params = { companyNumber };
    
    // Check cache
    const cached = cache.get('companieshouse:officers', params);
    if (cached) return cached;

    // Check rate limit
    if (!rateLimiter.isAllowed('companieshouse')) {
      throw new Error('Rate limit exceeded for Companies House API');
    }

    try {
      const response = await axios.get(`${BASE_URL}/company/${companyNumber}/officers`, {
        headers: {
          'Authorization': `Basic ${API_AUTH}`,
          'User-Agent': 'DataBunker/1.0'
        },
        timeout: 10000
      });

      const formatted = this._formatOfficers(response.data);
      cache.set('companieshouse:officers', params, formatted, 86400);
      return formatted;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Format search results
   */
  _formatSearchResults(data) {
    if (!data.items) return { companies: [], total: 0 };

    return {
      companies: data.items.map(item => ({
        id: item.company_number,
        name: item.title,
        registrationNumber: item.company_number,
        status: item.company_status,
        type: item.company_type,
        matched: item.matched_header || item.title,
        url: item.links?.company_profile || `https://beta.companieshouse.gov.uk/company/${item.company_number}`,
        source: 'Companies House'
      })),
      total: data.start_index + (data.items?.length || 0),
      pageSize: data.items_per_page
    };
  }

  /**
   * Format company details
   */
  _formatCompanyDetails(data) {
    return {
      id: data.company_number,
      name: data.company_name,
      registrationNumber: data.company_number,
      status: data.company_status,
      type: data.type,
      incorporationDate: data.date_of_creation,
      jurisdiction: 'United Kingdom (England)',
      registeredOffice: this._formatAddress(data.registered_office_address),
      sicCodes: data.sic_codes || [],
      sicDescription: data.sic_codes?.[0] || 'Unknown',
      countOfOfficers: data.appointment_count,
      accounts: {
        lastFilingDate: data.last_accounts?.period_end_on,
        overdue: data.accounts?.overdue
      },
      return: {
        lastFilingDate: data.last_return?.period_end_on,
        overdue: data.last_return?.overdue
      },
      url: `https://beta.companieshouse.gov.uk/company/${data.company_number}`,
      source: 'Companies House'
    };
  }

  /**
   * Format address
   */
  _formatAddress(addressData) {
    if (!addressData) return null;

    const parts = [
      addressData.address_line_1,
      addressData.address_line_2,
      addressData.locality,
      addressData.region,
      addressData.postal_code,
      addressData.country
    ].filter(Boolean);

    return {
      full: parts.join(', '),
      line1: addressData.address_line_1,
      city: addressData.locality,
      state: addressData.region,
      postalCode: addressData.postal_code,
      country: addressData.country || 'United Kingdom'
    };
  }

  /**
   * Format officers/directors
   */
  _formatOfficers(data) {
    if (!data.items) return { officers: [] };

    return {
      officers: data.items.map(officer => ({
        name: officer.name,
        position: officer.officer_role,
        appointmentDate: officer.appointed_on,
        resignationDate: officer.resigned_on,
        nationality: officer.nationality,
        occupation: officer.occupation,
        address: officer.address ? this._formatAddress(officer.address) : null
      }))
    };
  }

  /**
   * Handle API errors
   */
  _handleError(error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error('Invalid search parameters');
        case 401:
          throw new Error('Unauthorized - API key invalid');
        case 404:
          throw new Error('Company not found');
        case 429:
          throw new Error('Rate limit exceeded');
        default:
          throw new Error(`API error: ${error.response.status}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('API request timeout');
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

module.exports = new CompaniesHouseService();
