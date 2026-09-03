const {
  findIncidentById,
  updateIncidentStatusFields,
  findAssignmentHistoryForIncident,
} = require('../models/IncidentQuery');

const { recordAuditEntry, findAuditHistoryForReport } = require('../models/AuditLog');

/**
 * Maps each status to the single status it is allowed to move to
 * through the investigation status endpoint. Closing is handled by
 * its own endpoint and is intentionally not reachable from here.
 */
const VALID_NEXT_STATUS = {
  Assigned: 'Under Investigation',
  'Under Investigation': 'Resolved',
};

/**
 * Checks whether the logged-in user is the Security Officer currently
 * assigned to an incident.
 *
 * @param {Object} incident - The incident being checked.
 * @param {Object} user - The authenticated user making the request.
 * @returns {boolean} True if the user is the assigned officer.
 */
function isAssignedOfficer(incident, user) {
  return user.role === 'Security Officer' && incident.assigned_to === user.id;
}

/**
 * Updates an incident's investigation status.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing the updated incident.
 */
async function updateInvestigationStatus(req, res) {
  const { id } = req.params;
  const { status: nextStatus, investigationSummary } = req.body;
  const incident = await findIncidentById(id);

 if (!isAssignedOfficer(incident, req.user)) {
    return res.status(403).json({
      error: 'Only the assigned Security Officer can update this report.',
    });
  }

  if (incident.status === 'Closed') {
    return res.status(400).json({
      error: 'This report is closed and cannot be modified.',
    });
  }

  if (!nextStatus || VALID_NEXT_STATUS[incident.status] !== nextStatus) {
    return res.status(400).json({
      error: `Cannot change status from ${incident.status} to ${nextStatus || 'the requested value'}.`,
    });
  }

  if (nextStatus === 'Resolved' && !String(investigationSummary || '').trim()) {
    return res.status(400).json({
      error: 'Investigation findings are required to mark this report as Resolved.',
    });
  }

  const updated = await updateIncidentStatusFields(id, {
    status: nextStatus,
    investigationSummary: nextStatus === 'Resolved' ? investigationSummary : undefined,
    markResolvedNow: nextStatus === 'Resolved',
  });

  await recordAuditEntry(
    req.user.id,
    'UPDATE_STATUS',
    `Status changed for ${incident.report_id}: ${incident.status} -> ${nextStatus}`,
  );

  return res.json(updated);
}

/**
 * Closes a Resolved incident report.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing the updated incident.
 */
async function closeReport(req, res) {
  const { id } = req.params;
  const incident = await findIncidentById(id);

  if (req.user.role !== 'Security Officer' || !req.user.is_head_security_officer) {
    return res.status(403).json({
      error: 'Only the Head Security Officer can close this report.',
    });
  }

  if (incident.status === 'Closed') {
    return res.status(400).json({
      error: 'This report is already closed.',
    });
  }

  if (incident.status !== 'Resolved') {
    return res.status(400).json({
      error: 'A report can only be closed after it has been marked Resolved.',
    });
  }

  const updated = await updateIncidentStatusFields(id, {
    status: 'Closed',
    markClosedNow: true,
  });

  await recordAuditEntry(
    req.user.id,
    'CLOSE_REPORT',
    `Closed report ${incident.report_id}`,
  );

  return res.json(updated);
}

/**
 * Retrieves a report along with its assignment history and status
 * history, for review before closure.
 *
 * The Security Officer currently assigned to the report can review
 * it, and a Head Security Officer can review any report.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response containing the report and its history.
 */
async function getReportForReview(req, res) {
  const incident = await findIncidentById(req.params.id);

  const canView = req.user.is_head_security_officer
    || isAssignedOfficer(incident, req.user);

  if (!canView) {
    return res.status(403).json({
      error: 'You can only review reports assigned to you.',
    });
  }

  const [assignmentHistory, statusHistory] = await Promise.all([
    findAssignmentHistoryForIncident(req.params.id),
    findAuditHistoryForReport(incident.report_id),
  ]);

  return res.json({
    report: incident,
    assignmentHistory,
    statusHistory,
  });
}

module.exports = {
  updateInvestigationStatus,
  closeReport,
  getReportForReview,
};