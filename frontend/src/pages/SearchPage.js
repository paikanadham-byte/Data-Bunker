import React, { useState } from 'react';
import { Container, Alert, Spinner, Pagination } from 'react-bootstrap';
import SearchBar from '../components/SearchBar';
import HierarchicalLocationSelector from '../components/HierarchicalLocationSelector';
import CompanyCard from '../components/CompanyCard';
import CompanyDetailsModal from '../components/CompanyDetailsModal';
import { searchService } from '../api';

/**
 * SearchPage Component
 * Main page for company search with hierarchical location filtering
 */
function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({
    country: null,
    state: null,
    city: null,
    district: null
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });

  // Handle search by name
  const handleSearch = async (query) => {
    try {
      setLoading(true);
      setError(null);
      setSearchQuery(query);
      setPagination({ ...pagination, offset: 0 });

      const response = await searchService.searchCompanies(
        query,
        selectedLocation.country,
        selectedLocation.state,
        selectedLocation.city,
        selectedLocation.district,
        pagination.limit,
        0
      );

      setResults(response.data.data.companies || []);
      setPagination({
        limit: pagination.limit,
        offset: 0,
        total: response.data.data.total || 0
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle location change with hierarchical updates
  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    // Trigger search if we have a query
    if (searchQuery) {
      performSearch(searchQuery, location);
    }
  };

  // Perform search with location filters
  const performSearch = async (query, location) => {
    try {
      setLoading(true);
      setError(null);
      setPagination({ ...pagination, offset: 0 });

      const response = await searchService.searchCompanies(
        query,
        location.country,
        location.state,
        location.city,
        location.district,
        pagination.limit,
        0
      );

      setResults(response.data.data.companies || []);
      setPagination({
        limit: pagination.limit,
        offset: 0,
        total: response.data.data.total || 0
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // View company details
  const handleViewDetails = (company) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const handlePageChange = (newOffset) => {
    setPagination({ ...pagination, offset: newOffset });
    // TODO: Fetch new results with offset
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="display-5 fw-bold mb-2">🌍 Data Bunker</h1>
        <p className="lead text-muted">
          Find and explore active companies from around the globe
        </p>
      </div>

      {/* Location Filter - Hierarchical */}
      <HierarchicalLocationSelector
        onLocationChange={handleLocationChange}
        selectedCountry={selectedLocation.country}
        selectedState={selectedLocation.state}
        selectedCity={selectedLocation.city}
        selectedDistrict={selectedLocation.district}
      />

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} loading={loading} />

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
            <h5>
              Found {pagination.total} companies
              {searchQuery && ` for "${searchQuery}"`}
            </h5>
          </div>

          <div className="mb-4">
            {results.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <nav className="mb-4">
              <Pagination>
                <Pagination.First
                  disabled={pagination.offset === 0}
                  onClick={() => handlePageChange(0)}
                />
                <Pagination.Prev
                  disabled={pagination.offset === 0}
                  onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                />
                <Pagination.Item active>
                  {Math.floor(pagination.offset / pagination.limit) + 1}
                </Pagination.Item>
                <Pagination.Next
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                />
                <Pagination.Last
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  onClick={() => handlePageChange(Math.floor(pagination.total / pagination.limit) * pagination.limit)}
                />
              </Pagination>
            </nav>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="text-center py-5">
          <h5 className="text-muted">No companies found</h5>
          <p className="text-muted small">
            Try selecting a different location or search term
          </p>
        </div>
      )}

      {/* Company Details Modal */}
      <CompanyDetailsModal
        show={showDetailsModal}
        company={selectedCompany}
        onHide={() => setShowDetailsModal(false)}
      />
    </Container>
  );
}

export default SearchPage;
