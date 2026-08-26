const RestrictedVisitor = require('../models/RestrictedVisitor');
const ExceptionRequest = require('../models/ExceptionRequest');

const userId = 1;

async function addRestricted(req, res) {
  try {
    const { identity_number, name, phone, reason, restriction_type, start_date, end_date, remarks } = req.body;

    if (!identity_number || !name || !reason || !restriction_type || !start_date) {
      return res.status(400).json({
        error: 'Identity number, name, reason, restriction type, and start date are required',
      });
    }

    if (!['Temporary', 'Permanent'].includes(restriction_type)) {
      return res.status(400).json({ error: 'Invalid restriction type' });
    }

    if (restriction_type === 'Temporary' && !end_date) {
      return res.status(400).json({ error: 'End date is required for temporary restrictions' });
    }

    const existing = await RestrictedVisitor.findByIdentity(identity_number);
    if (existing && existing.is_active) {
      return res.status(409).json({ error: 'This person is already restricted' });
    }

    const restricted = await RestrictedVisitor.create({
      identity_number,
      name,
      phone,
      reason,
      restriction_type,
      start_date,
      end_date: end_date || null,
      added_by: userId,
      remarks,
    });

    res.status(201).json(restricted);
  } catch (error) {
    console.error('Add restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRestricted(req, res) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const results = await RestrictedVisitor.findAll({
      status,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json(results);
  } catch (error) {
    console.error('Get restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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

async function updateRestricted(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await RestrictedVisitor.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }

    const updated = await RestrictedVisitor.update(id, data);
    res.json(updated);
  } catch (error) {
    console.error('Update restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeRestricted(req, res) {
  try {
    const { id } = req.params;
    const existing = await RestrictedVisitor.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Restricted visitor not found' });
    }
    await RestrictedVisitor.deactivate(id);
    res.json({ message: 'Restricted visitor removed successfully' });
  } catch (error) {
    console.error('Remove restricted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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
      requested_by: userId,
      request_date_time,
      purpose,
      host_authority,
    });

    res.status(201).json(exception);
  } catch (error) {
    console.error('Create exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPendingExceptions(req, res) {
  try {
    const exceptions = await ExceptionRequest.getPending();
    res.json(exceptions);
  } catch (error) {
    console.error('Get pending exceptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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
      userId,
      rejection_reason || null
    );

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