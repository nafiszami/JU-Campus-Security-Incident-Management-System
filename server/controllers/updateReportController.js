const {
  findIncidentById,
  updateIncidentStatusFields,
} = require('../models/IncidentQuery');

const { recordAuditEntry } = require('../models/AuditLog');

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

module.exports = {
  updateInvestigationStatus,
};