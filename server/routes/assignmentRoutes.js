const express = require('express');

const { authenticate } = require('../middleware/auth');
const { loadCurrentUser } = require('../middleware/loadCurrentUser');

const {
  authorize,
  requireHeadSecurityOfficer,
} = require('../middleware/role');

const {
  listIncidents,
  getIncidentDetails,
  getAssignableOfficers,
  assignReport,
  getAssignmentHistory,
} = require('../controllers/assignmentController');

const router = express.Router();

/**
 * Authenticate users, refresh req.user from the database, and
 * restrict access to Security Officers.
 */
router.use(authenticate, loadCurrentUser, authorize(['Security Officer']));

/**
 * Retrieves active Security Officers and their assignment availability.
 *
 * Only the Head Security Officer is allowed to access this endpoint.
 *
 * @route GET /officers/available
 * @middleware authenticate
 * @middleware authorize
 * @middleware requireHeadSecurityOfficer
 * @returns {Object[]} List of active Security Officers with availability status.
 */
router.get(
  '/officers/available',
  requireHeadSecurityOfficer,
  getAssignableOfficers,
);

/**
 * Assigns or reassigns an incident report to a Security Officer.
 *
 * Only the Head Security Officer is allowed to perform this operation.
 *
 * @route PUT /:id/assign
 * @middleware authenticate
 * @middleware authorize
 * @middleware requireHeadSecurityOfficer
 * @param {number} id - ID of the incident report.
 * @returns {Object} Updated incident report.
 */
router.put(
  '/:id/assign',
  requireHeadSecurityOfficer,
  assignReport,
);

/**
 * Retrieves the assignment history for a specific incident.
 *
 * Security Officers can view the assignment history according to
 * the access rules implemented in the assignment controller.
 *
 * @route GET /:id/assignment-history
 * @middleware authenticate
 * @middleware authorize
 * @param {number} id - ID of the incident report.
 * @returns {Object} Incident report and assignment history.
 */
router.get(
  '/:id/assignment-history',
  getAssignmentHistory,
);

/**
 * Retrieves detailed information about a specific incident.
 *
 * @route GET /:id
 * @middleware authenticate
 * @middleware authorize
 * @param {number} id - ID of the incident report.
 * @returns {Object} Incident details.
 */
router.get('/:id', getIncidentDetails);

/**
 * Retrieves incidents available to the logged-in Security Officer.
 *
 * Head Security Officers can view all incidents, while other
 * Security Officers can view incidents assigned to them.
 *
 * @route GET /
 * @middleware authenticate
 * @middleware authorize
 * @returns {Object[]} List of incidents.
 */
router.get('/', listIncidents);

module.exports = router;