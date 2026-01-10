/**
 * Company Enrichment Routes (Simplified)
 * Works with current database schema and worker queue
 */

const express = require('express');
const router = express.Router();
const simpleEnrichmentService = require('../services/simpleEnrichmentService');
const { pool } = require('../db/connection');

/**
 * GET /api/enrichment/stats
 * Get enrichment statistics including queue status
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await simpleEnrichmentService.getStats();
    
    // Get queue statistics
    const queueStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM enrichment_queue
      GROUP BY status
    `);
    
    const queueByStatus = {};
    queueStats.rows.forEach(row => {
      queueByStatus[row.status] = parseInt(row.count);
    });
    
    // Get active workers
    const activeWorkers = await pool.query(`
      SELECT DISTINCT worker_id, COUNT(*) as jobs_processing
      FROM enrichment_queue
      WHERE status = 'processing'
      GROUP BY worker_id
    `);
    
    res.json({
      ...stats,
      queue: {
        pending: queueByStatus.pending || 0,
        processing: queueByStatus.processing || 0,
        completed: queueByStatus.completed || 0,
        failed: queueByStatus.failed || 0,
        total: Object.values(queueByStatus).reduce((sum, count) => sum + count, 0)
      },
      workers: {
        active: activeWorkers.rows.length,
        details: activeWorkers.rows
      }
    });
  } catch (error) {
    console.error('Error getting enrichment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/enrichment/enrich/:companyId
 * Enrich a specific company (direct processing, not queued)
 */
router.post('/enrich/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await simpleEnrichmentService.enrichCompany(companyId);
    res.json(result);
  } catch (error) {
    console.error('Error enriching company:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/enrichment/queue
 * Queue companies for background enrichment by workers
 * Body: { limit: number, priority: number } (optional)
 */
router.post('/queue', async (req, res) => {
  try {
    const { limit = 100, priority = 0 } = req.body || {};
    
    // Find companies that need enrichment
    const result = await pool.query(`
      INSERT INTO enrichment_queue (company_id, priority, status)
      SELECT c.id, $2, 'pending'
      FROM companies c
      WHERE c.website IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM enrichment_queue eq 
          WHERE eq.company_id = c.id 
            AND eq.status IN ('pending', 'processing')
        )
      ORDER BY c.last_updated DESC
      LIMIT $1
      ON CONFLICT (company_id) DO NOTHING
      RETURNING company_id
    `, [limit, priority]);
    
    res.json({
      success: true,
      queued: result.rowCount,
      message: `${result.rowCount} companies queued for enrichment`
    });
  } catch (error) {
    console.error('Error queueing companies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/enrichment/batch
 * Enrich a batch of companies (synchronous, for testing)
 * Body: { limit: number } (optional, default 10)
 */
router.post('/batch', async (req, res) => {
  try {
    const { limit } = req.body || {};
    const result = await simpleEnrichmentService.enrichBatch(limit || 10);
    res.json(result);
  } catch (error) {
    console.error('Error in batch enrichment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/enrichment/queue-status
 * Get detailed queue status by status type
 */
router.get('/queue-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM enrichment_queue
      GROUP BY status
    `);
    
    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    
    result.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });
    
    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/enrichment/process
 * Process a batch of pending companies in the queue
 */
router.post('/process', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    
    // Get pending items
    const pending = await pool.query(`
      SELECT company_id, id
      FROM enrichment_queue
      WHERE status = 'pending'
      LIMIT $1
    `, [limit]);
    
    let processed = 0;
    let failed = 0;
    
    for (const item of pending.rows) {
      try {
        await simpleEnrichmentService.enrichCompany(item.company_id);
        
        await pool.query(`
          UPDATE enrichment_queue
          SET status = 'completed', last_attempt = NOW()
          WHERE id = $1
        `, [item.id]);
        
        processed++;
      } catch (error) {
        await pool.query(`
          UPDATE enrichment_queue
          SET status = 'failed', 
              error_message = $1,
              retry_count = retry_count + 1,
              last_attempt = NOW()
          WHERE id = $2
        `, [error.message, item.id]);
        
        failed++;
      }
    }
    
    res.json({
      success: true,
      processed,
      failed,
      total: pending.rows.length
    });
  } catch (error) {
    console.error('Error processing queue:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/enrichment/queue/status
 * Get queue status (backwards compatibility)
 */
router.get('/queue/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest,
        AVG(attempts) as avg_attempts
      FROM enrichment_queue
      GROUP BY status
      ORDER BY status
    `);
    
    res.json({
      success: true,
      queue: result.rows
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/enrichment/queue/clear
 * Clear completed/failed jobs from queue
 */
router.delete('/queue/clear', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM enrichment_queue
      WHERE status IN ('completed', 'failed')
      RETURNING status
    `);
    
    const cleared = {};
    result.rows.forEach(row => {
      cleared[row.status] = (cleared[row.status] || 0) + 1;
    });
    
    res.json({
      success: true,
      cleared,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
