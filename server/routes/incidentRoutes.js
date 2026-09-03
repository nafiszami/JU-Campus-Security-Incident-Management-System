const express = require('express');
const {
  createIncident,
  getIncidents,
  getIncidentById,
  exportIncidents,
  getIncidentTimeline,
} = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// POST /api/incidents — Submit a new incident report (Sprint 1)
router.post('/', protect, upload.single('evidence'), createIncident);

// GET /api/incidents — List & filter incident reports with role-based visibility (Sprint 2 Day 1)
router.get('/', protect, getIncidents);

// GET /api/incidents/export — Export filtered reports to CSV (Sprint 2 Day 2)
// NOTE: /export MUST be registered BEFORE /:id to prevent routing 'export' as a param ID
router.get('/export', protect, exportIncidents);

// GET /api/incidents/:id — View single incident report details with RBAC (Sprint 2 Day 2)
router.get('/:id', protect, getIncidentById);

// GET /api/incidents/:id/timeline — View status history timeline for an incident (Sprint 2 Day 2)
router.get('/:id/timeline', protect, getIncidentTimeline);

module.exports = router;
