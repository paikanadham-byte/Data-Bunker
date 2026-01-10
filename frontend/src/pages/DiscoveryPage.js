import React, { useState, useEffect } from 'react';
import { Container, Alert, Row, Col, Badge, Card, Form, Button, Spinner, ListGroup } from 'react-bootstrap';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function DiscoveryPage() {
  const [filters, setFilters] = useState({
    country: 'United States',
    state_region: '',
    city: '',
    companySize: '',
    limit: 100
  });
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    regions: [],
    cities: []
  });
  const [discovering, setDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [accountsStats, setAccountsStats] = useState(null);
  const [completedAreas, setCompletedAreas] = useState([]);

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

  const loadRegions = async (country) => {
    if (!country) {
      setFilterOptions(prev => ({ ...prev, regions: [], cities: [] }));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/regions/${encodeURIComponent(country)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, regions: data.data, cities: [] }));
      setFilters(prev => ({ ...prev, state_region: '', city: '' }));
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const loadCities = async (country, region) => {
    if (!country || !region) {
      setFilterOptions(prev => ({ ...prev, cities: [] }));
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/cities/${encodeURIComponent(country)}/${encodeURIComponent(region)}`);
      const data = await response.json();
      setFilterOptions(prev => ({ ...prev, cities: data.data }));
      setFilters(prev => ({ ...prev, city: '' }));
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  const loadRecentCompanies = async () => {
    if (!filters.state_region) return;
    
    setLoadingRecent(true);
    try {
      const params = new URLSearchParams({
        state_region: filters.state_region,
        limit: 10,
        sort: 'created_at',
        order: 'desc'
      });
      
      if (filters.city) {
        params.append('city', filters.city);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/accounts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setRecentCompanies(data.data);
      }
    } catch (error) {
      console.error('Failed to load recent companies:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadCompletedAreas = async () => {
    if (!filters.state_region || !filters.city) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/discovery/completed-areas/${encodeURIComponent(filters.state_region)}/${encodeURIComponent(filters.city)}`);
      const data = await response.json();
      
      if (data.success) {
        setCompletedAreas(data.data);
      }
    } catch (error) {
      console.error('Failed to load completed areas:', error);
    }
  };

  useEffect(() => {
    loadAccountsStats();
    loadFilterOptions();
    loadRegions('United States');
    
    const interval = setInterval(loadAccountsStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (filters.city && filters.state_region) {
      loadCompletedAreas();
    }
  }, [filters.city, filters.state_region]);

  useEffect(() => {
    let interval;
    if (discovering) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/discovery/status`);
          const data = await response.json();
          
          if (data.success) {
            setDiscoveryStatus(data.status);
            
            if (data.status.running) {
              loadRecentCompanies();
            }
            
            if (!data.status.running && data.status.companiesFound > 0) {
              setDiscovering(false);
              setSuccess(`Discovery completed! Found ${data.status.companiesFound} companies.`);
              loadRecentCompanies();
              loadAccountsStats();
              loadCompletedAreas();
            } else if (!data.status.running) {
              setDiscovering(false);
            }
          }
        } catch (error) {
          console.error('Failed to fetch discovery status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [discovering, filters.state_region, filters.city]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
    
    if (field === 'country') {
      loadRegions(value);
    } else if (field === 'state_region') {
      loadCities(filters.country, value);
    }
  };

  const handleStartDiscovery = async () => {
    if (!filters.state_region || !filters.city) {
      setError('Please select both State and City to start discovery.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setDiscovering(true);
    setRecentCompanies([]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/discovery/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city: filters.city,
          state: filters.state_region,
          limit: filters.limit,
          companySize: filters.companySize || 'Mixed'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDiscoveryStatus(data.status);
        setSuccess(`Discovery started for ${filters.city}, ${filters.state_region}!`);
      } else {
        setError(data.error || 'Failed to start discovery');
        setDiscovering(false);
      }
    } catch (error) {
      setError('Failed to start discovery: ' + error.message);
      setDiscovering(false);
    }
  };

  const handleStopDiscovery = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/discovery/stop`, { method: 'POST' });
      setDiscovering(false);
      setSuccess('Discovery stopped.');
    } catch (error) {
      setError('Failed to stop discovery: ' + error.message);
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="display-5 fw-bold mb-2">🔍 Company Discovery</h1>
          <p className="text-muted">
            Discover new companies by selecting location and generating company data with contacts
          </p>
        </Col>
      </Row>

      {accountsStats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center border-0 shadow-sm">
              <Card.Body>
                <h3 className="text-primary mb-1">{accountsStats.total?.toLocaleString() || 0}</h3>
                <small className="text-muted">Total Companies</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow-sm">
              <Card.Body>
                <h3 className="text-success mb-1">{accountsStats.countries || 0}</h3>
                <small className="text-muted">Countries</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow-sm">
              <Card.Body>
                <h3 className="text-info mb-1">{accountsStats.industries || 0}</h3>
                <small className="text-muted">Industries</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center border-0 shadow-sm">
              <Card.Body>
                <h3 className="text-warning mb-1">{accountsStats.withWebsite || 0}</h3>
                <small className="text-muted">With Website</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <Row>
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm sticky-top" style={{ top: '80px' }}>
            <Card.Body>
              <h5 className="mb-3 fw-bold">🎯 Discovery Filters</h5>
              
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Country</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  disabled={discovering}
                >
                  <option value="">All Countries</option>
                  {filterOptions.countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">State/Region *</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filters.state_region}
                  onChange={(e) => handleFilterChange('state_region', e.target.value)}
                  disabled={!filters.country || discovering}
                >
                  <option value="">Select State...</option>
                  {filterOptions.regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">City *</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  disabled={!filters.state_region || discovering}
                >
                  <option value="">Select City...</option>
                  {filterOptions.cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Company Size</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filters.companySize}
                  onChange={(e) => handleFilterChange('companySize', e.target.value)}
                  disabled={discovering}
                >
                  <option value="">All Sizes (Mixed)</option>
                  <option value="Small">Small (1-50 employees)</option>
                  <option value="Medium">Medium (51-500 employees)</option>
                  <option value="Large">Large (500+ employees)</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Number of Companies</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  disabled={discovering}
                >
                  <option value="50">50 companies</option>
                  <option value="100">100 companies</option>
                  <option value="200">200 companies</option>
                  <option value="500">500 companies</option>
                  <option value="1000">1,000 companies</option>
                  <option value="5000">5,000 companies</option>
                </Form.Select>
              </Form.Group>

              <hr />

              {!discovering ? (
                <Button 
                  variant="primary" 
                  className="w-100"
                  onClick={handleStartDiscovery}
                  disabled={!filters.state_region || !filters.city}
                >
                  🚀 Start Discovery
                </Button>
              ) : (
                <Button 
                  variant="danger" 
                  className="w-100"
                  onClick={handleStopDiscovery}
                >
                  ⏹️ Stop Discovery
                </Button>
              )}

              <div className="small text-muted mt-2">
                * State and City are required
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          {discoveryStatus && discovering && (
            <Card className="border-0 shadow-sm mb-4 bg-light">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-3" />
                  <div className="flex-grow-1">
                    <h6 className="mb-1">
                      Discovering companies in {discoveryStatus.city}, {discoveryStatus.state}
                    </h6>
                    <div className="small text-muted">
                      Target: {discoveryStatus.limit} companies
                      {discoveryStatus.companiesFound > 0 && (
                        <span className="ms-2">
                          • Found: <Badge bg="success">{discoveryStatus.companiesFound}</Badge>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 small">
                  <Badge bg="info" className="me-2">Generating companies with contacts</Badge>
                  <Badge bg="secondary">Including management-level employees</Badge>
                </div>
              </Card.Body>
            </Card>
          )}

          {filters.state_region && (
            <>
              {completedAreas.length > 0 && (
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Header className="bg-white border-0 py-3">
                    <h6 className="mb-0">✅ Completed Areas in {filters.city}</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-2">
                      {completedAreas.map((area, index) => (
                        <Badge 
                          key={index} 
                          bg="success" 
                          className="px-3 py-2"
                          style={{ fontSize: '0.875rem' }}
                        >
                          ✓ {area.neighborhood}
                        </Badge>
                      ))}
                    </div>
                    <div className="small text-muted mt-2">
                      All companies discovered in these areas
                    </div>
                  </Card.Body>
                </Card>
              )}
            
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 py-3">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">
                    📋 Companies in {filters.city || filters.state_region}
                  </h5>
                  {loadingRecent && <Spinner animation="border" size="sm" />}
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {recentCompanies.length > 0 ? (
                  <ListGroup variant="flush">
                    {recentCompanies.map((company, index) => (
                      <ListGroup.Item key={company.account_id || index} className="px-4 py-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{company.company_name}</h6>
                            <div className="small text-muted mb-2">
                              📍 {company.city}, {company.state_region}
                              {company.country && ` • ${company.country}`}
                              {company.company_size && ` • ${company.company_size}`}
                            </div>
                            <div className="d-flex gap-2 flex-wrap">
                              {company.industry && (
                                <Badge bg="primary" className="fw-normal">{company.industry}</Badge>
                              )}
                              {company.website && (
                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="small">
                                  🌐 Website
                                </a>
                              )}
                              {company.phone_number && (
                                <span className="small text-muted">📞 {company.phone_number}</span>
                              )}
                              {company.email_format && (
                                <span className="small text-success">✉️ {company.email_format}</span>
                              )}
                            </div>
                          </div>
                          {company.created_at && (
                            <Badge bg="success" className="ms-2">New</Badge>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center py-5 text-muted">
                    {discovering ? (
                      <>
                        <Spinner animation="border" className="mb-3" />
                        <p>Discovering companies...</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-3">No companies found yet.</p>
                        <p className="small">
                          Select a State and City, then click "Start Discovery" to generate companies.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </>
          )}

          {!filters.state_region && (
            <Card className="border-0 shadow-sm bg-light">
              <Card.Body className="text-center py-5">
                <h3 className="mb-3">🔍</h3>
                <h5 className="mb-3">Start Discovering Companies</h5>
                <p className="text-muted mb-0">
                  Select a State and City from the filters on the left to begin discovering companies.
                  <br />
                  Companies will be generated with complete information including:
                </p>
                <div className="mt-3">
                  <Badge bg="primary" className="me-2 mb-2">Company Details</Badge>
                  <Badge bg="success" className="me-2 mb-2">Website & Contact Info</Badge>
                  <Badge bg="info" className="me-2 mb-2">Phone & Email</Badge>
                  <Badge bg="warning" className="me-2 mb-2">Management Contacts</Badge>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default DiscoveryPage;
