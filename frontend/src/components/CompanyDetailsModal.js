import React, { useState } from 'react';
import { Modal, Table, Badge, Row, Col, Button } from 'react-bootstrap';
import { companyService } from '../api';

/**
 * CompanyDetailsModal Component
 * Shows detailed information about a company
 */
function CompanyDetailsModal({ show, company, onHide }) {
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [showOfficers, setShowOfficers] = useState(false);

  const loadOfficers = async () => {
    if (showOfficers || company.jurisdiction !== 'gb') return;

    try {
      setLoadingOfficers(true);
      const response = await companyService.getOfficers(company.id, 'gb');
      setOfficers(response.data.data.officers);
      setShowOfficers(true);
    } catch (error) {
      console.error('Failed to load officers:', error);
      alert('Failed to load officers');
    } finally {
      setLoadingOfficers(false);
    }
  };

  if (!company) return null;

  // Calculate enrichment completeness
  const enrichmentFields = ['website', 'email', 'phone'];
  const enrichedCount = enrichmentFields.filter(field => company[field]).length;
  const enrichmentPercentage = Math.round((enrichedCount / enrichmentFields.length) * 100);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {company.name}
          {enrichedCount > 0 && (
            <Badge 
              bg={enrichmentPercentage === 100 ? 'success' : enrichmentPercentage >= 66 ? 'info' : 'warning'} 
              className="ms-2" 
              style={{fontSize: '0.65rem', fontWeight: 'normal', verticalAlign: 'middle'}}
            >
              {enrichmentPercentage}% Enriched
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Basic Information */}
        <section className="mb-4">
          <h6 className="mb-3">📋 Basic Information</h6>
          <Row className="mb-2">
            <Col md={6}>
              <p className="text-muted small mb-1">Status</p>
              <p>
                <Badge bg={company.status === 'Active' || company.status === 'active' ? 'success' : 'danger'}>
                  {company.status || 'Active'}
                </Badge>
              </p>
            </Col>
            <Col md={6}>
              <p className="text-muted small mb-1">Registration Number</p>
              <p className="fw-bold">{company.company_number || company.registration_number || company.registrationNumber || 'N/A'}</p>
            </Col>
          </Row>

          <Row className="mb-2">
            <Col md={6}>
              <p className="text-muted small mb-1">Company Type</p>
              <p>{company.company_type || company.type || 'N/A'}</p>
            </Col>
            <Col md={6}>
              <p className="text-muted small mb-1">Incorporation Date</p>
              <p>
                {company.incorporation_date || company.incorporationDate 
                  ? new Date(company.incorporation_date || company.incorporationDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </Col>
          </Row>

          {company.jurisdiction && (
            <Row className="mb-2">
              <Col md={12}>
                <p className="text-muted small mb-1">Jurisdiction</p>
                <p>{company.jurisdiction}</p>
              </Col>
            </Row>
          )}
        </section>

        {/* Contact Information - Enriched Data */}
        {(company.website || company.email || company.phone || company.linkedin_url) && (
          <section className="mb-4">
            <h6 className="mb-3">
              📞 Contact Information 
              <Badge bg="success" className="ms-2" style={{fontSize: '0.7rem', fontWeight: 'normal'}}>
                Enriched
              </Badge>
            </h6>
            <Row>
              {company.website && (
                <Col md={12} className="mb-3">
                  <p className="text-muted small mb-1">🌐 Website</p>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    {company.website}
                  </a>
                </Col>
              )}
              
              {company.email && (
                <Col md={6} className="mb-3">
                  <p className="text-muted small mb-1">📧 Email</p>
                  <a href={`mailto:${company.email}`} className="text-primary">
                    {company.email}
                  </a>
                </Col>
              )}

              {company.phone && (
                <Col md={6} className="mb-3">
                  <p className="text-muted small mb-1">📱 Phone</p>
                  <a href={`tel:${company.phone}`} className="text-primary">
                    {company.phone}
                  </a>
                </Col>
              )}

              {company.linkedin_url && (
                <Col md={12} className="mb-3">
                  <p className="text-muted small mb-1">💼 LinkedIn</p>
                  <a 
                    href={company.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    {company.linkedin_url}
                  </a>
                </Col>
              )}
            </Row>
          </section>
        )}

        {/* Address */}
        {(company.address || company.registeredOffice || company.address_line_1) && (
          <section className="mb-4">
            <h6 className="mb-3">🏢 Address</h6>
            {company.registeredOffice ? (
              <>
                <p>{company.registeredOffice.full}</p>
                {company.registeredOffice.city && (
                  <p className="text-muted small">
                    {company.registeredOffice.city}, {company.registeredOffice.state}, {company.registeredOffice.postalCode}
                  </p>
                )}
              </>
            ) : (
              <>
                <p>{company.address || company.address_line_1}</p>
                {company.address_line_2 && <p>{company.address_line_2}</p>}
                {(company.locality || company.region || company.postal_code) && (
                  <p className="text-muted small">
                    {[company.locality, company.region, company.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}
                {company.country && (
                  <p className="text-muted small">{company.country}</p>
                )}
              </>
            )}
          </section>
        )}

        {/* Industry/SIC */}
        {(company.industry || company.sicDescription) && (
          <section className="mb-4">
            <h6 className="mb-3">🏭 Industry</h6>
            <p>{company.industry || company.sicDescription}</p>
          </section>
        )}

        {/* Description */}
        {company.description && (
          <section className="mb-4">
            <h6 className="mb-3">📝 Description</h6>
            <p>{company.description}</p>
          </section>
        )}

        {/* Contact Information from Google Places */}
        {company.contactInfo && (
          <section className="mb-4">
            <h6 className="mb-3">📞 Contact Information</h6>
            <Row>
              {company.contactInfo.website && (
                <Col md={12} className="mb-3">
                  <p className="text-muted small mb-1">🌐 Website</p>
                  <a 
                    href={company.contactInfo.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    {company.contactInfo.website}
                  </a>
                </Col>
              )}
              
              {company.contactInfo.phone && (
                <Col md={6} className="mb-3">
                  <p className="text-muted small mb-1">📱 Phone</p>
                  <a href={`tel:${company.contactInfo.phone}`} className="text-primary">
                    {company.contactInfo.phone}
                  </a>
                </Col>
              )}

              {company.contactInfo.rating && (
                <Col md={6} className="mb-3">
                  <p className="text-muted small mb-1">⭐ Google Rating</p>
                  <p>
                    {company.contactInfo.rating} / 5 
                    <span className="text-muted small ms-2">
                      ({company.contactInfo.totalRatings} reviews)
                    </span>
                  </p>
                </Col>
              )}

              {company.contactInfo.emailPatterns && (
                <Col md={12} className="mb-3">
                  <p className="text-muted small mb-1">📧 Email Patterns (Common)</p>
                  <div className="d-flex flex-wrap gap-2">
                    {company.contactInfo.emailPatterns.patterns.map((email, idx) => (
                      <Badge key={idx} bg="secondary" className="text-monospace">
                        {email}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted small mt-2 fst-italic">
                    ⚠️ {company.contactInfo.emailPatterns.note}
                  </p>
                </Col>
              )}

              {company.contactInfo.googleMapsUrl && (
                <Col md={12}>
                  <a 
                    href={company.contactInfo.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-success btn-sm"
                  >
                    📍 View on Google Maps
                  </a>
                </Col>
              )}
            </Row>
          </section>
        )}

        {/* Officers (UK only) */}
        {company.jurisdiction === 'gb' && (
          <section className="mb-4">
            <h6 className="mb-3">👥 Officers/Directors</h6>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={loadOfficers}
              disabled={loadingOfficers}
              className="mb-3"
            >
              {loadingOfficers ? 'Loading...' : 'Load Officers'}
            </Button>

            {showOfficers && officers.length > 0 && (
              <div className="table-responsive">
                <Table striped size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Appointed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map((officer, idx) => (
                      <tr key={idx}>
                        <td>{officer.name}</td>
                        <td>{officer.position}</td>
                        <td className="text-muted small">
                          {new Date(officer.appointmentDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </section>
        )}

        {/* Filing Information */}
        {company.accounts && (
          <section className="mb-4">
            <h6 className="mb-3">📄 Filing Status</h6>
            <p className="text-muted small mb-1">Last Accounts Filing</p>
            <p>
              {company.accounts.lastFilingDate
                ? new Date(company.accounts.lastFilingDate).toLocaleDateString()
                : 'Not available'}
              {company.accounts.overdue && (
                <Badge bg="danger" className="ms-2">Overdue</Badge>
              )}
            </p>
          </section>
        )}

        {/* Additional Links */}
        {company.url && (
          <section>
            <h6 className="mb-3">🔗 Links</h6>
            <a 
              href={company.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline-primary btn-sm"
            >
              View on {company.source}
            </a>
          </section>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CompanyDetailsModal;
