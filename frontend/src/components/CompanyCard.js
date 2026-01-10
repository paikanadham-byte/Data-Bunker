import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';

/**
 * CompanyCard Component - Futuristic Dark Theme
 */
function CompanyCard({ company, onViewDetails }) {
  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'Active': 'success',
      'inactive': 'danger',
      'Inactive': 'danger',
      'dissolved': 'secondary',
      'Dissolved': 'secondary',
      'liquidation': 'warning'
    };

    return statusMap[status] || 'info';
  };

  return (
    <Card className="mb-3 shadow-sm hover-shadow" style={{ cursor: 'pointer', borderRadius: '12px' }}>
      <Card.Body>
        <Row className="align-items-start">
          <Col md={12}>
            <Card.Title className="mb-2">
              <h5 className="company-name" style={{ 
                fontSize: '1.05rem', 
                fontWeight: '600',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {company.name}
              </h5>
            </Card.Title>

            <div className="mb-3">
              <Badge bg={getStatusBadge(company.status)} className="me-2">
                {company.status}
              </Badge>
              {company.type && (
                <Badge bg="info">{company.type}</Badge>
              )}
            </div>

            <div className="company-details" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              {(company.company_number || company.registrationNumber) && (
                <p className="small mb-2">
                  <strong>ID:</strong> {company.company_number || company.registrationNumber}
                </p>
              )}

              {(company.address || company.address_line_1) && (
                <p className="small mb-2" style={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <strong>📍</strong> {company.address || company.address_line_1}
                  {company.locality && `, ${company.locality}`}
                </p>
              )}

              {(company.incorporation_date || company.incorporationDate) && (
                <p className="small mb-2">
                  <strong>Est:</strong> {new Date(company.incorporation_date || company.incorporationDate).getFullYear()}
                </p>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid rgba(20, 184, 166, 0.1)',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {/* Contact Icons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {company.website && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(20, 184, 166, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }} title="Website">
                    🌐
                  </div>
                )}
                {company.email && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(20, 184, 166, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }} title="Email">
                    📧
                  </div>
                )}
                {company.phone && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(20, 184, 166, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }} title="Phone">
                    📞
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewDetails(company)}
              >
                View →
              </Button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default CompanyCard;
