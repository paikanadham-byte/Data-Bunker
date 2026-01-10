import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Custom marker for discovery location
const discoveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function DiscoveryMap({ onDiscoveryComplete, filters }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [discoveryForm, setDiscoveryForm] = useState({
    city: '',
    state: ''
  });
  const [discoveryStatus, setDiscoveryStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Pre-populate form with filters when they change
  useEffect(() => {
    if (filters) {
      setDiscoveryForm(prev => ({
        ...prev,
        city: filters.city || prev.city,
        state: filters.state_region || prev.state
      }));
    }
  }, [filters]);

  // US States for dropdown
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  // Poll discovery status
  useEffect(() => {
    let interval;
    if (discoveryStatus?.running) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/discovery/status`);
          const data = await response.json();
          
          if (data.success) {
            setDiscoveryStatus(data.status);
            
            // If discovery completed
            if (!data.status.running && discoveryStatus.running) {
              setSuccess(`Discovery completed! Found ${data.status.companiesFound} companies in ${data.status.city}, ${data.status.state}`);
              if (onDiscoveryComplete) {
                onDiscoveryComplete();
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch discovery status:', err);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveryStatus?.running]);

  // Load initial status
  useEffect(() => {
    loadDiscoveryStatus();
  }, []);

  const loadDiscoveryStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discovery/status`);
      const data = await response.json();
      if (data.success) {
        setDiscoveryStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to load discovery status:', err);
    }
  };

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleStartDiscovery = async () => {
    if (!discoveryForm.city || !discoveryForm.state) {
      setError('Please enter both city and state');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/discovery/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: discoveryForm.city,
          state: discoveryForm.state
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDiscoveryStatus(data.status);
        setSuccess(`Discovery started for ${discoveryForm.city}, ${discoveryForm.state}!`);
        setShowModal(false);
        
        // Reset form
        setDiscoveryForm({
          city: '',
          state: ''
        });
      } else {
        setError(data.error || 'Failed to start discovery');
      }
    } catch (err) {
      setError('Failed to start discovery: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopDiscovery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/discovery/stop`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setDiscoveryStatus(data.status);
        setSuccess('Discovery stopped');
      } else {
        setError(data.error || 'Failed to stop discovery');
      }
    } catch (err) {
      setError('Failed to stop discovery: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Discovery Status Bar */}
      {discoveryStatus?.running && (
        <Alert variant="info" className="mb-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" />
            <div>
              <strong>Discovery in Progress</strong>
              <div className="small">
                {discoveryStatus.city}, {discoveryStatus.state} - 
                {discoveryStatus.companiesFound > 0 && ` Found: ${discoveryStatus.companiesFound} companies`}
              </div>
            </div>
          </div>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={handleStopDiscovery}
            disabled={loading}
          >
            Stop
          </Button>
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-3">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      {/* Map */}
      <div style={{ height: '500px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
        <MapContainer
          center={[37.0902, -95.7129]} // Center of USA
          zoom={4}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={discoveryIcon}>
              <Popup>
                Selected Location<br />
                Lat: {selectedLocation.lat.toFixed(4)}<br />
                Lng: {selectedLocation.lng.toFixed(4)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="mt-3">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            🗺️ Click anywhere on the map to start discovering companies
          </small>
          {filters && (filters.state_region || filters.city || filters.industry) && (
            <small className="text-primary">
              🎯 Filters active: {[
                filters.state_region && `${filters.state_region}`,
                filters.city && `${filters.city}`,
                filters.industry && `${filters.industry}`
              ].filter(Boolean).join(', ')}
            </small>
          )}
        </div>
      </div>

      {/* Discovery Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🔍 Discover Companies</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLocation && (
            <Alert variant="info" className="small mb-3">
              Selected coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>City *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., New York, Los Angeles"
                value={discoveryForm.city}
                onChange={(e) => setDiscoveryForm({ ...discoveryForm, city: e.target.value })}
              />
              <Form.Text className="text-muted">
                Enter the city name where you want to discover companies
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>State *</Form.Label>
              <Form.Select
                value={discoveryForm.state}
                onChange={(e) => setDiscoveryForm({ ...discoveryForm, state: e.target.value })}
              >
                <option value="">Select State</option>
                {usStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>

          {error && (
            <Alert variant="danger" className="mb-0 mt-3">
              {error}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStartDiscovery} 
            disabled={loading || !discoveryForm.city || !discoveryForm.state}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Starting...
              </>
            ) : (
              '🚀 Start Discovery'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default DiscoveryMap;
