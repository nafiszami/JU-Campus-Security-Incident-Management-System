const { query } = require('../config/database');

/**
 * Records an audit log entry for a user action.
 *
 * @param {number} userId - ID of the user who performed the action.
 * @param {string} action - Name or type of the action performed.
 * @param {string} description - Description of the action.
 * @returns {Promise<number>} The ID of the newly created audit log entry.
 */
async function recordAuditEntry(userId, action, description) {
  const result = await query(
    'INSERT INTO audit_logs (user_id, action, description) VALUES (?, ?, ?)',
    [userId, action, description],
  );

  return result.insertId;
}

module.exports = { recordAuditEntry };