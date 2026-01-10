/**
 * Discovery Routes
 * Control company discovery and scraping
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Track discovery process
let discoveryProcess = null;
let discoveryStatus = {
  running: false,
  city: null,
  state: null,
  startTime: null,
  companiesFound: 0
};

/**
 * Start company discovery for custom location
 * POST /api/discovery/start
 */
router.post('/start', async (req, res) => {
  try {
    const { city, state, limit } = req.body;

    if (!city || !state) {
      return res.status(400).json({
        success: false,
        error: 'City and state are required'
      });
    }

    // Stop existing discovery if running
    if (discoveryProcess) {
      discoveryProcess.kill();
      discoveryProcess = null;
    }

    // Map state to state code
    const stateMap = {
      'california': 'CA', 'new york': 'NY', 'texas': 'TX', 'florida': 'FL',
      'illinois': 'IL', 'pennsylvania': 'PA', 'ohio': 'OH', 'georgia': 'GA',
      'north carolina': 'NC', 'michigan': 'MI', 'new jersey': 'NJ', 'virginia': 'VA',
      'washington': 'WA', 'arizona': 'AZ', 'massachusetts': 'MA', 'tennessee': 'TN',
      'indiana': 'IN', 'missouri': 'MO', 'maryland': 'MD', 'wisconsin': 'WI',
      'colorado': 'CO', 'minnesota': 'MN', 'south carolina': 'SC', 'alabama': 'AL',
      'louisiana': 'LA', 'kentucky': 'KY', 'oregon': 'OR', 'oklahoma': 'OK',
      'connecticut': 'CT', 'utah': 'UT', 'iowa': 'IA', 'nevada': 'NV',
      'arkansas': 'AR', 'mississippi': 'MS', 'kansas': 'KS', 'new mexico': 'NM',
      'nebraska': 'NE', 'west virginia': 'WV', 'idaho': 'ID', 'hawaii': 'HI',
      'new hampshire': 'NH', 'maine': 'ME', 'montana': 'MT', 'rhode island': 'RI',
      'delaware': 'DE', 'south dakota': 'SD', 'north dakota': 'ND', 'alaska': 'AK',
      'vermont': 'VT', 'wyoming': 'WY'
    };

    const stateCode = stateMap[state.toLowerCase()] || state.toUpperCase().substring(0, 2);
    
    // Start OpenAI-powered discovery script
    const scriptPath = path.join(__dirname, '../../scripts/discover-with-openai.js');
    const args = [scriptPath, city, state, limit?.toString() || '100'];
    
    console.log(`Starting OpenAI discovery: ${city}, ${state} (${stateCode}) - Limit: ${limit || 100}`);
    
    discoveryProcess = spawn('node', args, {
      cwd: path.join(__dirname, '../..'),
      env: process.env
    });

    discoveryStatus = {
      running: true,
      city,
      state,
      stateCode,
      limit: limit || 500,
      startTime: new Date(),
      companiesFound: 0
    };

    // Log output
    discoveryProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Discovery] ${output}`);
      
      // Parse company count from various formats
      const patterns = [
        /Total companies found: (\d+)/i,
        /companies found: (\d+)/i,
        /✅ Saved:.*\((\d+)\/\d+\)/,
        /Progress: (\d+) companies/i,
        /📊 Total: (\d+)/i
      ];
      
      for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match) {
          discoveryStatus.companiesFound = parseInt(match[1]);
          break;
        }
      }
      
      // Count individual "Saved" messages
      const savedMatches = output.match(/✅ Saved:/g);
      if (savedMatches) {
        discoveryStatus.companiesFound += savedMatches.length;
      }
    });

    discoveryProcess.stderr.on('data', (data) => {
      console.error(`[Discovery Error] ${data}`);
    });

    discoveryProcess.on('close', (code) => {
      console.log(`Discovery process exited with code ${code}`);
      discoveryStatus.running = false;
      discoveryProcess = null;
    });

    res.json({
      success: true,
      message: `Company discovery started for ${city}, ${state}`,
      status: discoveryStatus
    });

  } catch (error) {
    console.error('Discovery start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop company discovery
 * POST /api/discovery/stop
 */
router.post('/stop', async (req, res) => {
  try {
    if (discoveryProcess) {
      discoveryProcess.kill();
      discoveryProcess = null;
      discoveryStatus.running = false;
      
      res.json({
        success: true,
        message: 'Discovery stopped',
        status: discoveryStatus
      });
    } else {
      res.json({
        success: true,
        message: 'No discovery process running',
        status: discoveryStatus
      });
    }
  } catch (error) {
    console.error('Discovery stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get discovery status
 * GET /api/discovery/status
 */
router.get('/status', async (req, res) => {
  res.json({
    success: true,
    status: discoveryStatus
  });
});

/**
 * Get completed areas for a city
 * GET /api/discovery/completed-areas/:state/:city
 */
router.get('/completed-areas/:state/:city', async (req, res) => {
  try {
    const { state, city } = req.params;
    const { pool } = require('../db/connection');
    
    const result = await pool.query(
      `SELECT neighborhood, status, completed_at 
       FROM discovery_progress 
       WHERE LOWER(city) = LOWER($1) 
       AND LOWER(state_region) = LOWER($2)
       ORDER BY completed_at DESC`,
      [city, state]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    // Table might not exist yet
    res.json({
      success: true,
      data: []
    });
  }
});

module.exports = router;
