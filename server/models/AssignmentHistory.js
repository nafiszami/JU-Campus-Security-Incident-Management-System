const { query } = require('../config/database');

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

module.exports = {
  recordAssignment,
  findAssignmentHistoryForIncident,
};