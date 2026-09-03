/**
 * @module controllers/restrictedController
 * @description Request handlers for Restricted Visitor Management
 * (SRS 3.1.7, FR-7.1–FR-7.6). Each function is mounted onto a route in
 * server/routes/restrictedRoutes.js and follows the standard shape:
 * validate input -> call the model layer -> write an audit log entry ->
 * respond with JSON.
 *
 * TEMPORARY (parallel-development bypass): every place that reads
 * `req.user.id` is marked below. Since auth middleware is commented out
 * in restrictedRoutes.js for now, `req.user` is undefined and reading
 * `req.user.id` would crash the request. Each occurrence is replaced with
 * a hardcoded `userId` constant for local testing.
 * SEARCH FOR THE STRING "TEMPORARY" BEFORE OPENING YOUR PR — every one of
 * these must be reverted to the real `req.user.id` / `req.user.role`
 * once Member 6's auth middleware is merged into main.
 */

const RestrictedVisitor = require('../models/RestrictedVisitor');
const ExceptionRequest = require('../models/ExceptionRequest');
// TEMPORARY: AuditLog.js exists but has no working code yet (empty file) — uncomment once Member 6 implements it.
// const AuditLog = require('../models/AuditLog');

// TEMPORARY: stand-in for req.user.id while auth middleware is disabled.
// Assumes a users row with id=1 exists in your local DB (e.g. seeded Admin).
// Delete this line and use req.user.id directly once auth is restored.
const userId = 1;

/**
 * POST /api/restricted
 * Add a new restricted visitor (FR-7.1). Rejects the request if the
 * person is already actively restricted, or if a temporary restriction
 * is missing its end date.
 *
 * @param {import('express').Request} req - Expects `identity_number`, `name`,
 *   `reason`, `restriction_type`, `start_date` in the body, plus optional
 *   `phone`, `end_date`, `remarks`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `201` with the created row, or a `4xx`
 *   error response.
 */
