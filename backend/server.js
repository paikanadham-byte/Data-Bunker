/**
 * Data Bunker Backend Server
 * Global Company Search API
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 3600000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Data Bunker Backend API',
    version: '2.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      health: '/health',
      search: '/api/search',
      companies: '/api/companies',
      locations: '/api/locations',
      filter: '/api/filter'
    },
    documentation: '/api/docs'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/search', require('./src/routes/search'));
app.use('/api/companies', require('./src/routes/companies'));
app.use('/api/locations', require('./src/routes/locations'));
app.use('/api/filter', require('./src/routes/filter'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     Data Bunker Backend Server         ║
╠════════════════════════════════════════╣
║ 🚀 Server running on http://localhost:${PORT}
║ 📊 Environment: ${process.env.NODE_ENV || 'development'}
║ 🔑 Companies House API: ${process.env.COMPANIES_HOUSE_API_KEY ? '✓' : '✗'}
║ 🌍 OpenCorporates API: ${process.env.OPENCORPORATES_API_KEY ? '✓' : '✗'}
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
