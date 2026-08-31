const express = require('express');
const { createIncident, getIncidents } = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// POST /api/incidents — Submit a new incident report (Sprint 1)
router.post('/', protect, upload.single('evidence'), createIncident);

// GET /api/incidents — List & filter incident reports with role-based visibility (Sprint 2)
router.get('/', protect, getIncidents);

module.exports = router;
