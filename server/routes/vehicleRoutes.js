const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  registerEntry,
  processExit,
  getActiveVehicles,
  getVehicleHistory,
  getVehicleById,
  checkRestricted,
  addRestrictedVehicle,
  getStats,
} = require('../controllers/vehicleController');

/**
 * Vehicle Routes (SRS Feature 8)
 * All endpoints require a valid JWT authentication token.
 */
router.use(authenticate);

/**
 * @route   POST /api/vehicles/entry
 * @desc    Register a new vehicle entry at campus gate
 * @access  Gate Operator, Security Officer, Admin
 */
router.post(
  '/entry',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  registerEntry
);

/**
 * @route   PUT /api/vehicles/:id/exit
 * @desc    Record a vehicle exit from campus
 * @access  Gate Operator, Security Officer, Admin
 */
router.put(
  '/:id/exit',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  processExit
);

/**
 * @route   GET /api/vehicles/active
 * @desc    Get all vehicles currently inside campus
 * @access  Gate Operator, Security Officer, Admin
 */
router.get(
  '/active',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getActiveVehicles
);

/**
 * @route   GET /api/vehicles/history
 * @desc    Get vehicle entry and exit movement history
 * @access  Gate Operator, Security Officer, Admin
 */
router.get(
  '/history',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getVehicleHistory
);

/**
 * @route   GET /api/vehicles/stats
 * @desc    Get summary metrics of vehicle entries and exits
 * @access  Security Officer, Admin
 */
router.get(
  '/stats',
  authorize(['Security Officer', 'Admin']),
  getStats
);

/**
 * @route   GET /api/vehicles/check-restricted/:plateNumber
 * @desc    Check if a vehicle plate number is blacklisted/restricted
 * @access  Gate Operator, Security Officer, Admin
 */
router.get(
  '/check-restricted/:plateNumber',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  checkRestricted
);

/**
 * @route   POST /api/vehicles/restricted
 * @desc    Add a vehicle to the blacklisted/restricted list
 * @access  Security Officer, Admin
 */
router.post(
  '/restricted',
  authorize(['Security Officer', 'Admin']),
  addRestrictedVehicle
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get details of a single vehicle entry record
 * @access  Gate Operator, Security Officer, Admin
 */
router.get(
  '/:id',
  authorize(['Gate Operator', 'Security Officer', 'Admin']),
  getVehicleById
);

module.exports = router;
