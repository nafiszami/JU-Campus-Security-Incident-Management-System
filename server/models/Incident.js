const { query } = require('../config/database');

/**
 * Valid report type values matching the database ENUM constraint.
 * @readonly
 * @enum {string}
 */
const REPORT_TYPES = [
  'Theft',
  'Harassment',
  'Suspicious Activity',
  'Vandalism',
  'Accident',
  'Gate Violation',
  'Unauthorized Entry',
  'Investigation Report',
];

/**
 * Valid priority level values matching the database ENUM constraint.
 * @readonly
 * @enum {string}
 */
const PRIORITIES = ['High', 'Medium', 'Low'];

/**
 * Valid incident status values matching the database ENUM constraint.
 * @readonly
 * @enum {string}
 */
const STATUSES = [
  'Submitted',
  'Assigned',
  'Under Investigation',
  'Resolved',
  'Closed',
  'Revision Required',
  'Deleted',
];

/**
 * @typedef {Object} IncidentData
 * @property {number} reportedBy - User ID of the reporter (FK to users.id).
 * @property {string} reportType - Type of incident report.
 * @property {string} title - Short title describing the incident.
 * @property {string} description - Detailed description of the incident.
 * @property {string} location - Location where the incident occurred.
 * @property {string} priority - Priority level of the report.
 * @property {string} [evidencePath] - Optional file path for uploaded evidence.
 */

/**
 * @typedef {Object} IncidentRecord
 * @property {number} id - Auto-increment primary key.
 * @property {string} report_id - Unique human-readable report identifier.
 * @property {number} reported_by - User ID of the reporter.
 * @property {string} report_type - Type of incident report.
 * @property {string} title - Short title describing the incident.
 * @property {string} description - Detailed description of the incident.
 * @property {string} location - Location where the incident occurred.
 * @property {string} priority - Priority level.
 * @property {string} status - Current status of the incident.
 * @property {string|null} evidence_path - File path for uploaded evidence.
 * @property {number|null} assigned_to - User ID of the assigned officer.
 * @property {Date|null} assigned_at - Timestamp of assignment.
 * @property {string|null} investigation_notes - Notes from investigation.
 * @property {Date|null} resolved_at - Timestamp of resolution.
 * @property {Date|null} closed_at - Timestamp of closure.
 * @property {Date} created_at - Record creation timestamp.
 * @property {Date} updated_at - Record last-update timestamp.
 */

/**
 * @typedef {Object} IncidentFilterOptions
 * @property {string} [status] - Filter by incident status.
 * @property {string} [priority] - Filter by priority level.
 * @property {string} [reportType] - Filter by report type.
 * @property {number} [reportedBy] - Filter by reporter user ID.
 * @property {number} [page=1] - Page number for pagination.
 * @property {number} [limit=20] - Number of records per page.
 */

const Incident = {
  /**
   * Generate a unique report ID in the format "RPT-YYYYMMDD-XXXX".
   *
   * Queries the database for the latest report ID created today and
   * increments the sequence number. Falls back to "0001" if none exist.
   *
   * @returns {Promise<string>} The generated report ID.
   */
  async generateReportId() {
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    const prefix = `RPT-${dateStr}-`;

    const rows = await query(
      `SELECT report_id FROM incidents
       WHERE report_id LIKE ?
       ORDER BY report_id DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastSequence = parseInt(rows[0].report_id.split('-').pop(), 10);
      if (!Number.isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  },

  /**
   * Create a new incident report.
   *
   * Generates a unique report ID, inserts the record with status "Submitted",
   * and returns the full incident record.
   *
   * @param {IncidentData} data - The incident report data.
   * @returns {Promise<IncidentRecord>} The newly created incident record.
   * @throws {Error} If required fields are missing or values are invalid.
   */
  async create(data) {
    const { reportedBy, reportType, title, description, location, priority, evidencePath } = data;

    // Validate required fields
    if (!reportedBy || !reportType || !title || !description || !location || !priority) {
      throw new Error(
        'Missing required fields: reportedBy, reportType, title, description, location, and priority are required.'
      );
    }

    if (!REPORT_TYPES.includes(reportType)) {
      throw new Error(`Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`);
    }

    if (!PRIORITIES.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${PRIORITIES.join(', ')}`);
    }

    const reportId = await this.generateReportId();

    await query(
      `INSERT INTO incidents (report_id, reported_by, report_type, title, description, location, priority, status, evidence_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)`,
      [
        reportId,
        reportedBy,
        reportType,
        title,
        description,
        location,
        priority,
        evidencePath || null,
      ]
    );

    const created = await this.findByReportId(reportId);
    return created;
  },

  /**
   * Find an incident by its primary key.
   *
   * @param {number} id - The incident primary key.
   * @returns {Promise<IncidentRecord|null>} The incident record or null if not found.
   */
  async findById(id) {
    const rows = await query('SELECT * FROM incidents WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find an incident by its human-readable report ID.
   *
   * @param {string} reportId - The report ID (e.g., "RPT-20260825-0001").
   * @returns {Promise<IncidentRecord|null>} The incident record or null if not found.
   */
  async findByReportId(reportId) {
    const rows = await query('SELECT * FROM incidents WHERE report_id = ?', [reportId]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find all incidents reported by a specific user.
   *
   * @param {number} userId - The reporter's user ID.
   * @returns {Promise<IncidentRecord[]>} Array of incident records.
   */
  async findByReporter(userId) {
    const rows = await query(
      'SELECT * FROM incidents WHERE reported_by = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  /**
   * Retrieve incidents with optional filtering and pagination.
   *
   * Supports filtering by status, priority, report type, and reporter.
   * Results are ordered by creation date (newest first).
   *
   * @param {IncidentFilterOptions} [options={}] - Filter and pagination options.
   * @returns {Promise<{data: IncidentRecord[], total: number, page: number, limit: number}>}
   *   Paginated result with total count.
   */
  async findAll(options = {}) {
    const { status, priority, reportType, reportedBy, page = 1, limit = 20 } = options;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (reportType) {
      conditions.push('report_type = ?');
      params.push(reportType);
    }

    if (reportedBy) {
      conditions.push('reported_by = ?');
      params.push(reportedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await query(`SELECT COUNT(*) AS total FROM incidents ${whereClause}`, params);
    const { total } = countRows[0];

    const offset = (page - 1) * limit;
    const dataRows = await query(
      `SELECT * FROM incidents ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: dataRows,
      total,
      page,
      limit,
    };
  },
};

module.exports = {
  Incident,
  REPORT_TYPES,
  PRIORITIES,
  STATUSES,
};
