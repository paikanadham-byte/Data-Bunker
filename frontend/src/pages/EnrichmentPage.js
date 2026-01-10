import React, { useState, useEffect } from 'react';
import { Container, Alert, Card, Row, Col, Badge, ProgressBar, Button, Table, Spinner, Form } from 'react-bootstrap';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * EnrichmentPage Component
 * Monitor and control data enrichment processes
 */
function EnrichmentPage() {
  const [stats, setStats] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [customCountry, setCustomCountry] = useState('United States');
  const [customState, setCustomState] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [discoveryLimit, setDiscoveryLimit] = useState(500);
  const [enrichmentProgress, setEnrichmentProgress] = useState({
    active: false,
    current: 0,
    total: 0,
    rate: 0
  });
  const [lastQueueCheck, setLastQueueCheck] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    countries: ['United States', 'United Kingdom', 'Canada'],
    regions: [],
    cities: []
  });

  useEffect(() => {
    loadStats();
    loadQueueStatus();
    loadRegions(customCountry); // Load regions for default country
    const interval = setInterval(() => {
      loadStats();
      loadQueueStatus();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

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

  const handleCountryChange = (country) => {
    setCustomCountry(country);
    setCustomState('');
    setCustomCity('');
    loadRegions(country);
  };

  const handleStateChange = (state) => {
    setCustomState(state);
    setCustomCity('');
    loadCities(customCountry, state);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/enrichment/stats`);
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load enrichment stats:', error);
      setLoading(false);
    }
  };

  const loadQueueStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/enrichment/queue-status`);
      const data = await response.json();
      if (data.success) {
        const newQueue = data.data;
        setQueueStatus(newQueue);
        
        // Calculate enrichment progress and rate
        if (lastQueueCheck) {
          const completedDiff = newQueue.completed - lastQueueCheck.completed;
          const timeDiff = (Date.now() - lastQueueCheck.timestamp) / 1000; // seconds
          const rate = timeDiff > 0 ? Math.round((completedDiff / timeDiff) * 60) : 0; // per minute
          
          setEnrichmentProgress({
            active: newQueue.processing > 0 || rate > 0,
            current: newQueue.completed,
            total: newQueue.completed + newQueue.pending + newQueue.processing,
            rate: rate
          });
        }
        
        setLastQueueCheck({
          completed: newQueue.completed,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to load queue status:', error);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/api/enrichment/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 })
      });
      const data = await response.json();
      alert(`Processed ${data.processed || 0} companies`);
      loadStats();
      loadQueueStatus();
    } catch (error) {
      alert('Failed to process queue: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartDiscovery = async () => {
    if (!customCity || !customState) {
      alert('Please select both state and city');
      return;
    }
    
    try {
      setDiscoveryRunning(true);
      const response = await fetch(`${API_BASE_URL}/api/discovery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          city: customCity, 
          state: customState,
          limit: discoveryLimit 
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Discovery started for ${customCity}, ${customState}`);
      } else {
        alert('Failed to start discovery: ' + data.error);
      }
    } catch (error) {
      alert('Failed to start discovery: ' + error.message);
    } finally {
      setDiscoveryRunning(false);
    }
  };

  const handleStopDiscovery = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discovery/stop`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.message || 'Discovery stopped');
    } catch (error) {
      alert('Failed to stop discovery: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  const enrichmentPercentage = stats && stats.totalCompanies > 0
    ? Math.round(((stats.withWebsite || 0) / stats.totalCompanies) * 100)
    : 0;

  return (
    <Container fluid className="py-4">
      <Row>
        {/* Left Sidebar - Discovery Controls (1/4 width) */}
        <Col md={3} className="pe-4">
          <div className="mb-4">
            <h2 className="mb-2">🤖 Enrichment</h2>
            <p className="text-muted small">
              Automated data enrichment
            </p>
          </div>

          {/* Company Discovery Control */}
          <Card className="mb-4 border-info">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">🌎 Discovery</h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3 small">
                <strong>Discover companies</strong>
                <p className="mb-0 mt-1 small">Select location to scrape new companies</p>
              </Alert>
              
              <Form>
                <div className="d-flex flex-column gap-3">
                  <Form.Group>
                    <Form.Label className="small fw-bold">Country</Form.Label>
                    <Form.Select 
                      value={customCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      size="sm"
                    >
                      {(filterOptions.countries || []).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="small fw-bold">State/Region</Form.Label>
                    <Form.Select 
                      value={customState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      disabled={!customCountry}
                      size="sm"
                    >
                      <option value="">Select State/Region</option>
                      {(filterOptions.regions || []).map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="small fw-bold">City</Form.Label>
                    <Form.Select 
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      disabled={!customState}
                      size="sm"
                    >
                      <option value="">Select City</option>
                      {(filterOptions.cities || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="small fw-bold">Limit</Form.Label>
                    <Form.Control 
                      type="number" 
                      placeholder="500"
                      value={discoveryLimit}
                      onChange={(e) => setDiscoveryLimit(parseInt(e.target.value) || 500)}
                      size="sm"
                    />
                  </Form.Group>
                  
                  <div className="d-flex flex-column gap-2">
                    <Button 
                      variant="success" 
                      onClick={handleStartDiscovery}
                      disabled={discoveryRunning || !customCity || !customState}
                      size="sm"
                    >
                      {discoveryRunning ? 'Starting...' : 'Start Discovery'}
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={handleStopDiscovery}
                      size="sm"
                    >
                      Stop Discovery
                    </Button>
                  </div>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Stats Summary */}
          {stats && (
            <Card className="mb-3 border-success">
              <Card.Header className="bg-success text-white">
                <h6 className="mb-0">📊 Stats</h6>
              </Card.Header>
              <Card.Body className="small">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Total:</span>
                    <strong>{stats?.totalCompanies?.toLocaleString() || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Websites:</span>
                    <strong className="text-success">{stats?.withWebsite?.toLocaleString() || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Emails:</span>
                    <strong className="text-primary">{stats?.withEmail?.toLocaleString() || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Phones:</span>
                    <strong className="text-info">{stats?.withPhone?.toLocaleString() || 0}</strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Right Content Area (3/4 width) */}
        <Col md={9}>
          {/* Enrichment Progress */}
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Enrichment Progress</h5>
                  <small className="text-muted">Overall data completion rate</small>
                </div>
                <h3 className="mb-0 text-success">{enrichmentPercentage}%</h3>
              </div>
              <ProgressBar 
                now={enrichmentPercentage} 
                variant="success" 
                style={{ height: '30px' }}
                label={`${enrichmentPercentage}%`}
              />
            </Card.Body>
          </Card>

          {/* Active Enrichment Progress Indicator */}
          {enrichmentProgress.active && (
            <Alert variant="success" className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <strong>🤖 Enrichment Agents Running</strong>
                </div>
                <Badge bg="success" className="fs-6">
                  {enrichmentProgress.rate} companies/min
                </Badge>
              </div>
              <ProgressBar 
                animated 
                now={(enrichmentProgress.current / enrichmentProgress.total) * 100} 
                variant="success"
                style={{ height: '25px' }}
                label={`${enrichmentProgress.current.toLocaleString()} / ${enrichmentProgress.total.toLocaleString()}`}
              />
              <small className="text-muted mt-2 d-block">
                Processing rate: {enrichmentProgress.rate} companies per minute
              </small>
            </Alert>
          )}

          {/* Queue Status */}
          {queueStatus && (
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="mb-0">Enrichment Queue Status</h5>
                    {queueStatus.processing > 0 && (
                      <small className="text-success">
                        <Spinner animation="grow" size="sm" className="me-1" />
                        Actively processing {queueStatus.processing} companies
                      </small>
                    )}
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleProcessQueue}
                    disabled={processing || !queueStatus.pending}
                  >
                    {processing ? 'Processing...' : 'Process Queue (10)'}
                  </Button>
                </div>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="text-center p-3 bg-light rounded">
                      <Badge bg="warning" className="mb-2">Pending</Badge>
                      <h4 className="mb-0">{queueStatus.pending?.toLocaleString() || 0}</h4>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3 bg-light rounded">
                      <Badge bg="primary" className="mb-2">
                        {queueStatus.processing > 0 && <Spinner animation="border" size="sm" className="me-1" />}
                        Processing
                      </Badge>
                      <h4 className="mb-0">{queueStatus.processing?.toLocaleString() || 0}</h4>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3 bg-light rounded">
                      <Badge bg="success" className="mb-2">Completed</Badge>
                      <h4 className="mb-0">{queueStatus.completed?.toLocaleString() || 0}</h4>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-3 bg-light rounded">
                      <Badge bg="danger" className="mb-2">Failed</Badge>
                      <h4 className="mb-0">{queueStatus.failed?.toLocaleString() || 0}</h4>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <Card.Body>
              <h5 className="mb-3">📊 Enrichment Statistics</h5>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-end">Count</th>
                    <th className="text-end">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Companies with Website</td>
                    <td className="text-end">{stats?.withWebsite?.toLocaleString() || 0}</td>
                    <td className="text-end">
                      {stats?.totalCompanies 
                        ? Math.round((stats.withWebsite / stats.totalCompanies) * 100) 
                        : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td>Companies with Email</td>
                    <td className="text-end">{stats?.withEmail?.toLocaleString() || 0}</td>
                    <td className="text-end">
                      {stats?.totalCompanies 
                        ? Math.round((stats.withEmail / stats.totalCompanies) * 100) 
                        : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td>Companies with Phone</td>
                    <td className="text-end">{stats?.withPhone?.toLocaleString() || 0}</td>
                    <td className="text-end">
                      {stats?.totalCompanies 
                        ? Math.round((stats.withPhone / stats.totalCompanies) * 100) 
                        : 0}%
                    </td>
                  </tr>
                  <tr className="table-active">
                    <td><strong>Total Companies</strong></td>
                    <td className="text-end"><strong>{stats?.totalCompanies?.toLocaleString() || 0}</strong></td>
                    <td className="text-end"><strong>100%</strong></td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Alert variant="info" className="mt-4">
            <strong>ℹ️ How Enrichment Works:</strong>
            <ul className="mb-0 mt-2">
              <li>Companies are automatically queued for enrichment</li>
              <li>The system searches for websites, emails, and phone numbers</li>
              <li>Data is validated and added to company records</li>
              <li>Failed enrichments are retried automatically</li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}

export default EnrichmentPage;
