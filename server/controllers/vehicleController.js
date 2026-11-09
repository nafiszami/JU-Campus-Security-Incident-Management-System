const VehicleEntry = require('../models/VehicleEntry');
const { recordAuditEntry } = require('../models/AuditLog');

/**
 * Register a new vehicle arrival at a campus checkpoint.
 *
 * @route   POST /api/vehicles/entry
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const registerEntry = async (req, res, next) => {
  try {
    const {
      plate_number: plateNumber,
      vehicle_type: vehicleType,
      category,
      driver_name: driverName,
      driver_phone: driverPhone,
      driver_identity: driverIdentity,
      purpose,
      host_or_destination: hostOrDestination,
      entry_gate: entryGate,
      pass_valid_until: passValidUntil,
      is_emergency: isEmergency,
      remarks,
    } = req.body;

    // Validate required fields
    if (!plateNumber || !plateNumber.trim()) {
      return res.status(400).json({ error: 'Vehicle plate number is required' });
    }
    if (!driverName || !driverName.trim()) {
      return res.status(400).json({ error: 'Driver name is required' });
    }

    const cleanPlate = plateNumber.trim().toUpperCase();

    // Check if vehicle is blacklisted / restricted (FR-8.8)
    const restricted = await VehicleEntry.checkRestricted(cleanPlate);
    if (restricted) {
      await recordAuditEntry(
        req.user.id,
        'RESTRICTED_VEHICLE_ENTRY_ATTEMPT',
        `Blocked entry attempt by blacklisted vehicle ${cleanPlate}: ${restricted.reason}`
      );
      return res.status(403).json({
        error: 'Vehicle is restricted/blacklisted from entering campus',
        reason: restricted.reason,
        restriction_type: restricted.restriction_type,
      });
    }

    // Check if vehicle is already logged as inside the campus
    const active = await VehicleEntry.findActiveByPlate(cleanPlate);
    if (active) {
      return res.status(400).json({
        error: 'This vehicle is already inside campus. Record exit before logging a new entry.',
      });
    }

    const gate = entryGate || req.user.assigned_gate || 'Main Gate';

    const created = await VehicleEntry.create({
      plate_number: cleanPlate,
      vehicle_type: vehicleType || 'Car',
      category: category || 'Visitor',
      driver_name: driverName.trim(),
      driver_phone: driverPhone || 'N/A',
      driver_identity: driverIdentity || null,
      purpose: purpose || null,
      host_or_destination: hostOrDestination || null,
      entry_gate: gate,
      entered_by: req.user.id,
      pass_valid_until: passValidUntil || null,
      is_emergency: Boolean(isEmergency),
      remarks: remarks || null,
    });

    await recordAuditEntry(
      req.user.id,
      'VEHICLE_ENTRY',
      `Vehicle ${created.plate_number} (${created.vehicle_type}) entered campus via ${gate}`
    );

    return res.status(201).json({
      message: 'Vehicle entry registered successfully',
      vehicle: created,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Record a vehicle's departure from the campus.
 *
 * @route   PUT /api/vehicles/:id/exit
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const processExit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { exit_gate: exitGate, remarks } = req.body;

    const vehicle = await VehicleEntry.findById(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle entry record not found' });
    }

    if (vehicle.status !== 'Inside') {
      return res.status(400).json({
        error: 'Vehicle is not inside campus or has already exited.',
      });
    }

    const gate = exitGate || req.user.assigned_gate || 'Main Gate';
    const updated = await VehicleEntry.processExit(id, gate, req.user.id, remarks);

    await recordAuditEntry(
      req.user.id,
      'VEHICLE_EXIT',
      `Vehicle ${vehicle.plate_number} exited campus via ${gate} (Duration: ${updated.duration_minutes} mins)`
    );

    return res.json({
      message: 'Vehicle exit recorded successfully',
      vehicle: updated,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all vehicles currently inside the campus.
 *
 * @route   GET /api/vehicles/active
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const getActiveVehicles = async (req, res, next) => {
  try {
    const activeList = await VehicleEntry.getActive();
    return res.json(activeList);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get vehicle movement history with query filters.
 *
 * @route   GET /api/vehicles/history
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const getVehicleHistory = async (req, res, next) => {
  try {
    const { date_from, date_to, category, vehicle_type, status, search } = req.query;

    const history = await VehicleEntry.getHistory({
      date_from,
      date_to,
      category,
      vehicle_type,
      status,
      search,
    });

    return res.json(history);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get a specific vehicle entry record by database ID.
 *
 * @route   GET /api/vehicles/:id
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = await VehicleEntry.findById(id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle entry record not found' });
    }

    return res.json(vehicle);
  } catch (error) {
    return next(error);
  }
};

/**
 * Check whether a vehicle plate is blacklisted.
 *
 * @route   GET /api/vehicles/check-restricted/:plateNumber
 * @access  Gate Operator, Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const checkRestricted = async (req, res, next) => {
  try {
    const { plateNumber } = req.params;
    if (!plateNumber) {
      return res.status(400).json({ error: 'Plate number is required' });
    }

    const restricted = await VehicleEntry.checkRestricted(plateNumber);
    if (!restricted) {
      return res.json({ restricted: false, plate_number: plateNumber });
    }

    return res.json({
      restricted: true,
      plate_number: restricted.plate_number,
      reason: restricted.reason,
      restriction_type: restricted.restriction_type,
      created_at: restricted.created_at,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add a vehicle to the blacklisted / restricted vehicle list.
 *
 * @route   POST /api/vehicles/restricted
 * @access  Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const addRestrictedVehicle = async (req, res, next) => {
  try {
    const { plate_number: plateNumber, reason, restriction_type: restrictionType } = req.body;

    if (!plateNumber || !plateNumber.trim()) {
      return res.status(400).json({ error: 'Plate number is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for restriction is required' });
    }

    const cleanPlate = plateNumber.trim().toUpperCase();

    const created = await VehicleEntry.addRestricted({
      plate_number: cleanPlate,
      reason: reason.trim(),
      restriction_type: restrictionType || 'Permanent',
      added_by: req.user.id,
    });

    await recordAuditEntry(
      req.user.id,
      'ADD_RESTRICTED_VEHICLE',
      `Vehicle ${cleanPlate} added to restricted list: ${reason}`
    );

    return res.status(201).json({
      message: 'Vehicle added to restricted list successfully',
      restrictedVehicle: created,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get statistical summary of vehicle movements.
 *
 * @route   GET /api/vehicles/stats
 * @access  Security Officer, Admin
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 * @returns {Promise<void>}
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await VehicleEntry.getStats();
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerEntry,
  processExit,
  getActiveVehicles,
  getVehicleHistory,
  getVehicleById,
  checkRestricted,
  addRestrictedVehicle,
  getStats,
};
