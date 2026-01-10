import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * Dashboard Component
 * Main landing page with navigation cards
 */
function Dashboard() {
  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">🌍 Data Bunker</h1>
        <p className="lead text-muted">
          Your Complete Business Intelligence Platform
        </p>
      </div>

      <Row className="g-4">
        {/* Accounts Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm hover-lift" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="text-center p-5">
              <div className="mb-4" style={{ fontSize: '4rem' }}>📊</div>
              <Card.Title className="mb-3">
                <h3>Accounts</h3>
              </Card.Title>
              <Card.Text className="text-muted mb-4">
                Browse and filter through 6M+ company accounts with advanced search capabilities
              </Card.Text>
              <Link to="/accounts">
                <Button variant="primary" size="lg" className="w-100">
                  Open Accounts
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        {/* Contacts Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm hover-lift" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="text-center p-5">
              <div className="mb-4" style={{ fontSize: '4rem' }}>👥</div>
              <Card.Title className="mb-3">
                <h3>Contacts</h3>
              </Card.Title>
              <Card.Text className="text-muted mb-4">
                Manage business contacts linked to company accounts with email and phone details
              </Card.Text>
              <Link to="/contacts">
                <Button variant="success" size="lg" className="w-100">
                  Open Contacts
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        {/* Enrichment Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm hover-lift" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="text-center p-5">
              <div className="mb-4" style={{ fontSize: '4rem' }}>🤖</div>
              <Card.Title className="mb-3">
                <h3>Enrichment</h3>
              </Card.Title>
              <Card.Text className="text-muted mb-4">
                Monitor automated data enrichment processes and quality metrics
              </Card.Text>
              <Link to="/enrichment">
                <Button variant="info" size="lg" className="w-100">
                  Open Enrichment
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mt-5">
        <Col>
          <Card className="bg-light">
            <Card.Body>
              <Row className="text-center">
                <Col md={3}>
                  <h2 className="text-primary mb-0">6M+</h2>
                  <small className="text-muted">Total Accounts</small>
                </Col>
                <Col md={3}>
                  <h2 className="text-success mb-0">4M+</h2>
                  <small className="text-muted">UK Companies</small>
                </Col>
                <Col md={3}>
                  <h2 className="text-info mb-0">2</h2>
                  <small className="text-muted">Countries</small>
                </Col>
                <Col md={3}>
                  <h2 className="text-warning mb-0">24/7</h2>
                  <small className="text-muted">Live Enrichment</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
