import React, { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Spinner, Pagination, Button, Badge, Row, Col, Form } from 'react-bootstrap';
import SearchBar from '../components/SearchBar';
import CompanyCard from '../components/CompanyCard';
import CompanyDetailsModal from '../components/CompanyDetailsModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Helper function to fetch with retry on 429
 */
const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Max retries reached');
};

/**
 * AccountsPage Component
 * Browse and filter company accounts
 */
function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    country: 'United States',
    state_region: '',
    city: '',
    district: '',
    industry: '',
    company_size: '',
    revenue: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    industries: [],
    companySizes: [],
    revenues: [],
    regions: [],
    cities: [],
    districts: []
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [accountsStats, setAccountsStats] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });

  const loadAccountsStats = async () => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts/stats`);
      const data = await response.json();
      setAccountsStats(data.data);
    } catch (error) {
      console.error('Failed to load accounts stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts/filter-options`);
      const data = await response.json();
      setFilterOptions(data.data);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const loadRegions = async (country) => {
    if (!country) {
      setFilterOptions(prev => ({ ...prev, regions: [], cities: [] }));
      return;
    }
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts/regions/${encodeURIComponent(country)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, regions: data.data, cities: [] }));
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const loadCities = async (country, region) => {
    if (!country || !region) {
      setFilterOptions(prev => ({ ...prev, cities: [], districts: [] }));
      return;
    }
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts/cities/${encodeURIComponent(country)}/${encodeURIComponent(region)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, cities: data.data, districts: [] }));
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  const loadDistricts = async (country, region, city) => {
    if (!country || !region || !city) {
      setFilterOptions(prev => ({ ...prev, districts: [] }));
      return;
    }
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts/districts/${encodeURIComponent(country)}/${encodeURIComponent(region)}/${encodeURIComponent(city)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, districts: data.data || [] }));
    } catch (error) {
      console.error('Failed to load districts:', error);
    }
  };

  const fetchAccounts = useCallback(async (query = '', appliedFilters = filters, newOffset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: newOffset
      });

      if (query) params.append('search', query);
      if (appliedFilters.country) params.append('country', appliedFilters.country);
      if (appliedFilters.state_region) params.append('state_region', appliedFilters.state_region);
      if (appliedFilters.city) params.append('city', appliedFilters.city);
      if (appliedFilters.district) params.append('district', appliedFilters.district);
      if (appliedFilters.industry) params.append('industry', appliedFilters.industry);
      if (appliedFilters.company_size) params.append('company_size', appliedFilters.company_size);
      if (appliedFilters.revenue) params.append('revenue', appliedFilters.revenue);

      const response = await fetchWithRetry(`${API_BASE_URL}/api/accounts?${params}`);
      const data = await response.json();

      setResults(data.data || []);
      setPagination({
        limit: pagination.limit,
        offset: newOffset,
        total: data.total || 0
      });
    } catch (err) {
      setError('Failed to fetch accounts. Please try again.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    // Stagger API calls to prevent 429 errors
    const initializePage = async () => {
      loadAccountsStats();
      await new Promise(resolve => setTimeout(resolve, 100));
      loadFilterOptions();
      await new Promise(resolve => setTimeout(resolve, 100));
      loadRegions('United States');
      await new Promise(resolve => setTimeout(resolve, 100));
      fetchAccounts();
    };
    
    initializePage();
    const interval = setInterval(loadAccountsStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    await fetchAccounts(query, filters, 0);
  };

  const handleFilterChange = async (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    if (filterName === 'country') {
      newFilters.state_region = '';
      newFilters.city = '';
      newFilters.district = '';
      await loadRegions(value);
      // For UK, don't apply state_region filter since UK data doesn't have it populated
      if (value === 'United Kingdom') {
        newFilters.state_region = '';
      }
    } else if (filterName === 'state_region') {
      newFilters.city = '';
      newFilters.district = '';
      // For UK regions (England, Scotland, etc), don't filter by state_region since UK data doesn't have it
      if (filters.country === 'United Kingdom') {
        newFilters.state_region = '';
      }
      await loadCities(filters.country, value);
    } else if (filterName === 'city') {
      newFilters.district = '';
      await loadDistricts(filters.country, filters.state_region, value);
    }
    
    await fetchAccounts(searchQuery, newFilters, 0);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      country: '',
      state_region: '',
      city: '',
      district: '',
      industry: '',
      company_size: '',
      revenue: ''
    };
    setFilters(clearedFilters);
    setSearchQuery('');
    setFilterOptions(prev => ({ ...prev, regions: [], cities: [], districts: [] }));
    fetchAccounts('', clearedFilters, 0);
  };

  const handleViewDetails = (account) => {
    setSelectedCompany(account);
    setShowDetailsModal(true);
  };

  const handlePageChange = async (newOffset) => {
    await fetchAccounts(searchQuery, filters, newOffset);
  };

  return (
    <Container fluid className="py-4">
      <Row>
        {/* Left Sidebar - Filters (1/4 width) */}
        <Col md={3} className="pe-4">
          <div className="mb-4">
            <h2 className="mb-2">📊 Accounts</h2>
            <p className="text-muted small">
              {accountsStats?.total?.toLocaleString() || '6M+'} companies
            </p>
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">🔍 Filters</h5>
              <Button variant="outline-secondary" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
            
            {/* Vertical Filters */}
            <div className="d-flex flex-column gap-3">
              <Form.Group>
                <Form.Label className="small fw-bold">Country</Form.Label>
                <Form.Select 
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  size="sm"
                >
                  <option value="">All Countries</option>
                  {(filterOptions.countries || []).map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">State/Region</Form.Label>
                <Form.Select 
                  value={filters.state_region}
                  onChange={(e) => handleFilterChange('state_region', e.target.value)}
                  disabled={!filters.country}
                  size="sm"
                >
                  <option value="">All Regions</option>
                  {(filterOptions.regions || []).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">City</Form.Label>
                <Form.Select 
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  disabled={!filters.state_region}
                  size="sm"
                >
                  <option value="">All Cities</option>
                  {(filterOptions.cities || []).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">District</Form.Label>
                <Form.Select 
                  value={filters.district}
                  onChange={(e) => handleFilterChange('district', e.target.value)}
                  disabled={!filters.city}
                  size="sm"
                >
                  <option value="">All Districts</option>
                  {(filterOptions.districts || []).map(district => (
                    <option key={district.name} value={district.name}>
                      {district.name} ({district.count})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">Industry</Form.Label>
                <Form.Select 
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                  size="sm"
                >
                  <option value="">All Industries</option>
                  {(filterOptions.industries || []).map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">Company Size</Form.Label>
                <Form.Select 
                  value={filters.company_size}
                  onChange={(e) => handleFilterChange('company_size', e.target.value)}
                  size="sm"
                >
                  <option value="">All Sizes</option>
                  {(filterOptions.companySizes || []).map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold">Revenue</Form.Label>
                <Form.Select 
                  value={filters.revenue}
                  onChange={(e) => handleFilterChange('revenue', e.target.value)}
                  size="sm"
                >
                  <option value="">All Revenues</option>
                  {(filterOptions.revenues || []).map(revenue => (
                    <option key={revenue} value={revenue}>{revenue}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
          </div>

          {accountsStats && (
            <Alert variant="info" className="mt-3 small" style={{
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              borderRadius: '10px'
            }}>
              <div>
                <strong className="small">📊 Stats</strong>
                <div className="mt-2 d-flex flex-column gap-1">
                  <Badge bg="success" className="w-100 text-start">
                    {accountsStats.total?.toLocaleString()} Total
                  </Badge>
                  <Badge bg="primary" className="w-100 text-start">
                    {accountsStats.withWebsite?.toLocaleString()} Websites
                  </Badge>
                  <Badge bg="primary" className="w-100 text-start">
                    {accountsStats.withPhone?.toLocaleString()} Phones
                  </Badge>
                  <Badge bg="info" className="w-100 text-start">
                    {accountsStats.countries?.toLocaleString()} Countries
                  </Badge>
                </div>
              </div>
            </Alert>
          )}
        </Col>

        {/* Right Content Area (3/4 width) */}
        <Col md={9}>
          <div className="mb-4">
            <SearchBar 
              onSearch={handleSearch} 
              loading={loading}
              placeholder="Search accounts by company name..."
            />
          </div>

          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" className="mb-3">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="text-muted">Searching accounts...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    📋 Results: {pagination.total.toLocaleString()} accounts found
                  </h5>
                  <small className="text-muted">
                    Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)}
                  </small>
                </div>
                <Row>
                  {results.map((account) => (
                    <Col key={account.account_id} md={6} lg={4} className="mb-4">
                      <CompanyCard
                        company={{
                          id: account.account_id,
                          company_number: account.account_id,
                          name: account.company_name,
                          address_line_1: account.address,
                          locality: account.city,
                          region: account.state_region,
                          country: account.country,
                          website: account.website,
                          phone: account.phone_number,
                          industry: account.industry,
                          company_size: account.company_size,
                          revenue: account.revenue,
                          status: 'Active'
                        }}
                        onViewDetails={() => handleViewDetails(account)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>

              {pagination.total > pagination.limit && (
                <div className="d-flex justify-content-center">
                  <Pagination>
                    <Pagination.First
                      onClick={() => handlePageChange(0)}
                      disabled={pagination.offset === 0}
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                      disabled={pagination.offset === 0}
                    />
                    
                    {[...Array(Math.min(5, Math.ceil(pagination.total / pagination.limit)))].map((_, idx) => {
                      const currentPage = Math.floor(pagination.offset / pagination.limit);
                      const startPage = Math.max(0, currentPage - 2);
                      const pageNum = startPage + idx;
                      const offset = pageNum * pagination.limit;
                      
                      if (offset >= pagination.total) return null;
                      
                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pagination.offset === offset}
                          onClick={() => handlePageChange(offset)}
                        >
                          {pageNum + 1}
                        </Pagination.Item>
                      );
                    })}
                    
                    <Pagination.Next
                      onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                      disabled={pagination.offset + pagination.limit >= pagination.total}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(Math.floor(pagination.total / pagination.limit) * pagination.limit)}
                      disabled={pagination.offset + pagination.limit >= pagination.total}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}

          {!loading && results.length === 0 && !error && (
            <Alert variant="info" className="text-center py-5">
              <h5>No accounts found</h5>
              <p className="mb-0">Try adjusting your filters or search query</p>
            </Alert>
          )}

          {selectedCompany && (
            <CompanyDetailsModal
              show={showDetailsModal}
              onHide={() => {
                setShowDetailsModal(false);
                setSelectedCompany(null);
              }}
              company={{
                id: selectedCompany.account_id,
                company_number: selectedCompany.account_id,
                name: selectedCompany.company_name,
                address_line_1: selectedCompany.address,
                locality: selectedCompany.city,
                region: selectedCompany.state_region,
                country: selectedCompany.country,
                website: selectedCompany.website,
                phone: selectedCompany.phone_number,
                email: selectedCompany.email_format,
                industry: selectedCompany.industry,
                company_size: selectedCompany.company_size,
                revenue: selectedCompany.revenue,
                linkedin_url: selectedCompany.linkedin_url,
                company_category: selectedCompany.company_category
              }}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default AccountsPage;
