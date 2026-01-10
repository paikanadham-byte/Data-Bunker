import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Spinner } from 'react-bootstrap';
import { locationService } from '../api';
import './HierarchicalLocationSelector.css';

/**
 * Hierarchical Location Selector Component
 * Supports 4 levels: Country → State/Province → City → District
 * Features:
 * - Auto-population of lower levels when parent is selected
 * - Search bars for each level
 * - Optional filtering (can leave levels empty)
 * - Fast and scalable
 */
function HierarchicalLocationSelector({ onLocationChange, selectedCountry, selectedState, selectedStateName: selectedStateLabel, selectedCity, selectedDistrict }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        const response = await locationService.getCountries();
        setCountries(response.data.data || []);
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
      setDistricts([]);
      onLocationChange({ country: null, state: null, stateName: null, city: null, district: null });
      return;
    }

    const loadStates = async () => {
      try {
        setLoading(true);
        const response = await locationService.getStates(selectedCountry);
        setStates(response.data.data || []);
        setCities([]);
        setDistricts([]);
        onLocationChange({ country: selectedCountry, state: null, stateName: null, city: null, district: null });
        setError(null);
      } catch (err) {
        setError('Failed to load states/provinces');
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
      setDistricts([]);
      return;
    }

    const loadCities = async () => {
      try {
        setLoading(true);
        const response = await locationService.getCities(selectedCountry, selectedState);
        setCities(response.data.data || []);
        setDistricts([]);
        const currentStateName = selectedStateLabel || states.find(s => s.code === selectedState)?.name;
        onLocationChange({ country: selectedCountry, state: selectedState, stateName: currentStateName, city: null, district: null });
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

  // Load districts when city changes
  useEffect(() => {
    if (!selectedCountry || !selectedState || !selectedCity) {
      setDistricts([]);
      return;
    }

    const loadDistricts = async () => {
      try {
        setLoading(true);
        const response = await locationService.getDistricts(selectedCountry, selectedState, selectedCity);
        setDistricts(response.data.data || []);
        const currentStateName = selectedStateLabel || states.find(s => s.code === selectedState)?.name;
        onLocationChange({ country: selectedCountry, state: selectedState, stateName: currentStateName, city: selectedCity, district: null });
        setError(null);
      } catch (err) {
        setError('Failed to load districts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  // Filter countries based on search
  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter states based on search
  const filteredStates = states.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // Filter cities based on search
  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  // Filter districts based on search
  const filteredDistricts = districts.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name;
  const selectedStateName = selectedStateLabel || states.find(s => s.code === selectedState)?.name;

  return (
    <div className="hierarchical-location-selector">
      <h5>🗺️ Filter by Location (Hierarchical)</h5>
      {error && <div className="alert alert-danger alert-sm">{error}</div>}

      <Row className="location-filters">
        {/* Country Selector */}
        <Col md={3} className="mb-3">
          <Form.Group>
            <Form.Label className="fw-bold">Country</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                onFocus={() => setShowCountryDropdown(true)}
                className="form-control-sm"
              />
              {loading && <Spinner animation="border" size="sm" className="search-spinner" />}
            </div>
            {showCountryDropdown && (
              <div className="dropdown-menu show w-100">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map(country => (
                    <button
                      key={country.code}
                      className={`dropdown-item ${selectedCountry === country.code ? 'active' : ''}`}
                      onClick={() => {
                        onLocationChange({ country: country.code, state: null, stateName: null, city: null, district: null });
                        setCountrySearch('');
                        setShowCountryDropdown(false);
                      }}
                    >
                      {country.name}
                      <span className="text-muted ms-2">({country.region})</span>
                    </button>
                  ))
                ) : (
                  <div className="dropdown-item disabled">No countries found</div>
                )}
              </div>
            )}
            {selectedCountryName && (
              <small className="text-success">✓ {selectedCountryName}</small>
            )}
          </Form.Group>
        </Col>

        {/* State/Province Selector */}
        <Col md={3} className="mb-3">
          <Form.Group>
            <Form.Label className="fw-bold">State/Province</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Search states..."
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                onFocus={() => setShowStateDropdown(true)}
                disabled={!selectedCountry}
                className="form-control-sm"
              />
              {loading && <Spinner animation="border" size="sm" className="search-spinner" />}
            </div>
            {showStateDropdown && selectedCountry && (
              <div className="dropdown-menu show w-100">
                {filteredStates.length > 0 ? (
                  filteredStates.map(state => (
                    <button
                      key={state.code}
                      className={`dropdown-item ${selectedState === state.code ? 'active' : ''}`}
                      onClick={() => {
                        onLocationChange({ country: selectedCountry, state: state.code, stateName: state.name, city: null, district: null });
                        setStateSearch('');
                        setShowStateDropdown(false);
                      }}
                    >
                      {state.name}
                    </button>
                  ))
                ) : (
                  <div className="dropdown-item disabled">No states found</div>
                )}
              </div>
            )}
            {selectedStateName && (
              <small className="text-success">✓ {selectedStateName}</small>
            )}
          </Form.Group>
        </Col>

        {/* City Selector */}
        <Col md={3} className="mb-3">
          <Form.Group>
            <Form.Label className="fw-bold">City</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Search cities..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                onFocus={() => setShowCityDropdown(true)}
                disabled={!selectedState}
                className="form-control-sm"
              />
              {loading && <Spinner animation="border" size="sm" className="search-spinner" />}
            </div>
            {showCityDropdown && selectedState && (
              <div className="dropdown-menu show w-100">
                {filteredCities.length > 0 ? (
                  filteredCities.map(city => (
                    <button
                      key={city.name}
                      className={`dropdown-item ${selectedCity === city.name ? 'active' : ''}`}
                      onClick={() => {
                        onLocationChange({ country: selectedCountry, state: selectedState, stateName: selectedStateName || city.parentStateName || states.find(s => s.code === selectedState)?.name || null, city: city.name, district: null });
                        setCitySearch('');
                        setShowCityDropdown(false);
                      }}
                    >
                      {city.name}
                    </button>
                  ))
                ) : (
                  <div className="dropdown-item disabled">No cities found</div>
                )}
              </div>
            )}
            {selectedCity && (
              <small className="text-success">✓ {selectedCity}</small>
            )}
          </Form.Group>
        </Col>

        {/* District Selector */}
        <Col md={3} className="mb-3">
          <Form.Group>
            <Form.Label className="fw-bold">District</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Search districts..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                onFocus={() => setShowDistrictDropdown(true)}
                disabled={!selectedCity}
                className="form-control-sm"
              />
              {loading && <Spinner animation="border" size="sm" className="search-spinner" />}
            </div>
            {showDistrictDropdown && selectedCity && districts.length > 0 && (
              <div className="dropdown-menu show w-100">
                {filteredDistricts.length > 0 ? (
                  filteredDistricts.map(district => (
                    <button
                      key={district}
                      className={`dropdown-item ${selectedDistrict === district ? 'active' : ''}`}
                      onClick={() => {
                        onLocationChange({ country: selectedCountry, state: selectedState, stateName: selectedStateName || states.find(s => s.code === selectedState)?.name || null, city: selectedCity, district });
                        setDistrictSearch('');
                        setShowDistrictDropdown(false);
                      }}
                    >
                      {district}
                    </button>
                  ))
                ) : (
                  <div className="dropdown-item disabled">No districts found</div>
                )}
              </div>
            )}
            {selectedDistrict && (
              <small className="text-success">✓ {selectedDistrict}</small>
            )}
          </Form.Group>
        </Col>
      </Row>

      {/* Breadcrumb showing selection */}
      {(selectedCountry || selectedState || selectedCity || selectedDistrict) && (
        <div className="alert alert-info alert-sm mt-2">
          <strong>Selected:</strong> {selectedCountryName || 'Not selected'} 
          {selectedStateName && ` → ${selectedStateName}`}
          {selectedCity && ` → ${selectedCity}`}
          {selectedDistrict && ` → ${selectedDistrict}`}
        </div>
      )}
    </div>
  );
}

export default HierarchicalLocationSelector;
