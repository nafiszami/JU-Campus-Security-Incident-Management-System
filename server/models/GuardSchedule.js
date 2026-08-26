const { query } = require('../config/database');

/**
 * Shift name to start/end time mapping.
 * @type {Object<string, {start: string, end: string}>}
 */
const SHIFTS = {
  Morning: { start: '06:00:00', end: '14:00:00' },
  Day: { start: '14:00:00', end: '22:00:00' },
  Night: { start: '22:00:00', end: '06:00:00' },
};

/**
 * GuardSchedule model.
 * Represents a guard's assignment to a checkpoint for a given date and shift.
 */
class GuardSchedule {
  /**
   * Create a new guard schedule entry.
   *
   * @param {Object} data - Schedule data.
   * @param {number|string} data.guard_id - ID of the assigned guard.
   * @param {number|string} data.checkpoint_id - ID of the checkpoint.
   * @param {string} data.date - Date of the assignment (YYYY-MM-DD).
   * @param {string} data.shift - Shift name ('Morning', 'Day', or 'Night').
   * @param {number|string} data.assigned_by - ID of the user making the assignment.
   * @param {string} [data.notes] - Optional notes.
   * @returns {Promise<Object>} The newly created schedule record.
   */
  static async create(data) {
    const shift = SHIFTS[data.shift];
    const sql = `
      INSERT INTO guard_schedules (
        guard_id, checkpoint_id, date, shift, shift_start, shift_end, assigned_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.guard_id,
      data.checkpoint_id,
      data.date,
      data.shift,
      shift.start,
      shift.end,
      data.assigned_by,
      data.notes || null,
    ]);
    return this.findById(result.insertId);
  }

  /**
   * Find a schedule entry by ID, including joined guard, checkpoint, and
   * assigning-user details.
   *
   * @param {number|string} id - Schedule ID.
   * @returns {Promise<Object|null>} The schedule record, or null if not found.
   */
  static async findById(id) {
    const sql = `
      SELECT s.*, 
             g.name as guard_name, g.phone as guard_phone,
             c.name as checkpoint_name, c.location as checkpoint_location,
             a.name as assigned_by_name
      FROM guard_schedules s
      LEFT JOIN users g ON s.guard_id = g.id
      LEFT JOIN checkpoints c ON s.checkpoint_id = c.id
      LEFT JOIN users a ON s.assigned_by = a.id
      WHERE s.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Check whether a guard already has a schedule conflict for a given date and shift.
   *
   * @param {number|string} guardId - Guard ID.
   * @param {string} date - Date to check (YYYY-MM-DD).
   * @param {string} shift - Shift name.
   * @param {number|string} [excludeId] - Schedule ID to exclude from the check (used on update).
   * @returns {Promise<boolean>} True if a conflicting schedule exists.
   */
  static async checkConflict(guardId, date, shift, excludeId = null) {
    let sql = 'SELECT id FROM guard_schedules WHERE guard_id = ? AND date = ? AND shift = ?';
    const params = [guardId, date, shift];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const rows = await query(sql, params);
    return rows.length > 0;
  }

  /**
   * Find all schedule entries for a given date, including guard and checkpoint details.
   *
   * @param {string} date - Date to look up (YYYY-MM-DD).
   * @returns {Promise<Array<Object>>} List of schedule entries for the date.
   */
  static async findByDate(date) {
    const sql = `
      SELECT s.*, 
             g.name as guard_name,
             c.name as checkpoint_name, c.location as checkpoint_location
      FROM guard_schedules s
      LEFT JOIN users g ON s.guard_id = g.id
      LEFT JOIN checkpoints c ON s.checkpoint_id = c.id
      WHERE s.date = ?
      ORDER BY s.shift, c.name
    `;
    return query(sql, [date]);
  }

  /**
   * Build today's roster: every active checkpoint with coverage details for
   * each shift (whether it's assigned, and to whom).
   *
   * @returns {Promise<Array<Object>>} Roster grouped by checkpoint, with per-shift coverage.
   */
  static async getTodayRoster() {
    const date = new Date().toISOString().split('T')[0];
    const checkpoints = await query('SELECT * FROM checkpoints WHERE is_active = TRUE');
    const schedules = await this.findByDate(date);
    const shifts = ['Morning', 'Day', 'Night'];

    const roster = checkpoints.map((checkpoint) => {
      const coverage = {};
      shifts.forEach((shift) => {
        const assigned = schedules.find(
          (s) => s.checkpoint_id === checkpoint.id && s.shift === shift
        );
        coverage[shift] = {
          assigned: !!assigned,
          guard: assigned ? assigned.guard_name : null,
          guard_id: assigned ? assigned.guard_id : null,
          schedule_id: assigned ? assigned.id : null,
        };
      });
      return {
        checkpoint_id: checkpoint.id,
        checkpoint_name: checkpoint.name,
        location: checkpoint.location,
        coverage,
      };
    });
    return roster;
  }

  /**
   * Find all schedule entries for a given guard, optionally filtered by date range.
   *
   * @param {number|string} guardId - Guard ID.
   * @param {string} [dateFrom] - Inclusive start date (YYYY-MM-DD).
   * @param {string} [dateTo] - Inclusive end date (YYYY-MM-DD).
   * @returns {Promise<Array<Object>>} List of schedule entries for the guard.
   */
  static async findByGuard(guardId, dateFrom = null, dateTo = null) {
    let sql = `
      SELECT s.*, c.name as checkpoint_name, c.location as checkpoint_location
      FROM guard_schedules s
      LEFT JOIN checkpoints c ON s.checkpoint_id = c.id
      WHERE s.guard_id = ?
    `;
    const params = [guardId];
    if (dateFrom) {
      sql += ' AND s.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND s.date <= ?';
      params.push(dateTo);
    }
    sql += ' ORDER BY s.date ASC, s.shift';
    return query(sql, params);
  }

  /**
   * Find all checkpoint/shift combinations that have no guard assigned on a given date.
   *
   * @param {string} date - Date to check (YYYY-MM-DD).
   * @returns {Promise<Array<Object>>} List of unassigned checkpoint/shift slots.
   */
  static async getUnassigned(date) {
    const checkpoints = await query('SELECT * FROM checkpoints WHERE is_active = TRUE');
    const schedules = await this.findByDate(date);
    const shifts = ['Morning', 'Day', 'Night'];

    const unassigned = [];
    checkpoints.forEach((checkpoint) => {
      shifts.forEach((shift) => {
        const assigned = schedules.find(
          (s) => s.checkpoint_id === checkpoint.id && s.shift === shift
        );
        if (!assigned) {
          unassigned.push({
            checkpoint_id: checkpoint.id,
            checkpoint_name: checkpoint.name,
            shift,
            date,
          });
        }
      });
    });
    return unassigned;
  }

  /**
   * Update an existing schedule entry. Only provided fields are updated.
   *
   * @param {number|string} id - Schedule ID.
   * @param {Object} data - Fields to update.
   * @param {number|string} [data.guard_id] - Updated guard ID.
   * @param {number|string} [data.checkpoint_id] - Updated checkpoint ID.
   * @param {string} [data.date] - Updated date (YYYY-MM-DD).
   * @param {string} [data.shift] - Updated shift name.
   * @param {string} [data.notes] - Updated notes.
   * @returns {Promise<Object|null>} The updated schedule, or null if there was nothing to update.
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    if (data.guard_id !== undefined) {
      fields.push('guard_id = ?');
      values.push(data.guard_id);
    }
    if (data.checkpoint_id !== undefined) {
      fields.push('checkpoint_id = ?');
      values.push(data.checkpoint_id);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.shift !== undefined) {
      const shift = SHIFTS[data.shift];
      fields.push('shift = ?, shift_start = ?, shift_end = ?');
      values.push(data.shift, shift.start, shift.end);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (fields.length === 0) return null;
    values.push(id);
    const sql = `UPDATE guard_schedules SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(id);
  }

  /**
   * Delete a schedule entry.
   *
   * @param {number|string} id - Schedule ID.
   * @returns {Promise<boolean>} True if a row was affected, false otherwise.
   */
  static async delete(id) {
    const sql = 'DELETE FROM guard_schedules WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = GuardSchedule;
