import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
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
  searchCompanies: (query, country, state, city, district, limit = 20, offset = 0) =>
    api.get('/search', {
      params: { query, country, state, city, district, limit, offset }
    }),

  searchByLocation: (country, state, city, limit = 20) =>
    api.get('/search/by-location', {
      params: { country, state, city, limit }
    })
};

export const companyService = {
  getDetails: (companyNumber, country) =>
    api.get(`/companies/${companyNumber}`, {
      params: { country }
    }),

  getOfficers: (companyNumber, country) =>
    api.get(`/companies/${companyNumber}/officers`, {
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

export default api;