async function addRestricted(req, res) {
  try {
    const { 
      identity_number: identityNumber, 
      name, 
      phone, 
      reason, 
      restriction_type: restrictionType, 
      start_date: startDate, 
      end_date: endDate, 
      remarks 
    } = req.body;

    if (!identityNumber || !name || !reason || !restrictionType || !startDate) {
      return res.status(400).json({
        error: 'Identity number, name, reason, restriction type, and start date are required',
      });
    }

    if (!['Temporary', 'Permanent'].includes(restrictionType)) {
      return res.status(400).json({ error: 'Invalid restriction type' });
    }

    if (restrictionType === 'Temporary' && !endDate) {
      return res.status(400).json({ error: 'End date is required for temporary restrictions' });
    }

    const existing = await RestrictedVisitor.findByIdentity(identityNumber);
    if (existing && existing.is_active) {
      return res.status(409).json({ error: 'This person is already restricted' });
    }

    const restricted = await RestrictedVisitor.create({
      /* eslint-disable camelcase */
      identity_number: identityNumber,
      name,
      phone,
      reason,
      restriction_type: restrictionType,
      start_date: startDate,
      end_date: endDate || null,
      added_by: userId, // TEMPORARY: was req.user.id
      remarks,
      /* eslint-enable camelcase */
    });

    // TEMPORARY: AuditLog not implemented yet — uncomment once merged.
    // await AuditLog.log(
    //   userId, // TEMPORARY: was req.user.id
    //   'ADD_RESTRICTED',
    //   `Added ${name} (${identity_number}) to restricted list - ${reason}`,
    //   req
    // );

    res.status(201).json(restricted);
  } catch (error) {
    console.error('Add restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/restricted
 * List restricted visitors with optional status filter, search, and
 * pagination.
 *
 * @param {import('express').Request} req - Query params: `status`
 *   (`'active'`|`'inactive'`), `search`, `limit`, `offset`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with an array of rows.
 */
async function getRestricted(req, res) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const results = await RestrictedVisitor.findAll({
      status,
      search,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json(results);
  } catch (error) {
    console.error('Get restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/restricted/:id
 * Fetch a single restricted-visitor record by id.
 *
 * @param {import('express').Request} req - `req.params.id`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with the row, or `404` if not found.
 */
async function getRestrictedById(req, res) {
  try {
    const { id } = req.params;
    const restricted = await RestrictedVisitor.findById(id);
    if (!restricted) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }
    res.json(restricted);
  } catch (error) {
    console.error('Get restricted by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/restricted/:id
 * Partially update a restricted-visitor record.
 *
 * @param {import('express').Request} req - `req.params.id`, `req.body`
 *   with any subset of updatable fields.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with the updated row, or `404` if
 *   the id doesn't exist.
 */
async function updateRestricted(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await RestrictedVisitor.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }

    const updated = await RestrictedVisitor.update(id, data);
    // TEMPORARY: AuditLog not implemented yet — uncomment once merged.
    // await AuditLog.log(
    //   userId, // TEMPORARY: was req.user.id
    //   'UPDATE_RESTRICTED',
    //   `Updated restricted visitor ${existing.identity_number}`,
    //   req
    // );
    res.json(updated);
  } catch (error) {
    console.error('Update restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/restricted/:id
 * Soft-remove a restricted visitor (deactivate rather than delete, per
 * FR-7.6 audit history requirements).
 *
 * @param {import('express').Request} req - `req.params.id`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with a confirmation message, or
 *   `404` if the id doesn't exist.
 */
async function removeRestricted(req, res) {
  try {
    const { id } = req.params;
    const existing = await RestrictedVisitor.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }
    await RestrictedVisitor.deactivate(id);
    // TEMPORARY: AuditLog not implemented yet — uncomment once merged.
    // await AuditLog.log(
    //   userId, // TEMPORARY: was req.user.id
    //   'REMOVE_RESTRICTED',
    //   `Removed ${existing.name} (${existing.identity_number}) from restricted list`,
    //   req
    // );
    res.json({ message: 'Restricted visitor removed successfully' });
  } catch (error) {
    console.error('Remove restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/restricted/check/:identity_number
 * Check whether a person is currently restricted (FR-7.3). Called by
 * Register Visitor / Campus Entry & Exit before granting access — this
 * endpoint does not itself block anything, it only reports status.
 *
 * @param {import('express').Request} req - `req.params.identity_number`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with `{ restricted: false }` or
 *   `{ restricted: true, reason, restriction_type, name, start_date, end_date }`.
 */
async function checkRestricted(req, res) {
  try {
    const { identity_number } = req.params;
    if (!identity_number) {
      return res.status(400).json({ error: 'Identity number is required' });
    }
    const restricted = await RestrictedVisitor.checkActive(identity_number);
    if (restricted) {
      res.json({
        restricted: true,
        reason: restricted.reason,
        restriction_type: restricted.restriction_type,
        name: restricted.name,
        start_date: restricted.start_date,
        end_date: restricted.end_date,
      });
    } else {
      res.json({ restricted: false });
    }
  } catch (error) {
    console.error('Check restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/restricted/exception
 * Create an exceptional-entry request against a restricted visitor
 * (FR-7.4). New requests start in `'Pending'` status.
 *
 * @param {import('express').Request} req - Expects `restricted_visitor_id`,
 *   `request_date_time`, `purpose`, `host_authority` in the body.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `201` with the created exception request,
 *   or a `4xx` error.
 */
async function createException(req, res) {
  try {
    const { restricted_visitor_id, request_date_time, purpose, host_authority } = req.body;

    if (!restricted_visitor_id || !request_date_time || !purpose || !host_authority) {
      return res.status(400).json({
        error: 'Restricted visitor ID, date/time, purpose, and host authority are required',
      });
    }

    const restricted = await RestrictedVisitor.findById(restricted_visitor_id);
    if (!restricted) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }

    const exception = await ExceptionRequest.create({
      restricted_visitor_id,
      requested_by: userId, // TEMPORARY: was req.user.id
      request_date_time,
      purpose,
      host_authority,
    });

    // TEMPORARY: AuditLog not implemented yet — uncomment once merged.
    // await AuditLog.log(
    //   userId, // TEMPORARY: was req.user.id
    //   'EXCEPTION_REQUEST',
    //   `Exception request created for ${restricted.name} (${restricted.identity_number})`,
    //   req
    // );

    res.status(201).json(exception);
  } catch (error) {
    console.error('Create exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/restricted/exception/pending
 * List all exception requests awaiting review (FR-7.5), oldest first.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with an array of pending requests.
 */
async function getPendingExceptions(req, res) {
  try {
    const exceptions = await ExceptionRequest.getPending();
    res.json(exceptions);
  } catch (error) {
    console.error('Get pending exceptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/restricted/exception/:id
 * Approve or reject a pending exception request (FR-7.5). Only requests
 * currently `'Pending'` may be updated.
 *
 * @param {import('express').Request} req - `req.params.id`; body: `status`
 *   (`'Approved'`|`'Rejected'`), optional `rejection_reason`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} Sends `200` with the updated request, or a
 *   `4xx` error if the status is invalid, the request doesn't exist, or
 *   it was already processed.
 */
async function updateException(req, res) {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const exception = await ExceptionRequest.findById(id);
    if (!exception) {
      return res.status(404).json({ error: 'Exception request not found' });
    }
    if (exception.status !== 'Pending') {
      return res.status(400).json({ error: 'Exception request is already processed' });
    }

    const updated = await ExceptionRequest.updateStatus(
      id,
      status,
      userId, // TEMPORARY: was req.user.id
      rejection_reason || null
    );

    // TEMPORARY: AuditLog not implemented yet — uncomment once merged.
    // await AuditLog.log(
    //   userId, // TEMPORARY: was req.user.id
    //   'EXCEPTION_' + status.toUpperCase(),
    //   `Exception request for ${exception.restricted_name} ${status}`,
    //   req
    // );

    res.json(updated);
  } catch (error) {
    console.error('Update exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  addRestricted,
  getRestricted,
  getRestrictedById,
  updateRestricted,
  removeRestricted,
  checkRestricted,
  createException,
  getPendingExceptions,
  updateException,
};