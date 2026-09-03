const express = require('express');
const { createIncident } = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply authentication and single file upload middleware
router.post('/', protect, upload.single('evidence'), createIncident);

module.exports = router;
