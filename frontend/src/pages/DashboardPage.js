import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Spinner, Badge, ListGroup, Alert, Button } from 'react-bootstrap';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// US State coordinates for center positioning
const stateCoordinates = {
  'California': [36.7783, -119.4179],
  'Texas': [31.9686, -99.9018],
  'Florida': [27.6648, -81.5158],
  'New York': [43.2994, -74.2179],
  'Pennsylvania': [41.2033, -77.1945],
  'Illinois': [40.6331, -89.3985],
  'Ohio': [40.4173, -82.9071],
  'Georgia': [32.1656, -82.9001],
  'North Carolina': [35.7596, -79.0193],
  'Michigan': [44.3148, -85.6024],
  'New Jersey': [40.0583, -74.4057],
  'Virginia': [37.4316, -78.6569],
  'Washington': [47.7511, -120.7401],
  'Arizona': [34.0489, -111.0937],
  'Massachusetts': [42.4072, -71.3824],
  'Tennessee': [35.5175, -86.5804],
  'Indiana': [40.2672, -86.1349],
  'Missouri': [37.9643, -91.8318],
  'Maryland': [39.0458, -76.6413],
  'Wisconsin': [43.7844, -88.7879],
  'Colorado': [39.5501, -105.7821],
  'Minnesota': [46.7296, -94.6859],
  'South Carolina': [33.8361, -81.1637],
  'Alabama': [32.3182, -86.9023],
  'Louisiana': [31.2448, -92.1450],
  'Kentucky': [37.8393, -84.2700],
  'Oregon': [43.8041, -120.5542],
  'Oklahoma': [35.0078, -97.0929],
  'Connecticut': [41.6032, -73.0877],
  'Utah': [39.3210, -111.0937],
  'Iowa': [41.8780, -93.0977],
  'Nevada': [38.8026, -116.4194],
  'Arkansas': [35.2010, -91.8318],
  'Mississippi': [32.3547, -89.3985],
  'Kansas': [39.0119, -98.4842],
  'New Mexico': [34.5199, -105.8701],
  'Nebraska': [41.4925, -99.9018],
  'West Virginia': [38.5976, -80.4549],
  'Idaho': [44.0682, -114.7420],
  'Hawaii': [19.8968, -155.5828],
  'New Hampshire': [43.1939, -71.5724],
  'Maine': [45.2538, -69.4455],
  'Montana': [46.8797, -110.3626],
  'Rhode Island': [41.5801, -71.4774],
  'Delaware': [38.9108, -75.5277],
  'South Dakota': [43.9695, -99.9018],
  'North Dakota': [47.5515, -101.0020],
  'Alaska': [64.2008, -149.4937],
  'Vermont': [44.5588, -72.5778],
  'Wyoming': [43.0760, -107.2903]
};

