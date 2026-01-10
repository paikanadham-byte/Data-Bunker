import React, { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Spinner, Pagination, Button, Badge, Row, Col, Form } from 'react-bootstrap';
import SearchBar from '../components/SearchBar';
import CompanyCard from '../components/CompanyCard';
import CompanyDetailsModal from '../components/CompanyDetailsModal';
import AIAssistant from '../components/AIAssistant';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * SearchPage Component
 * Main page for accounts with advanced filtering
 */
function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    state_region: '',
    city: '',
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
    cities: []
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [accountsStats, setAccountsStats] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });

  // Load accounts stats and filter options on mount
  useEffect(() => {
    loadAccountsStats();
    loadFilterOptions();
    fetchAccounts(); // Load initial accounts
    const interval = setInterval(loadAccountsStats, 30000);
    return () => clearInterval(interval);
  }, [fetchAccounts]);

  const loadAccountsStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/stats`);
      const data = await response.json();
      setAccountsStats(data.data);
    } catch (error) {
      console.error('Failed to load accounts stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/filter-options`);
      const data = await response.json();
      setFilterOptions(data.data);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  // Load regions when country changes
  const loadRegions = async (country) => {
    if (!country) {
      setFilterOptions(prev => ({ ...prev, regions: [], cities: [] }));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/regions/${encodeURIComponent(country)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, regions: data.data, cities: [] }));
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  // Load cities when region changes
  const loadCities = async (country, region) => {
    if (!country || !region) {
      setFilterOptions(prev => ({ ...prev, cities: [] }));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/cities/${encodeURIComponent(country)}/${encodeURIComponent(region)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, cities: data.data }));
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  // Handle search by name
  const handleSearch = async (query) => {
    setSearchQuery(query);
    await fetchAccounts(query, filters, 0);
  };

  // Handle filter change
  const handleFilterChange = async (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Load dependent dropdowns
    if (filterName === 'country') {
      newFilters.state_region = '';
      newFilters.city = '';
      await loadRegions(value);
    } else if (filterName === 'state_region') {
      newFilters.city = '';
      await loadCities(filters.country, value);
    }
    
    await fetchAccounts(searchQuery, newFilters, 0);
  };

  // Fetch accounts with filters
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
      if (appliedFilters.industry) params.append('industry', appliedFilters.industry);
      if (appliedFilters.company_size) params.append('company_size', appliedFilters.company_size);
      if (appliedFilters.revenue) params.append('revenue', appliedFilters.revenue);

      const response = await fetch(`${API_BASE_URL}/api/accounts?${params}`);
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
  }, [filters, pagination.limit]);

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      country: '',
      state_region: '',
      city: '',
      industry: '',
      company_size: '',
      revenue: ''
    };
    setFilters(clearedFilters);
    setSearchQuery('');
    setFilterOptions(prev => ({ ...prev, regions: [], cities: [] }));
    fetchAccounts('', clearedFilters, 0);
  };

  // View company details
  const handleViewDetails = (company) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const handlePageChange = async (newOffset) => {
    await fetchAccounts(searchQuery, filters, newOffset);
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="display-5 fw-bold mb-2">📊 Accounts Database</h1>
        <p className="lead text-muted">
          Filter and search through {accountsStats?.total?.toLocaleString() || '6M+'} company accounts
        </p>
        
        {/* Stats Banner */}
        {accountsStats && (
          <Alert variant="info" className="mt-3" style={{
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            borderRadius: '10px'
          }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <strong>🎯 Database Overview</strong>
                <div className="mt-1 small">
                  <Badge bg="success" className="me-2">
                    {accountsStats.total?.toLocaleString()} Total Accounts
                  </Badge>
                  <Badge bg="primary" className="me-2">
                    {accountsStats.withWebsite?.toLocaleString()} With Websites
                  </Badge>
                  <Badge bg="primary" className="me-2">
                    {accountsStats.withPhone?.toLocaleString()} With Phone
                  </Badge>
                  <Badge bg="info">
                    {accountsStats.countries?.toLocaleString()} Countries
                  </Badge>
                </div>
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* Filters Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">🔍 Advanced Filters</h5>
          <Button variant="outline-secondary" size="sm" onClick={handleClearFilters}>
            Clear All Filters
          </Button>
        </div>
        
        <Row className="g-3">
          {/* Country Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">Country</Form.Label>
              <Form.Select 
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                size="sm"
              >
                <option value="">All Countries</option>
                {filterOptions.countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Region/State Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">State/Region</Form.Label>
              <Form.Select 
                value={filters.state_region}
                onChange={(e) => handleFilterChange('state_region', e.target.value)}
                disabled={!filters.country}
                size="sm"
              >
                <option value="">All Regions</option>
                {filterOptions.regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* City Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">City</Form.Label>
              <Form.Select 
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                disabled={!filters.state_region}
                size="sm"
              >
                <option value="">All Cities</option>
                {filterOptions.cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Industry Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">Industry</Form.Label>
              <Form.Select 
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                size="sm"
              >
                <option value="">All Industries</option>
                {filterOptions.industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Company Size Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">Company Size</Form.Label>
              <Form.Select 
                value={filters.company_size}
                onChange={(e) => handleFilterChange('company_size', e.target.value)}
                size="sm"
              >
                <option value="">All Sizes</option>
                {filterOptions.companySizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Revenue Filter */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small fw-bold">Revenue Range</Form.Label>
              <Form.Select 
                value={filters.revenue}
                onChange={(e) => handleFilterChange('revenue', e.target.value)}
                size="sm"
              >
                <option value="">All Revenues</option>
                {filterOptions.revenues.map(revenue => (
                  <option key={revenue} value={revenue}>{revenue}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <SearchBar 
          onSearch={handleSearch} 
          loading={loading}
          placeholder="Search accounts by company name..."
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="text-muted">Searching companies...</p>
        </div>
      )}

      {/* Results */}
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

          {/* Pagination */}
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

      {/* No Results */}
      {!loading && results.length === 0 && !error && (
        <Alert variant="info" className="text-center py-5">
          <h5>No accounts found</h5>
          <p className="mb-0">Try adjusting your filters or search query</p>
        </Alert>
      )}

      {/* AI Assistant Modal */}
      <AIAssistant show={showAIAssistant} onHide={() => setShowAIAssistant(false)} />

      {/* Company Details Modal */}
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

      {/* Floating AI Assistant Button */}
      <Button
        variant="primary"
        className="position-fixed rounded-circle shadow-lg"
        style={{
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          fontSize: '1.5rem',
          zIndex: 1000
        }}
        onClick={() => setShowAIAssistant(true)}
      >
        🤖
      </Button>
    </Container>
  );
}

export default SearchPage;
