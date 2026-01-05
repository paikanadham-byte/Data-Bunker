import React, { useState } from 'react';
import { Form, InputGroup, Button, Spinner } from 'react-bootstrap';

/**
 * SearchBar Component
 * Handles company name and location search
 */
function SearchBar({ onSearch, loading = false }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <InputGroup size="lg" className="shadow-sm">
        <InputGroup.Text className="bg-primary text-white border-0">
          🔍
        </InputGroup.Text>
        <Form.Control
          placeholder="Search company name or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
          className="border-start-0"
        />
        <Button
          variant="primary"
          type="submit"
          disabled={loading || !searchQuery.trim()}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
        {searchQuery && (
          <Button
            variant="outline-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            ✕ Clear
          </Button>
        )}
      </InputGroup>
    </Form>
  );
}

export default SearchBar;
