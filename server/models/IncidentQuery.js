const { query } = require('../config/database');

const ACTIVE_ASSIGNMENT_STATUSES = ['Assigned', 'Under Investigation'];

/**
 * Retrieves a specific incident with reporter and assigned officer details.
 *
 * @param {number} id - ID of the incident.
 * @returns {Promise<Object|null>} Incident details or null if not found.
 */
async function findIncidentById(id) {
  const rows = await query(
    `SELECT i.*,
            reporter.name AS reporter_name,
            officer.name AS assigned_officer_name
     FROM incidents i
     LEFT JOIN users reporter ON reporter.id = i.reported_by
     LEFT JOIN users officer ON officer.id = i.assigned_to
     WHERE i.id = ?`,
    [id],
  );

  return rows[0] || null;
}

/**
 * Retrieves incidents for the Head Security Officer.
 *
 * @param {string|null} status - Optional incident status filter.
 * @returns {Promise<Array>} List of incidents.
 */
async function findIncidents(status = null) {
  const where = status ? 'WHERE i.status = ?' : '';
  const params = status ? [status] : [];

  return query(
    `SELECT i.*,
            reporter.name AS reporter_name,
            officer.name AS assigned_officer_name
     FROM incidents i
     LEFT JOIN users reporter ON reporter.id = i.reported_by
     LEFT JOIN users officer ON officer.id = i.assigned_to
     ${where}
     ORDER BY i.created_at DESC`,
    params,
  );
}

/**
 * Retrieves incidents assigned to a specific Security Officer.
 *
 * @param {number} officerId - ID of the Security Officer.
 * @returns {Promise<Array>} Incidents assigned to the officer.
 */
async function findIncidentsAssignedTo(officerId) {
  return query(
    `SELECT i.*,
            reporter.name AS reporter_name,
            officer.name AS assigned_officer_name
     FROM incidents i
     LEFT JOIN users reporter ON reporter.id = i.reported_by
     LEFT JOIN users officer ON officer.id = i.assigned_to
     WHERE i.assigned_to = ?
     ORDER BY i.updated_at DESC`,
    [officerId],
  );
}

/**
 * Finds an active incident assigned to a Security Officer.
 *
 * @param {number} officerId - ID of the Security Officer.
 * @param {number|null} excludeIncidentId - Optional incident ID to exclude.
 * @returns {Promise<Object|null>} Active incident or null if none exists.
 */
async function findActiveIncidentForOfficer(
  officerId,
  excludeIncidentId = null,
) {
  const placeholders = ACTIVE_ASSIGNMENT_STATUSES.map(() => '?').join(', ');
  const params = [officerId, ...ACTIVE_ASSIGNMENT_STATUSES];

  let sql = `SELECT id, report_id, status
             FROM incidents
             WHERE assigned_to = ?
             AND status IN (${placeholders})`;

  if (excludeIncidentId) {
    sql += ' AND id <> ?';
    params.push(excludeIncidentId);
  }

  const rows = await query(sql, params);

  return rows[0] || null;
}

/**
 * Assigns an incident to a Security Officer.
 *
 * @param {number} id - ID of the incident.
 * @param {number} officerId - ID of the Security Officer.
 * @returns {Promise<Object|null>} Updated incident.
 */
async function assignIncidentToOfficer(id, officerId) {
  await query(
    `UPDATE incidents
     SET assigned_to = ?, assigned_at = NOW(), status = 'Assigned'
     WHERE id = ?`,
    [officerId, id],
  );

  return findIncidentById(id);
}

/**
 * Records a new incident assignment in the assignment history.
 *
 * @param {Object} assignmentData - Assignment information.
 * @param {number} assignmentData.incidentId - ID of the incident being assigned.
 * @param {number|null} assignmentData.assignedFrom - ID of the previously assigned
 * security officer, or null if this is the first assignment.
 * @param {number} assignmentData.assignedTo - ID of the security officer receiving
 * the assignment.
 * @param {number} assignmentData.assignedBy - ID of the user performing the assignment.
 * @param {string|null} assignmentData.reason - Optional reason for the assignment.
 * @returns {Promise<number>} The ID of the newly created assignment history record.
 */
async function recordAssignment({
  incidentId,
  assignedFrom,
  assignedTo,
  assignedBy,
  reason,
}) {
  const result = await query(
    `INSERT INTO assignment_history
     (incident_id, assigned_from, assigned_to, assigned_by, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [
      incidentId,
      assignedFrom || null,
      assignedTo,
      assignedBy,
      reason || null,
    ],
  );

  return result.insertId;
}

/**
 * Retrieves the complete assignment history for an incident.
 *
 * The result includes the names of the previous assignee,
 * current assignee, and user who performed each assignment.
 *
 * @param {number} incidentId - ID of the incident.
 * @returns {Promise<Array>} Assignment history records for the incident.
 */
async function findAssignmentHistoryForIncident(incidentId) {
  return query(
    `SELECT h.*,
            from_user.name AS assigned_from_name,
            to_user.name AS assigned_to_name,
            by_user.name AS assigned_by_name
     FROM assignment_history h
     LEFT JOIN users from_user ON from_user.id = h.assigned_from
     LEFT JOIN users to_user ON to_user.id = h.assigned_to
     LEFT JOIN users by_user ON by_user.id = h.assigned_by
     WHERE h.incident_id = ?
     ORDER BY h.created_at DESC`,
    [incidentId],
  );
}



// Sprint 2 
// ===============================================


/**
 * Updates the status and related tracking fields of an incident.
 *
 * Used for Sprint 2 investigation status changes and closure. Fields
 * left undefined or false are not touched, so callers only need to
 * pass whatever this particular transition actually affects.
 *
 * @param {number} id - ID of the incident.
 * @param {Object} updates - Fields to update.
 * @param {string} updates.status - New status value.
 * @param {string} [updates.investigationSummary] - Investigation findings,
 * recorded when moving a report to Resolved.
 * @param {boolean} [updates.markResolvedNow] - Whether to stamp resolved_at with the current time.
 * @param {boolean} [updates.markClosedNow] - Whether to stamp closed_at with the current time.
 * @returns {Promise<Object|null>} Updated incident.
 */
async function updateIncidentStatusFields(id, {
  status,
  investigationSummary,
  markResolvedNow,
  markClosedNow,
}) {
  const fields = ['status = ?'];
  const values = [status];

  if (investigationSummary !== undefined) {
    fields.push('investigation_notes = ?');
    values.push(investigationSummary);
  }
  if (markResolvedNow) {
    fields.push('resolved_at = NOW()');
  }
  if (markClosedNow) {
    fields.push('closed_at = NOW()');
  }

  values.push(id);

  await query(
    `UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  return findIncidentById(id);
}

module.exports = {
  findIncidentById,
  findIncidents,
  findIncidentsAssignedTo,
  findActiveIncidentForOfficer,
  assignIncidentToOfficer,
  recordAssignment,
  findAssignmentHistoryForIncident,
  updateIncidentStatusFields,
};