const { query } = require('../config/database');

/**
 * Visitor model for database operations
 * Handles all visitor-related database queries
 */
class Visitor {
  /**
   * Create a new visitor registration
   * @param {Object} data - Visitor data
   * @param {string} data.visitor_id - Generated visitor ID (e.g., V-2025-001)
   * @param {string} data.category - Visitor category (Guardian/Parent, Guest Visitor, etc.)
   * @param {string} data.name - Visitor's full name
   * @param {string} data.identity_number - National ID or equivalent
   * @param {string} data.phone - Contact number
   * @param {string} [data.purpose] - Purpose of visit
   * @param {string} [data.host_name] - Name of host (for one-time visitors)
   * @param {string} [data.host_department] - Department of host
   * @param {string} [data.student_name] - Student name (for Guardian/Parent)
   * @param {string} [data.student_hall] - Student hall (for Guardian/Parent)
   * @param {string} [data.company_name] - Company name (for contractors/vendors)
   * @param {string} [data.project_code] - Project code (for construction workers)
   * @param {string} [data.work_site] - Work site location
   * @param {string} [data.vehicle_plate] - Vehicle registration number
   * @param {string} [data.event_name] - Event name (for event participants)
   * @param {string} [data.event_pass] - Event pass number
   * @param {number} data.registered_by - ID of the gate operator who registered
   * @param {string} data.pass_valid_until - Pass validity date/time
   * @returns {Promise<Object>} Created visitor record
   */
  static async create(data) {
    const sql = `
      INSERT INTO visitors (
        visitor_id, category, name, identity_number, phone, purpose,
        host_name, host_department, student_name, student_hall,
        company_name, project_code, work_site, vehicle_plate,
        event_name, event_pass, registered_by, pass_valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.visitor_id,
      data.category,
      data.name,
      data.identity_number,
      data.phone,
      data.purpose || null,
      data.host_name || null,
      data.host_department || null,
      data.student_name || null,
      data.student_hall || null,
      data.company_name || null,
      data.project_code || null,
      data.work_site || null,
      data.vehicle_plate || null,
      data.event_name || null,
      data.event_pass || null,
      data.registered_by,
      data.pass_valid_until || null,
    ]);
    return this.findById(result.insertId);
  }

  /**
   * Find visitor by database ID
   * @param {number} id - Visitor database ID
   * @returns {Promise<Object|null>} Visitor object or null if not found
   */
  static async findById(id) {
    const sql = `
      SELECT v.*, u.name as registered_by_name
      FROM visitors v
      LEFT JOIN users u ON v.registered_by = u.id
      WHERE v.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Find visitor by Visitor ID
   * @param {string} visitorId - Visitor ID (e.g., V-2025-001)
   * @returns {Promise<Object|null>} Visitor object or null if not found
   */
  static async findByVisitorId(visitorId) {
    const sql = 'SELECT * FROM visitors WHERE visitor_id = ?';
    const rows = await query(sql, [visitorId]);
    return rows[0] || null;
  }

  /**
   * Find visitor by identity number
   * @param {string} identityNumber - National ID or equivalent
   * @returns {Promise<Object|null>} Visitor object or null if not found
   */
  static async findByIdentity(identityNumber) {
    const sql = 'SELECT * FROM visitors WHERE identity_number = ?';
    const rows = await query(sql, [identityNumber]);
    return rows[0] || null;
  }

  /**
   * Search visitors by various fields
   * @param {string} searchTerm - Search query string
   * @returns {Promise<Array>} Array of matching visitors
   */
  static async search(searchTerm) {
    const sql = `
      SELECT id, visitor_id, name, identity_number, phone, category, 
             host_name, status, entry_time, created_at
      FROM visitors
      WHERE visitor_id LIKE ? 
        OR name LIKE ? 
        OR identity_number LIKE ? 
        OR phone LIKE ?
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const param = `%${searchTerm}%`;
    return query(sql, [param, param, param, param]);
  }

  /**
   * Get all visitors currently inside campus
   * @returns {Promise<Array>} Array of active visitors
   */
  static async getActive() {
    const sql = `
      SELECT v.*, u.name as registered_by_name
      FROM visitors v
      LEFT JOIN users u ON v.registered_by = u.id
      WHERE v.status = 'Inside'
      ORDER BY v.entry_time DESC
    `;
    return query(sql);
  }

  /**
   * Get today's visitor history
   * @returns {Promise<Array>} Array of today's visitor records
   */
  static async getTodayHistory() {
    const sql = `
      SELECT v.*, u.name as registered_by_name
      FROM visitors v
      LEFT JOIN users u ON v.registered_by = u.id
      WHERE DATE(v.created_at) = CURDATE()
      ORDER BY v.created_at DESC
    `;
    return query(sql);
  }

  /**
   * Get visitors registered by a specific operator
   * @param {number} operatorId - Gate operator ID
   * @returns {Promise<Array>} Array of visitors registered by the operator
   */
  static async findByOperator(operatorId) {
    const sql = `
      SELECT id, visitor_id, name, identity_number, phone, category,
             host_name, status, entry_time, exit_time, created_at
      FROM visitors
      WHERE registered_by = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return query(sql, [operatorId]);
  }

  /**
   * Find active visitor by identity number
   * @param {string} identityNumber - National ID or equivalent
   * @returns {Promise<Object|null>} Active visitor object or null
   */
  static async findActiveByIdentity(identityNumber) {
    const sql = `
      SELECT * FROM visitors 
      WHERE identity_number = ? 
        AND status IN ('Registered', 'Inside')
      LIMIT 1
    `;
    const rows = await query(sql, [identityNumber]);
    return rows[0] || null;
  }

  /**
   * Get visitor statistics
   * @returns {Promise<Object>} Statistics object with counts
   * @returns {number} total - Total visitors
   * @returns {number} inside - Visitors currently inside
   * @returns {number} today_registered - Registered today
   * @returns {number} today_entries - Entries today
   * @returns {number} today_exits - Exits today
   */
  static async getStats() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Inside' THEN 1 ELSE 0 END) as inside,
        SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'Registered' THEN 1 ELSE 0 END) as today_registered,
        SUM(CASE WHEN DATE(entry_time) = CURDATE() THEN 1 ELSE 0 END) as today_entries,
        SUM(CASE WHEN DATE(exit_time) = CURDATE() THEN 1 ELSE 0 END) as today_exits
      FROM visitors
    `;
    const rows = await query(sql);
    return rows[0] || {};
  }
}

module.exports = Visitor;