// MapUpdater component to handle map centering
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function DashboardPage() {
  const [geoData, setGeoData] = useState(null);
  const [topCities, setTopCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [mapCenter] = useState([39.8283, -98.5795]); // US center
  const [mapZoom] = useState(4);
  const [selectedCity, setSelectedCity] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(null);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const [geoResponse, citiesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/geographic-distribution?country=${encodeURIComponent(selectedCountry)}`),
        fetch(`${API_BASE_URL}/api/dashboard/top-cities?country=${encodeURIComponent(selectedCountry)}&limit=50`)
      ]);
      
      const geoResult = await geoResponse.json();
      const citiesResult = await citiesResponse.json();
      
      if (geoResult.success) {
        setGeoData(geoResult.data);
      }
      
      if (citiesResult.success) {
        setTopCities(citiesResult.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedCountry, loadDashboardData]);

  const handleDiscoverCompanies = async (city, state) => {
    if (!city || !state) return;
    
    try {
      setDiscovering(true);
      setDiscoveryProgress({ city, state, status: 'Starting discovery...' });
      
      const response = await fetch(`${API_BASE_URL}/api/discovery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          state,
          limit: 500
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDiscoveryProgress({ 
          city, 
          state, 
          status: 'Discovery started! Finding new companies...',
          active: true 
        });
        
        // Poll for discovery status
        const statusInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE_URL}/api/discovery/status`);
            const statusData = await statusRes.json();
            
            if (statusData.success) {
              setDiscoveryProgress({
                city,
                state,
                status: `Found ${statusData.status.companiesFound || 0} companies`,
                companiesFound: statusData.status.companiesFound || 0,
                active: statusData.status.running
              });
              
              if (!statusData.status.running) {
                clearInterval(statusInterval);
                setDiscovering(false);
                loadDashboardData(); // Refresh map with new companies
              }
            }
          } catch (err) {
            console.error('Status check failed:', err);
          }
        }, 3000);
        
        // Auto-stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(statusInterval);
          setDiscovering(false);
        }, 300000);
      } else {
        setDiscoveryProgress({ city, state, status: 'Failed to start discovery', error: true });
        setDiscovering(false);
      }
    } catch (error) {
      console.error('Discovery failed:', error);
      setDiscoveryProgress({ city, state, status: 'Error: ' + error.message, error: true });
      setDiscovering(false);
    }
  };

  const handleCityClick = (city, state) => {
    setSelectedCity({ city, state });
  };

  const getColorByCount = (count) => {
    if (count > 100000) return '#dc2626'; // red
    if (count > 50000) return '#ea580c'; // orange
    if (count > 10000) return '#f59e0b'; // amber
    if (count > 5000) return '#10b981'; // green
    if (count > 1000) return '#3b82f6'; // blue
    return '#6366f1'; // indigo
  };

  const getRadiusByCount = (count) => {
    if (count > 100000) return 25;
    if (count > 50000) return 20;
    if (count > 10000) return 15;
    if (count > 5000) return 12;
    if (count > 1000) return 10;
    return 8;
  };

  // Get city coordinates (simplified - in production use a geocoding service)
  const getCityCoordinates = (city, state) => {
    // For demonstration, use state center + random offset
    const stateCenter = stateCoordinates[state] || [39.8283, -98.5795];
    return [
      stateCenter[0] + (Math.random() - 0.5) * 2,
      stateCenter[1] + (Math.random() - 0.5) * 2
    ];
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading dashboard...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>📊 Geographic Dashboard</h2>
          <p className="text-muted">Click any location to discover new companies</p>
        </Col>
      </Row>

      {/* Discovery Progress Alert */}
      {discoveryProgress && (
        <Row className="mb-3">
          <Col>
            <Alert 
              variant={discoveryProgress.error ? 'danger' : discoveryProgress.active ? 'info' : 'success'}
              dismissible
              onClose={() => setDiscoveryProgress(null)}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <strong>🔍 {discoveryProgress.city}, {discoveryProgress.state}</strong>
                  <br />
                  <span>{discoveryProgress.status}</span>
                </div>
                {discoveryProgress.active && (
                  <Spinner animation="border" size="sm" />
                )}
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Country Stats Cards */}
      <Row className="mb-4">
        {geoData?.countries?.map(countryData => (
          <Col md={4} key={countryData.country}>
            <Card 
              className={`cursor-pointer ${selectedCountry === countryData.country ? 'border-primary' : ''}`}
              onClick={() => setSelectedCountry(countryData.country)}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body>
                <h5>{countryData.country}</h5>
                <h2>{countryData.total_companies?.toLocaleString()}</h2>
                <div className="d-flex justify-content-between text-muted small">
                  <span>Total Companies</span>
                  <Badge bg="success">
                    {countryData.enriched_companies?.toLocaleString()} enriched
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row>
        {/* Map */}
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🗺️ Company Distribution Map</h5>
                <Form.Select 
                  size="sm" 
                  style={{ width: '200px' }}
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  {geoData?.countries?.map(c => (
                    <option key={c.country} value={c.country}>{c.country}</option>
                  ))}
                </Form.Select>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ height: '600px', width: '100%' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={mapZoom} />
                  
                  {/* Render city markers */}
                  {geoData?.cities?.map((city, idx) => {
                    const coords = getCityCoordinates(city.city, city.state);
                    return (
                      <CircleMarker
                        key={`${city.city}-${city.state}-${idx}`}
                        center={coords}
                        radius={getRadiusByCount(city.count)}
                        fillColor={getColorByCount(city.count)}
                        color="#fff"
                        weight={2}
                        opacity={0.8}
                        fillOpacity={0.6}
                        eventHandlers={{
                          click: () => handleCityClick(city.city, city.state)
                        }}
                      >
                        <Popup>
                          <div style={{ minWidth: '200px' }}>
                            <strong>{city.city}, {city.state}</strong>
                            <br />
                            <span>Companies: {city.count?.toLocaleString()}</span>
                            <br />
                            <span className="text-success">
                              Enriched: {city.enriched_count?.toLocaleString()}
                            </span>
                            <hr style={{ margin: '8px 0' }} />
                            <button
                              className="btn btn-sm btn-primary w-100"
                              onClick={() => handleDiscoverCompanies(city.city, city.state)}
                              disabled={discovering}
                            >
                              🔍 Discover New Companies
                            </button>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>
            </Card.Body>
          </Card>

          {/* Legend and Discovery Info */}
          <Card className="mb-3">
            <Card.Body>
              <strong>Legend:</strong>
              <div className="d-flex gap-4 mt-2 flex-wrap">
                <div><span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#dc2626', borderRadius: '50%' }}></span> 100k+ companies</div>
                <div><span style={{ display: 'inline-block', width: '18px', height: '18px', backgroundColor: '#ea580c', borderRadius: '50%' }}></span> 50k-100k</div>
                <div><span style={{ display: 'inline-block', width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span> 10k-50k</div>
                <div><span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#10b981', borderRadius: '50%' }}></span> 5k-10k</div>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span> 1k-5k</div>
                <div><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#6366f1', borderRadius: '50%' }}></span> &lt;1k</div>
              </div>
            </Card.Body>
          </Card>

          <Alert variant="info">
            <strong>🔍 Discovery Feature:</strong>
            <ul className="mb-0 mt-2 small">
              <li>Click any city bubble or use "Discover New" button</li>
              <li>System searches for NEW companies in that location</li>
              <li>Automatically skips duplicates already in database</li>
              <li>New companies appear on map immediately</li>
              <li>Each discovery finds ~500 unique companies</li>
            </ul>
          </Alert>
        </Col>

        {/* Top Cities List with Discovery */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">🏙️ Top Cities</h5>
              <small className="text-muted">Click "Discover" to find new companies</small>
            </Card.Header>
            <Card.Body className="p-0" style={{ maxHeight: '700px', overflowY: 'auto' }}>
              <ListGroup variant="flush">
                {topCities.map((city, idx) => (
                  <ListGroup.Item 
                    key={`${city.city}-${city.state}-${idx}`}
                    className={selectedCity?.city === city.city && selectedCity?.state === city.state ? 'bg-light' : ''}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>{city.city}, {city.state}</strong>
                        <br />
                        <small className="text-muted">{city.country}</small>
                      </div>
                      <div className="text-end">
                        <Badge 
                          bg="primary" 
                          style={{ 
                            backgroundColor: getColorByCount(city.company_count),
                            border: 'none'
                          }}
                        >
                          {city.company_count?.toLocaleString()}
                        </Badge>
                        <br />
                        <small className="text-success">
                          {city.enriched_count?.toLocaleString()} enriched
                        </small>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary w-100"
                      onClick={() => handleDiscoverCompanies(city.city, city.state)}
                      disabled={discovering}
                    >
                      {discovering && discoveryProgress?.city === city.city ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" />
                          Discovering...
                        </>
                      ) : (
                        <>🔍 Discover New</>
                      )}
                    </button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardPage;
