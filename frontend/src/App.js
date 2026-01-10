import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'leaflet/dist/leaflet.css';
import Dashboard from './pages/Dashboard';
import DashboardPage from './pages/DashboardPage';
import DiscoveryPage from './pages/DiscoveryPage';
import AccountsPage from './pages/AccountsPage';
import ContactsPage from './pages/ContactsPage';
import EnrichmentPage from './pages/EnrichmentPage';
import './App.css';

function NavigationBar({ theme, toggleTheme }) {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          🌍 Data Bunker
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/discovery" active={location.pathname === '/discovery'}>
              🔍 Discovery
            </Nav.Link>
            <Nav.Link as={Link} to="/accounts" active={location.pathname === '/accounts'}>
              📊 Accounts
            </Nav.Link>
            <Nav.Link as={Link} to="/contacts" active={location.pathname === '/contacts'}>
              👥 Contacts
            </Nav.Link>
            <Nav.Link as={Link} to="/enrichment" active={location.pathname === '/enrichment'}>
              🤖 Enrichment
            </Nav.Link>
          </Nav>
          <Nav>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={toggleTheme}
              className="d-flex align-items-center gap-2"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Router>
      <div className="App" data-theme={theme}>
        <NavigationBar theme={theme} toggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/enrichment" element={<EnrichmentPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
