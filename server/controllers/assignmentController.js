const {
  findIncidentById,
  findActiveIncidentForOfficer,
  findIncidents,
  findIncidentsAssignedTo,
  assignIncidentToOfficer,
  recordAssignment,
  findAssignmentHistoryForIncident,
} = require('../models/IncidentQuery');

const {
  findUserById,
  findActiveSecurityOfficers,
} = require('../models/User');

const { recordAuditEntry } = require('../models/AuditLog');

/**
 * Retrieves incidents available to the logged-in Security Officer.
 *
 * Head Security Officers can view all incidents, while other
 * Security Officers can only view incidents assigned to them.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing incidents.
 */
async function listIncidents(req, res) {
  try {
    if (!req.user.is_head_security_officer) {
      return res.json(await findIncidentsAssignedTo(req.user.id));
    }

    return res.json(await findIncidents(req.query.status));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * Retrieves detailed information about a specific incident.
 *
 * Head Security Officers can view any incident, while other
 * Security Officers can only view incidents assigned to them.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing incident details.
 */
async function getIncidentDetails(req, res) {
  try {
    const incident = await findIncidentById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        error: 'Incident not found',
      });
    }

    if (
      !req.user.is_head_security_officer
      && incident.assigned_to !== req.user.id
    ) {
      return res.status(403).json({
        error: 'You can only view reports assigned to you.',
      });
    }

    return res.json(incident);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * Retrieves active Security Officers and their assignment availability.
 *
 * An officer is considered unavailable if they already have
 * an active incident assigned to them.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing Security Officers.
 */
async function getAssignableOfficers(req, res) {
  try {
    const officers = await findActiveSecurityOfficers();

    const result = await Promise.all(
      officers.map(async (officer) => {
        const active = await findActiveIncidentForOfficer(officer.id);

        return {
          ...officer,
          available: !active,
          availabilityMessage: active
            ? `Already assigned to ${active.report_id}`
            : 'Available',
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * Assigns or reassigns an incident report to a Security Officer.
 *
 * The Head Security Officer is authorized to perform assignment
 * and reassignment through the route-level authorization middleware.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing the updated incident.
 */
async function assignReport(req, res) {
  try {
    const { id } = req.params;
    const { officerId, reason } = req.body;
    const incident = await findIncidentById(id);

    if (!incident) {
      return res.status(404).json({
        error: 'Incident not found',
      });
    }

    if (!officerId) {
      return res.status(400).json({
        error: 'Please select a Security Officer.',
      });
    }

    if (incident.status === 'Closed') {
      return res.status(400).json({
        error: 'Closed reports cannot be assigned or reassigned.',
      });
    }

    const officer = await findUserById(officerId);

    if (
      !officer
      || officer.role !== 'Security Officer'
      || !officer.is_active
    ) {
      return res.status(400).json({
        error: 'Selected user is not an active Security Officer.',
      });
    }

    const previousOfficerId = incident.assigned_to || null;
    const isReassignment = Boolean(previousOfficerId);

    if (isReassignment && !String(reason || '').trim()) {
      return res.status(400).json({
        error: 'A reason is required when reassigning a report.',
      });
    }

    if (previousOfficerId === Number(officerId)) {
      return res.status(400).json({
        error: 'This report is already assigned to that officer.',
      });
    }

    const active = await findActiveIncidentForOfficer(officerId, id);

    if (active) {
      return res.status(409).json({
        error: `${officer.name} is already assigned to ${active.report_id}.`,
      });
    }

    const updated = await assignIncidentToOfficer(id, officerId);

    await recordAssignment({
      incidentId: id,
      assignedFrom: previousOfficerId,
      assignedTo: officerId,
      assignedBy: req.user.id,
      reason,
    });

    await recordAuditEntry(
      req.user.id,
      isReassignment ? 'REASSIGN_REPORT' : 'ASSIGN_REPORT',
      `${isReassignment ? 'Reassigned' : 'Assigned'} `
        + `${incident.report_id} to ${officer.name}`,
    );

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * Retrieves the assignment history for a specific incident.
 *
 * Head Security Officers can view any assignment history, while
 * other Security Officers can only view history for their assigned reports.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing the report and history.
 */
async function getAssignmentHistory(req, res) {
  try {
    const incident = await findIncidentById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        error: 'Incident not found',
      });
    }

    if (
      !req.user.is_head_security_officer
      && incident.assigned_to !== req.user.id
    ) {
      return res.status(403).json({
        error: 'You can only view history for your assigned reports.',
      });
    }

    return res.json({
      report: incident,
      history: await findAssignmentHistoryForIncident(req.params.id),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

module.exports = {
  listIncidents,
  getIncidentDetails,
  getAssignableOfficers,
  assignReport,
  getAssignmentHistory,
};