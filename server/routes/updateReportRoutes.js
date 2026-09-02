const express = require('express');

const { authenticate } = require('../middleware/auth');
const { loadCurrentUser } = require('../middleware/loadCurrentUser');
const { authorize } = require('../middleware/role');

const { updateInvestigationStatus, closeReport } = require('../controllers/updateReportController');

const router = express.Router();

/**
 * Authenticate users, refresh req.user from the database, and
 * restrict access to Security Officers. Finer-grained checks (the
 * specific assigned officer vs. Head Security Officer) run per route
 * inside the controller, since they depend on the specific report.
 */
router.use(authenticate, loadCurrentUser, authorize(['Security Officer']));

/**
 * Updates an incident's investigation status.
 *
 * Only the Security Officer currently assigned to the report may
 * call this.
 *
 * @route PATCH /:id/status
 * @middleware authenticate
 * @middleware authorize
 * @param {number} id - ID of the incident report.
 * @returns {Object} Updated incident report.
 */
router.patch('/:id/status', updateInvestigationStatus);

/**
 * Closes a Resolved incident report.
 *
 * Only the Head Security Officer may call this.
 *
 * @route PUT /:id/close
 * @middleware authenticate
 * @middleware authorize
 * @param {number} id - ID of the incident report.
 * @returns {Object} Updated incident report.
 */
router.put('/:id/close', closeReport);

module.exports = router;