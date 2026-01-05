import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';

/**
 * CompanyCard Component
 * Displays company information in a card format
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
    <Card className="mb-3 shadow-sm hover-shadow" style={{ cursor: 'pointer' }}>
      <Card.Body>
        <Row className="align-items-start">
          <Col md={8}>
            <Card.Title className="mb-2">
              <h5>{company.name}</h5>
            </Card.Title>

            <div className="mb-2">
              <Badge bg={getStatusBadge(company.status)} className="me-2">
                {company.status}
              </Badge>
              {company.type && (
                <Badge bg="info">{company.type}</Badge>
              )}
            </div>

            <p className="text-muted small mb-2">
              <strong>Registration #:</strong> {company.registrationNumber}
            </p>

            {company.address && (
              <p className="text-muted small mb-2">
                <strong>Address:</strong> {company.address}
              </p>
            )}

            {company.incorporationDate && (
              <p className="text-muted small mb-0">
                <strong>Incorporated:</strong> {new Date(company.incorporationDate).toLocaleDateString()}
              </p>
            )}
          </Col>

          <Col md={4} className="text-md-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewDetails(company)}
              className="mt-2"
            >
              View Details →
            </Button>
            {company.url && (
              <p className="mt-2">
                <a 
                  href={company.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-link btn-sm"
                >
                  Official Link
                </a>
              </p>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default CompanyCard;
