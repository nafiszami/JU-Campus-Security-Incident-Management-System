const { query } = require('../config/database');
/**
 * Attendance model for guard check-in/check-out records.
 */
class Attendance {
  /**
   * Find attendance record by schedule ID and date.
   * @param {number} scheduleId - Guard schedule ID.
   * @param {string} date - Date string (YYYY-MM-DD).
   * @returns {Promise<Object|null>} Attendance record or null.
   */
  static async findBySchedule(scheduleId, date) {
    const rows = await query('SELECT * FROM attendance WHERE schedule_id = ? AND date = ?', [
      scheduleId,
      date,
    ]);
    return rows[0] || null;
  }
  /**
   * Find attendance record by ID.
   * @param {number} id - Attendance ID.
   * @returns {Promise<Object|null>} Attendance record with joined guard name.
   */
  static async findById(id) {
    const rows = await query(
      `SELECT a.*, u.name AS guard_name
      FROM attendance a LEFT JOIN users u ON a.guard_id = u.id
      WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }
  /**
   * Create a new attendance record.
   * @param {Object} data - Attendance data.
   * @param {number} data.schedule_id - Schedule ID.
   * @param {number} data.guard_id - Guard user ID.
   * @param {string} data.date - Date (YYYY-MM-DD).
   * @param {string} data.shift - Shift name.
   * @param {string} data.check_in_time - Check-in time (HH:MM:SS).
   * @param {string} data.status - 'Present' or 'Late'.
   * @returns {Promise<Object>} Created record.
   */
  static async create(data) {
    const result = await query(
      `INSERT INTO attendance (schedule_id, guard_id, date, shift, check_in_time, status)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [data.schedule_id, data.guard_id, data.date, data.shift, data.check_in_time, data.status]
    );
    return this.findById(result.insertId);
  }
  /**
   * Record guard check-out time.
   * @param {number} scheduleId - Schedule ID.
   * @param {number} guardId - Guard ID.
   * @param {string} date - Date (YYYY-MM-DD).
   * @param {string} checkOutTime - Check-out time (HH:MM:SS).
   * @returns {Promise<Object|null>} Updated record.
   */
  static async checkOut(scheduleId, guardId, date, checkOutTime) {
    await query(
      'UPDATE attendance SET check_out_time = ? WHERE schedule_id = ? AND guard_id = ? AND date = ?',
      [checkOutTime, scheduleId, guardId, date]
    );
    return this.findBySchedule(scheduleId, date);
  }
  /**
   * Get daily attendance summary counts.
   * @param {string} date - Date (YYYY-MM-DD).
   * @returns {Promise<Object>} Summary with present, late, absent counts.
   */
  static async getDailySummary(date) {
    const rows = await query(
      `SELECT
        COUNT(*) AS total_scheduled,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status = 'Not Checked In' THEN 1 ELSE 0 END) AS not_checked_in
      FROM attendance WHERE date = ?`,
      [date]
    );
    return rows[0] || {};
  }
  /**
   * Get attendance history for a specific guard.
   * @param {number} guardId - Guard user ID.
   * @param {string|null} dateFrom - Start date.
   * @param {string|null} dateTo - End date.
   * @returns {Promise<Array>} Attendance records.
   */
  static async getGuardHistory(guardId, dateFrom = null, dateTo = null) {
    const conditions = ['a.guard_id = ?'];
    const params = [guardId];
    if (dateFrom) {
      conditions.push('a.date >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('a.date <= ?');
      params.push(dateTo);
    }
    return query(
      `SELECT a.*, c.name AS checkpoint_name
      FROM attendance a
      LEFT JOIN guard_schedules s ON a.schedule_id = s.id
      LEFT JOIN checkpoints c ON s.checkpoint_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.date DESC`,
      params
    );
  }
  /**
   * Mark all 'Not Checked In' records as 'Absent' for a given date.
   * Run this after shifts end (cron or manual trigger).
   * @param {string} date - Date (YYYY-MM-DD).
   * @returns {Promise<number>} Number of records updated.
   */
  static async markAbsent(date) {
    const result = await query(
      "UPDATE attendance SET status = 'Absent' WHERE date = ? AND status = 'Not Checked In'",
      [date]
    );
    return result.affectedRows;
  }
}
module.exports = Attendance;
