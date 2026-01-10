import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  config => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor
api.interceptors.response.use(
  response => {
    console.log(`[API] Response:`, response.data);
    return response;
  },
  error => {
    console.error(`[API ERROR]`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const searchService = {
  // Use database endpoints (no API keys required!)
  searchCompanies: (query, country, state, city, district, limit = 20, offset = 0) =>
    api.get('/db/search', {
      params: { 
        query, 
        country, 
        region: state,  // Database uses 'region' instead of 'state'
        locality: city, // Database uses 'locality' instead of 'city'
        limit, 
        offset 
      }
    }),

  searchByLocation: (country, state, city, limit = 20) =>
    api.get('/db/search', {
      params: { 
        country, 
        region: state,
        locality: city,
        limit 
      }
    })
};

export const companyService = {
  // Use database endpoints (no API keys required!)
  getDetails: (companyNumber, country) =>
    api.get(`/db/companies/${companyNumber}`),

  getOfficers: (companyNumber, country) =>
    api.get(`/officers/${companyNumber}`, {
      params: { country }
    })
};

export const locationService = {
  getCountries: () =>
    api.get('/locations/countries'),

  getStates: (countryCode) =>
    api.get(`/locations/countries/${countryCode}/states`),

  getCities: (countryCode, stateCode) =>
    api.get(`/locations/countries/${countryCode}/states/${stateCode}/cities`),

  getDistricts: (countryCode, stateCode, cityName) =>
    api.get(`/locations/countries/${countryCode}/states/${stateCode}/cities/${encodeURIComponent(cityName)}/districts`),

  getIndustries: () =>
    api.get('/locations/industries')
};

export const enrichmentService = {
  getStats: () =>
    api.get('/enrichment/stats')
};

export default api;
