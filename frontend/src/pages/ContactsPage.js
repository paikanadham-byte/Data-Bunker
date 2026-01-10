import React, { useState, useEffect } from 'react';
import { Container, Alert, Table, Spinner, Pagination, Button, Badge, Form, Row, Col, Modal } from 'react-bootstrap';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * ContactsPage Component
 * Browse and manage contacts linked to accounts
 */
function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  useEffect(() => {
    loadStats();
    fetchContacts();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const fetchContacts = async (query = '', newOffset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: newOffset
      });

      if (query) params.append('search', query);

      const response = await fetch(`${API_BASE_URL}/api/contacts?${params}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.data || []);
        setPagination({
          limit: pagination.limit,
          offset: newOffset,
          total: data.total || 0
        });
      }
    } catch (err) {
      setError('Failed to fetch contacts. Please try again.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchContacts(searchQuery, 0);
  };

  const handlePageChange = (newOffset) => {
    fetchContacts(searchQuery, newOffset);
  };

  const generateLinkedInURL = (firstName, lastName, companyName) => {
    const name = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(firstName + ' ' + lastName + ' ' + (companyName || ''))}`;
  };

  const generateCompanyLinkedInURL = (companyName) => {
    return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
  };

  const handleContactClick = async (contact) => {
    setSelectedContact(contact);
    setShowModal(true);
    
    // Fetch account information
    if (contact.linked_account_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/accounts?account_id=${contact.linked_account_id}`);
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setAccountInfo(data.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch account info:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContact(null);
    setAccountInfo(null);
  };

  return (
    <Container className="py-4">
      <div className="mb-4">
        <h2 className="mb-2">👥 Contacts Database</h2>
        <p className="text-muted">
          Manage business contacts linked to company accounts
        </p>

        {stats && (
          <Alert variant="info" style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px'
          }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <strong>📊 Contacts Overview</strong>
                <div className="mt-1 small">
                  <Badge bg="primary" className="me-2">
                    {stats.total?.toLocaleString() || 0} Total Contacts
                  </Badge>
                  <Badge bg="success" className="me-2">
                    {stats.withEmail?.toLocaleString() || 0} With Email
                  </Badge>
                  <Badge bg="info">
                    {stats.withPhone?.toLocaleString() || 0} With Phone
                  </Badge>
                </div>
              </div>
            </div>
          </Alert>
        )}
      </div>

      <div className="mb-4">
        <Form onSubmit={handleSearch}>
          <Row>
            <Col md={10}>
              <Form.Control
                type="text"
                placeholder="Search contacts by name, email, job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button type="submit" variant="primary" className="w-100">
                Search
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="text-muted">Loading contacts...</p>
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <>
          <div className="mb-3">
            <small className="text-muted">
              Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} contacts
            </small>
          </div>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Job Title</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr 
                  key={contact.contact_id} 
                  onClick={() => handleContactClick(contact)}
                  style={{ cursor: 'pointer' }}
                  className="table-row-hover"
                >
                  <td>
                    <strong>{contact.first_name} {contact.last_name}</strong>
                  </td>
                  <td>{contact.job_title || '-'}</td>
                  <td>
                    {contact.email ? (
                      <a 
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.email}
                      </a>
                    ) : '-'}
                  </td>
                  <td>{contact.phone_number || '-'}</td>
                  <td>
                    {contact.city && contact.country ? `${contact.city}, ${contact.country}` : contact.country || '-'}
                  </td>
                  <td>
                    <Badge bg="secondary">Account #{contact.linked_account_id}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

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

      {!loading && contacts.length === 0 && !error && (
        <Alert variant="info" className="text-center py-5">
          <h5>No contacts found</h5>
          <p className="mb-0">
            {searchQuery 
              ? 'Try adjusting your search query'
              : 'No contacts have been added yet. Contacts will appear here once they are linked to accounts.'}
          </p>
        </Alert>
      )}

      {/* Contact Detail Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            👤 {selectedContact?.first_name} {selectedContact?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedContact && (
            <div>
              {/* Contact Information */}
              <div className="mb-4">
                <h5 className="mb-3">📋 Contact Information</h5>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Full Name</label>
                    <div className="fw-bold">{selectedContact.first_name} {selectedContact.last_name}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Job Title</label>
                    <div className="fw-bold">{selectedContact.job_title || 'N/A'}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Email Address</label>
                    <div>
                      {selectedContact.email ? (
                        <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                      ) : 'N/A'}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Phone Number</label>
                    <div>
                      {selectedContact.phone_number ? (
                        <a href={`tel:${selectedContact.phone_number}`}>{selectedContact.phone_number}</a>
                      ) : 'N/A'}
                    </div>
                  </div>
                  <div className="col-md-12 mb-3">
                    <label className="text-muted small">LinkedIn Profile</label>
                    <div>
                      {selectedContact.linkedin_url ? (
                        <a 
                          href={selectedContact.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-primary"
                        >
                          <i className="bi bi-linkedin"></i> View on LinkedIn
                        </a>
                      ) : (
                        <a 
                          href={generateLinkedInURL(
                            selectedContact.first_name, 
                            selectedContact.last_name,
                            accountInfo?.company_name
                          )} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="bi bi-search"></i> Search on LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              {accountInfo && (
                <div className="mb-3">
                  <h5 className="mb-3">🏢 Company Information</h5>
                  <div className="p-3 bg-light rounded">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Company Name</label>
                        <div className="fw-bold">{accountInfo.company_name}</div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Industry</label>
                        <div>{accountInfo.industry || accountInfo.company_category || 'N/A'}</div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Company Size</label>
                        <div>
                          {accountInfo.company_size ? (
                            <Badge bg={
                              accountInfo.company_size === 'Large' ? 'success' :
                              accountInfo.company_size === 'Medium' ? 'info' : 'secondary'
                            }>
                              {accountInfo.company_size}
                            </Badge>
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Location</label>
                        <div>
                          {[accountInfo.city, accountInfo.state_region, accountInfo.country]
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Website</label>
                        <div>
                          {accountInfo.website ? (
                            <a href={accountInfo.website} target="_blank" rel="noopener noreferrer">
                              {accountInfo.website}
                            </a>
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="text-muted small">Company Phone</label>
                        <div>{accountInfo.phone_number || 'N/A'}</div>
                      </div>
                      <div className="col-md-12 mt-2">
                        {accountInfo.linkedin_url ? (
                          <a 
                            href={accountInfo.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                          >
                            <i className="bi bi-linkedin"></i> View Company on LinkedIn
                          </a>
                        ) : (
                          <a 
                            href={generateCompanyLinkedInURL(accountInfo.company_name)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-search"></i> Search Company on LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="mt-3">
                <label className="text-muted small">Account ID</label>
                <div>
                  <Badge bg="secondary">#{selectedContact.linked_account_id}</Badge>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .table-row-hover:hover {
          background-color: rgba(99, 102, 241, 0.1) !important;
        }
      `}</style>
    </Container>
  );
}

export default ContactsPage;
