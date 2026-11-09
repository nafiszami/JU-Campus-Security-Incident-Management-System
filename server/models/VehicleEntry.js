const { query } = require('../config/database');

/**
 * VehicleEntry model for database operations.
 * Handles all vehicle registration, exit processing, restriction checks,
 * and movement history querying.
 */
class VehicleEntry {
  /**
   * Generates a unique vehicle pass number.
   * Format: VP-YYYY-XXXX (e.g. VP-2026-4821)
   *
   * @returns {string} Unique pass number.
   */
  static generatePassNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `VP-${year}-${random}`;
  }

  /**
   * Create a new vehicle entry record.
   *
   * @param {Object} data - Vehicle entry data.
   * @param {string} [data.pass_number] - Optional pre-generated pass number.
   * @param {string} data.plate_number - Vehicle registration plate number.
   * @param {string} data.vehicle_type - Vehicle type ('Car', 'Motorcycle', etc.).
   * @param {string} data.category - Entrant category ('Student', 'Visitor', etc.).
   * @param {string} data.driver_name - Driver full name.
   * @param {string} data.driver_phone - Driver contact number.
   * @param {string} [data.driver_identity] - Driver NID or institutional ID.
   * @param {string} [data.purpose] - Purpose of visit.
   * @param {string} [data.host_or_destination] - Destination or host building.
   * @param {string} data.entry_gate - Name of entry gate.
   * @param {number} data.entered_by - User ID of gate operator.
   * @param {string} [data.pass_valid_until] - Pass expiration date/time.
   * @param {boolean} [data.is_emergency] - Emergency vehicle flag.
   * @param {string} [data.remarks] - Additional notes.
   * @returns {Promise<Object>} Created vehicle entry object.
   */
  static async create(data) {
    const passNumber = data.pass_number || this.generatePassNumber();
    const sql = `
      INSERT INTO vehicle_entries (
        pass_number, plate_number, vehicle_type, category,
        driver_name, driver_phone, driver_identity, purpose,
        host_or_destination, status, entry_time, entry_gate,
        entered_by, pass_valid_until, is_emergency, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inside', NOW(), ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      passNumber,
      data.plate_number.trim().toUpperCase(),
      data.vehicle_type || 'Car',
      data.category || 'Visitor',
      data.driver_name,
      data.driver_phone,
      data.driver_identity || null,
      data.purpose || null,
      data.host_or_destination || null,
      data.entry_gate || 'Main Gate',
      data.entered_by,
      data.pass_valid_until || null,
      Boolean(data.is_emergency),
      data.remarks || null,
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Find vehicle entry record by database ID.
   *
   * @param {number} id - Database entry ID.
   * @returns {Promise<Object|null>} Vehicle entry object or null.
   */
  static async findById(id) {
    const sql = `
      SELECT v.*,
             u.name AS entered_by_name,
             x.name AS exited_by_name
      FROM vehicle_entries v
      LEFT JOIN users u ON v.entered_by = u.id
      LEFT JOIN users x ON v.exited_by = x.id
      WHERE v.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Find vehicle entry record by pass number.
   *
   * @param {string} passNumber - Vehicle pass number (e.g. VP-2026-001).
   * @returns {Promise<Object|null>} Vehicle entry object or null.
   */
  static async findByPassNumber(passNumber) {
    const sql = `
      SELECT v.*, u.name AS entered_by_name
      FROM vehicle_entries v
      LEFT JOIN users u ON v.entered_by = u.id
      WHERE v.pass_number = ?
    `;
    const rows = await query(sql, [passNumber]);
    return rows[0] || null;
  }

  /**
   * Find currently active vehicle entry by plate number.
   *
   * @param {string} plateNumber - Vehicle registration number.
   * @returns {Promise<Object|null>} Active vehicle record or null.
   */
  static async findActiveByPlate(plateNumber) {
    const sql = `
      SELECT * FROM vehicle_entries
      WHERE plate_number = ? AND status = 'Inside'
      LIMIT 1
    `;
    const rows = await query(sql, [plateNumber.trim().toUpperCase()]);
    return rows[0] || null;
  }

  /**
   * Get all vehicles currently inside the campus.
   *
   * @returns {Promise<Array>} List of currently inside vehicles.
   */
  static async getActive() {
    const sql = `
      SELECT v.*, u.name AS entered_by_name
      FROM vehicle_entries v
      LEFT JOIN users u ON v.entered_by = u.id
      WHERE v.status = 'Inside'
      ORDER BY v.entry_time DESC
    `;
    return query(sql);
  }

  /**
   * Process vehicle departure and calculate duration.
   *
   * @param {number} id - Vehicle database ID.
   * @param {string} exitGate - Gate through which vehicle exits.
   * @param {number} operatorId - ID of operator recording the exit.
   * @param {string} [remarks] - Optional departure notes.
   * @returns {Promise<Object|null>} Updated vehicle entry or null if not found.
   */
  static async processExit(id, exitGate, operatorId, remarks = null) {
    const sql = `
      UPDATE vehicle_entries
      SET status = 'Exited',
          exit_time = NOW(),
          exit_gate = ?,
          exited_by = ?,
          duration_minutes = TIMESTAMPDIFF(MINUTE, entry_time, NOW()),
          remarks = COALESCE(?, remarks)
      WHERE id = ? AND status = 'Inside'
    `;

    const result = await query(sql, [exitGate, operatorId, remarks, id]);
    if (result.affectedRows === 0) {
      return null;
    }
    return this.findById(id);
  }

  /**
   * Get vehicle entry and exit history with optional filtering.
   *
   * @param {Object} [filters={}] - Filter criteria.
   * @param {string} [filters.date_from] - Filter from start date (YYYY-MM-DD).
   * @param {string} [filters.date_to] - Filter to end date (YYYY-MM-DD).
   * @param {string} [filters.category] - Filter by entrant category.
   * @param {string} [filters.vehicle_type] - Filter by vehicle type.
   * @param {string} [filters.status] - Filter by status ('Inside' or 'Exited').
   * @param {string} [filters.search] - Search plate, driver name, or phone.
   * @returns {Promise<Array>} List of vehicle movement records.
   */
  static async getHistory(filters = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (filters.date_from) {
      conditions.push('DATE(v.entry_time) >= ?');
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('DATE(v.entry_time) <= ?');
      params.push(filters.date_to);
    }
    if (filters.category) {
      conditions.push('v.category = ?');
      params.push(filters.category);
    }
    if (filters.vehicle_type) {
      conditions.push('v.vehicle_type = ?');
      params.push(filters.vehicle_type);
    }
    if (filters.status) {
      conditions.push('v.status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(
        '(v.plate_number LIKE ? OR v.driver_name LIKE ? OR v.driver_phone LIKE ? OR v.pass_number LIKE ?)'
      );
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    const sql = `
      SELECT v.*,
             u.name AS entered_by_name,
             x.name AS exited_by_name
      FROM vehicle_entries v
      LEFT JOIN users u ON v.entered_by = u.id
      LEFT JOIN users x ON v.exited_by = x.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.entry_time DESC
      LIMIT 100
    `;

    return query(sql, params);
  }

  /**
   * Check if a vehicle registration plate is blacklisted or restricted.
   *
   * @param {string} plateNumber - Vehicle registration number.
   * @returns {Promise<Object|null>} Restricted vehicle record or null.
   */
  static async checkRestricted(plateNumber) {
    const sql = `
      SELECT r.*, u.name AS added_by_name
      FROM restricted_vehicles r
      LEFT JOIN users u ON r.added_by = u.id
      WHERE r.plate_number = ? AND r.is_active = TRUE
      LIMIT 1
    `;
    const rows = await query(sql, [plateNumber.trim().toUpperCase()]);
    return rows[0] || null;
  }

  /**
   * Add a vehicle to the restricted/blacklisted vehicle list.
   *
   * @param {Object} data - Restricted vehicle information.
   * @param {string} data.plate_number - Vehicle plate number.
   * @param {string} data.reason - Reason for restriction.
   * @param {string} [data.restriction_type] - 'Temporary' or 'Permanent'.
   * @param {number} data.added_by - User ID of security officer/admin.
   * @returns {Promise<Object>} Created restricted vehicle record.
   */
  static async addRestricted(data) {
    const sql = `
      INSERT INTO restricted_vehicles (plate_number, reason, restriction_type, added_by, is_active)
      VALUES (?, ?, ?, ?, TRUE)
    `;
    const result = await query(sql, [
      data.plate_number.trim().toUpperCase(),
      data.reason,
      data.restriction_type || 'Permanent',
      data.added_by,
    ]);

    const rows = await query('SELECT * FROM restricted_vehicles WHERE id = ?', [result.insertId]);
    return rows[0];
  }

  /**
   * Get vehicle entry and exit summary metrics.
   *
   * @returns {Promise<Object>} Statistics counts.
   */
  static async getStats() {
    const sql = `
      SELECT
        COUNT(*) AS total_entries,
        SUM(CASE WHEN status = 'Inside' THEN 1 ELSE 0 END) AS currently_inside,
        SUM(CASE WHEN DATE(entry_time) = CURDATE() THEN 1 ELSE 0 END) AS today_entries,
        SUM(CASE WHEN DATE(exit_time) = CURDATE() THEN 1 ELSE 0 END) AS today_exits,
        SUM(CASE WHEN is_emergency = 1 THEN 1 ELSE 0 END) AS emergency_entries
      FROM vehicle_entries
    `;
    const rows = await query(sql);
    return rows[0] || {};
  }
}

module.exports = VehicleEntry;
