import React, { useState } from 'react';
import { Form, InputGroup, Button, Spinner } from 'react-bootstrap';

/**
 * SearchBar Component
 * Optional filter for company names
 */
function SearchBar({ onSearch, loading = false, placeholder = "Search company name or keyword..." }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch(''); // Trigger search with empty query to show all companies
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <InputGroup size="lg" className="shadow-sm">
        <InputGroup.Text className="bg-primary text-white border-0">
          🔍
        </InputGroup.Text>
        <Form.Control
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
          className="border-start-0"
        />
        <Button
          variant="primary"
          type="submit"
          disabled={loading}
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
              Filtering...
            </>
          ) : (
            'Filter'
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
