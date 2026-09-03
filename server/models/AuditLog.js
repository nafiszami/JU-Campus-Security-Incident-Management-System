const { query } = require('../config/database');

/**
 * AuditLog model for recording and retrieving audit events.
 */
class AuditLog {
  /**
   * Create an audit log entry.
   *
   * @param {Object} data - Audit log data.
   * @param {number} data.user_id - ID of the user.
   * @param {string} data.action - Action performed.
   * @param {string} [data.description] - Description of the action.
   * @param {string} [data.ip_address] - Client IP address.
   * @param {string} [data.user_agent] - Client user agent.
   * @returns {Promise<Object|null>} Created audit log entry.
   */
  static async create(data) {
    const sql = `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      data.user_id,
      data.action,
      data.description || null,
      data.ip_address || null,
      data.user_agent || null,
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Find an audit log entry by ID.
   *
   * @param {number} id - Audit log ID.
   * @returns {Promise<Object|null>} Audit log entry or null.
   */
  static async findById(id) {
    const sql = `
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `;

    const rows = await query(sql, [id]);

    return rows[0] || null;
  }

  /**
   * Find audit log entries using optional filters.
   *
   * @param {Object} [filters={}] - Filtering options.
   * @returns {Promise<Array>} Matching audit log entries.
   */
  static async findAll(filters = {}) {
    let sql = `
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;

    const conditions = [];
    const params = [];

    if (filters.user_id) {
      conditions.push('a.user_id = ?');
      params.push(filters.user_id);
    }

    if (filters.action) {
      conditions.push('a.action = ?');
      params.push(filters.action);
    }

    if (filters.date_from) {
      conditions.push('DATE(a.created_at) >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('DATE(a.created_at) <= ?');
      params.push(filters.date_to);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY a.created_at DESC';

    return query(sql, params);
  }

  /**
   * Record an audit log entry with optional request information.
   *
   * @param {number} userId - ID of the user.
   * @param {string} action - Action performed.
   * @param {string} description - Description of the action.
   * @param {Object|null} [req=null] - Express request object.
   * @returns {Promise<Object|null>} Created audit log entry.
   */
  static async log(userId, action, description, req = null) {
    return this.create({
      user_id: userId,
      action,
      description,
      ip_address: req
        ? req.ip || req.connection.remoteAddress
        : null,
      user_agent: req ? req.headers['user-agent'] : null,
    });
  }
}

/**
 * Records an audit log entry using the legacy interface.
 *
 * This keeps compatibility with existing features that use
 * recordAuditEntry().
 *
 * @param {number} userId - ID of the user.
 * @param {string} action - Action performed.
 * @param {string} description - Description of the action.
 * @returns {Promise<number>} ID of the newly created audit log entry.
 */
async function recordAuditEntry(userId, action, description) {
  const result = await query(
    'INSERT INTO audit_logs (user_id, action, description) VALUES (?, ?, ?)',
    [userId, action, description],
  );

  return result.insertId;
}

/**
 * Finds audit history entries related to a specific report.
 *
 * @param {string} reportId - Report ID to search for.
 * @returns {Promise<Array>} Audit history entries related to the report.
 */
async function findAuditHistoryForReport(reportId) {
  const sql = `
    SELECT a.*, u.name AS user_name, u.email AS user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.description LIKE ?
    ORDER BY a.created_at ASC
  `;

  return query(sql, [`%${reportId}%`]);
}

module.exports = AuditLog;
module.exports.AuditLog = AuditLog;
module.exports.recordAuditEntry = recordAuditEntry;
module.exports.findAuditHistoryForReport = findAuditHistoryForReport;