const { query } = require('../config/database');

/**
 * GuardAvailability model.
 * Tracks whether a guard is available (or on leave) on a given date.
 */
class GuardAvailability {
  /**
   * Create or update a guard's availability for a date.
   * If a record already exists for the guard/date pair, it is updated in place;
   * otherwise a new record is inserted.
   *
   * @param {Object} data - Availability data.
   * @param {number|string} data.guard_id - Guard ID.
   * @param {string} data.date - Date (YYYY-MM-DD).
   * @param {boolean} data.is_available - Whether the guard is available.
   * @param {string} [data.reason] - Optional reason for unavailability.
   * @param {string} [data.notes] - Optional notes.
   * @returns {Promise<Object>} The created or updated availability record.
   */
  static async create(data) {
    const existing = await this.findByGuardAndDate(data.guard_id, data.date);
    if (existing) {
      const sql = `
        UPDATE guard_availability 
        SET is_available = ?, reason = ?, notes = ?
        WHERE guard_id = ? AND date = ?
      `;
      await query(sql, [data.is_available, data.reason, data.notes, data.guard_id, data.date]);
      return this.findByGuardAndDate(data.guard_id, data.date);
    }
    const sql = `
      INSERT INTO guard_availability (guard_id, date, is_available, reason, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.guard_id,
      data.date,
      data.is_available,
      data.reason || null,
      data.notes || null,
    ]);
    return this.findById(result.insertId);
  }

  /**
   * Find an availability record by ID.
   *
   * @param {number|string} id - Availability record ID.
   * @returns {Promise<Object|null>} The record, or null if not found.
   */
  static async findById(id) {
    const sql = 'SELECT * FROM guard_availability WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Find an availability record for a specific guard and date.
   *
   * @param {number|string} guardId - Guard ID.
   * @param {string} date - Date (YYYY-MM-DD).
   * @returns {Promise<Object|null>} The record, or null if not found.
   */
  static async findByGuardAndDate(guardId, date) {
    const sql = 'SELECT * FROM guard_availability WHERE guard_id = ? AND date = ?';
    const rows = await query(sql, [guardId, date]);
    return rows[0] || null;
  }

  /**
   * Determine whether a guard is available on a given date.
   * A guard with no availability record is assumed to be available.
   *
   * @param {number|string} guardId - Guard ID.
   * @param {string} date - Date (YYYY-MM-DD).
   * @returns {Promise<boolean>} True if the guard is available.
   */
  static async isAvailable(guardId, date) {
    const record = await this.findByGuardAndDate(guardId, date);
    if (!record) return true;
    return record.is_available === 1;
  }

  /**
   * Get a guard's availability records within a date range.
   *
   * @param {number|string} guardId - Guard ID.
   * @param {string} dateFrom - Inclusive start date (YYYY-MM-DD).
   * @param {string} dateTo - Inclusive end date (YYYY-MM-DD).
   * @returns {Promise<Array<Object>>} List of availability records in the range.
   */
  static async getRange(guardId, dateFrom, dateTo) {
    const sql = `
      SELECT * FROM guard_availability 
      WHERE guard_id = ? AND date BETWEEN ? AND ?
      ORDER BY date
    `;
    return query(sql, [guardId, dateFrom, dateTo]);
  }
}

module.exports = GuardAvailability;
