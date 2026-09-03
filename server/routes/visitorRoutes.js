const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  registerVisitor,
  searchVisitors,
  getVisitorById,
  getActiveVisitors,
  getTodayHistory,
  getMyRegistrations,
  checkRestricted,
  getCategories,
  getStats,
  processEntry,
  processExit,
  getEntryExitHistory,
} = require('../controllers/visitorController');

/**
 * Visitor Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route POST /api/visitors
 * @description Register a new visitor
 * @access Gate Operator, Security Officer, Admin
 * @body {string} category - Visitor category
 * @body {string} name - Visitor's full name
 * @body {string} identity_number - National ID or equivalent
 * @body {string} phone - Contact number
 * @body {string} [purpose] - Purpose of visit
 * @body {string} [host_name] - Host name (for one-time visitors)
 * @body {string} [host_department] - Host department
 * @body {string} [student_name] - Student name (for Guardian/Parent)
 * @body {string} [student_hall] - Student hall (for Guardian/Parent)
 * @body {string} [company_name] - Company name (for contractors/vendors)
 * @body {string} [project_code] - Project code (for construction)
 * @body {string} [work_site] - Work site location
 * @body {string} [vehicle_plate] - Vehicle plate number
 * @body {string} [event_name] - Event name
 * @body {string} [event_pass] - Event pass number
 * @returns {Object} 201 - Visitor created with pass
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 403 - Forbidden
 * @returns {Object} 409 - Duplicate active registration
 */
router.post(
  '/',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  registerVisitor
);

/**
 * @route GET /api/visitors/categories
 * @description Get all visitor categories with field configurations
 * @access Gate Operator, Security Officer, Admin
 * @returns {Object} 200 - Category configurations with fields and required fields
 */
router.get(
  '/categories',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getCategories
);

/**
 * @route GET /api/visitors/search
 * @description Search visitors by query
 * @access Gate Operator, Security Officer, Admin
 * @query {string} q - Search query (name, ID, phone, etc.)
 * @returns {Array} 200 - List of matching visitors
 * @returns {Object} 400 - Missing query parameter
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/search',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  searchVisitors
);

/**
 * @route GET /api/visitors/check-restricted
 * @description Check if a visitor is restricted
 * @access Gate Operator, Security Officer, Admin
 * @query {string} identity_number - Identity number to check
 * @returns {Object} 200 - { restricted: boolean, reason?, name?, restriction_type? }
 * @returns {Object} 400 - Missing identity number
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/check-restricted',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  checkRestricted
);

/**
 * @route GET /api/visitors/active
 * @description Get all visitors currently inside campus
 * @access Gate Operator, Security Officer, Admin
 * @returns {Array} 200 - List of active visitors with entry details
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/active',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getActiveVisitors
);

/**
 * @route GET /api/visitors/today
 * @description Get today's visitor history
 * @access Gate Operator, Security Officer, Admin
 * @returns {Array} 200 - List of today's visitor records
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/today',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getTodayHistory
);

/**
 * @route GET /api/visitors/my-registrations
 * @description Get visitors registered by the current operator
 * @access Gate Operator, Security Officer, Admin
 * @returns {Array} 200 - List of visitors registered by current user
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/my-registrations',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getMyRegistrations
);

/**
 * @route GET /api/visitors/stats
 * @description Get visitor statistics
 * @access Security Officer, Admin
 * @returns {Object} 200 - Statistics { total, inside, today_registered, today_entries, today_exits }
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 403 - Forbidden (requires Security Officer or Admin)
 */
router.get(
  '/stats',
  authorize(['Security Officer', 'Admin']),
  getStats
);

/**
 * @route GET /api/visitors/history
 * @description Get entry/exit history
 * @access Security Officer, Admin
 */
router.get('/history', authenticate, authorize(['Gate Operator', 'Security Officer', 'Admin']), getEntryExitHistory);

/**
 * @route GET /api/visitors/:id
 * @description Get visitor by database ID
 * @access Gate Operator, Security Officer, Admin
 * @param {string} id - Visitor database ID
 * @returns {Object} 200 - Visitor details
 * @returns {Object} 404 - Visitor not found
 * @returns {Object} 401 - Unauthorized
 */
router.get(
  '/:id',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getVisitorById
);
router.put('/:id/entry', authenticate, authorize(['Gate Operator', 'Security Officer', 'Admin']), processEntry);
router.put('/:id/exit',  authenticate, authorize(['Gate Operator', 'Security Officer', 'Admin']), processExit);

module.exports = router;