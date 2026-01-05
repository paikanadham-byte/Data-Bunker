import React, { useState, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { locationService } from '../api';

/**
 * LocationSelector Component
 * Provides country → state → city selection
 */
function LocationSelector({ onLocationChange, selectedCountry, selectedState, selectedCity }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        const response = await locationService.getCountries();
        setCountries(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to load countries');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!selectedCountry) {
      setStates([]);
      setCities([]);
      return;
    }

    const loadStates = async () => {
      try {
        setLoading(true);
        const response = await locationService.getStates(selectedCountry);
        setStates(response.data.data);
        setCities([]);
        onLocationChange({ country: selectedCountry, state: null, city: null });
        setError(null);
      } catch (err) {
        setError('Failed to load states');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  // Load cities when state changes
  useEffect(() => {
    if (!selectedCountry || !selectedState) {
      setCities([]);
      return;
    }

    const loadCities = async () => {
      try {
        setLoading(true);
        const response = await locationService.getCities(selectedCountry, selectedState);
        setCities(response.data.data);
        onLocationChange({ country: selectedCountry, state: selectedState, city: null });
        setError(null);
      } catch (err) {
        setError('Failed to load cities');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  const handleCountryChange = (e) => {
    onLocationChange({ country: e.target.value, state: null, city: null });
  };

  const handleStateChange = (e) => {
    onLocationChange({ country: selectedCountry, state: e.target.value, city: null });
  };

  const handleCityChange = (e) => {
    onLocationChange({ country: selectedCountry, state: selectedState, city: e.target.value });
  };

  return (
    <div className="mb-4">
      <h5 className="mb-3">📍 Filter by Location</h5>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <Row className="g-2">
        {/* Country Selector */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>Country</Form.Label>
            <Form.Select
              value={selectedCountry || ''}
              onChange={handleCountryChange}
              disabled={loading}
            >
              <option value="">-- Select Country --</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.region})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* State Selector */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>State/Province</Form.Label>
            <Form.Select
              value={selectedState || ''}
              onChange={handleStateChange}
              disabled={!selectedCountry || loading || states.length === 0}
            >
              <option value="">-- Select State --</option>
              {states.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* City Selector */}
        <Col md={4}>
          <Form.Group>
            <Form.Label>City</Form.Label>
            <Form.Select
              value={selectedCity || ''}
              onChange={handleCityChange}
              disabled={!selectedState || loading || cities.length === 0}
            >
              <option value="">-- Select City --</option>
              {cities.map((city, idx) => (
                <option key={idx} value={city}>
                  {city}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
}

export default LocationSelector;
