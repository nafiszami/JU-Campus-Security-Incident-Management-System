/**
 * @module models/RestrictedVisitor
 * @description Data-access layer for the `restricted_visitors` table.
 * Implements FR-7.1, FR-7.2, and the read side of FR-7.3 (Restricted Visitor
 * Management, SRS 3.1.7). All methods talk to MySQL through the shared
 * `query` helper from `../config/database` and return plain row objects
 * (or `null` when nothing is found) — no ORM layer is used.
 */

const { query } = require('../config/database');

/**
 * @class RestrictedVisitor
 * @classdesc Static data-access methods for restricted visitors. This class
 * is never instantiated — every method is called directly on the class
 * (e.g. `RestrictedVisitor.create(...)`).
 */
class RestrictedVisitor {
  /**
   * Insert a new restricted-visitor record.
   *
   * @param {Object} data - Restriction details.
   * @param {string} data.identity_number - National ID or Student ID of the restricted person.
   * @param {string} data.name - Full name of the restricted person.
   * @param {string} [data.phone] - Contact phone number, if available.
   * @param {string} data.reason - Reason for the restriction.
   * @param {('Temporary'|'Permanent')} data.restriction_type - Type of restriction.
   * @param {string} data.start_date - Restriction start date (YYYY-MM-DD).
   * @param {string} [data.end_date] - Restriction end date (YYYY-MM-DD); required by the
   *   controller when `restriction_type` is `'Temporary'`.
   * @param {number} data.added_by - `users.id` of the Security Officer/Admin who added this entry.
   * @param {string} [data.remarks] - Additional free-text remarks.
   * @returns {Promise<Object>} The newly created restricted-visitor row, including
   *   the joined `added_by_name` (see {@link RestrictedVisitor.findById}).
   */
  static async create(data) {
    const sql = `
      INSERT INTO restricted_visitors (
        identity_number, name, phone, reason, restriction_type,
        start_date, end_date, added_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.identity_number,
      data.name,
      data.phone || null,
      data.reason,
      data.restriction_type,
      data.start_date,
      data.end_date || null,
      data.added_by,
      data.remarks || null,
    ]);
    return this.findById(result.insertId);
  }

  /**
   * Fetch a single restricted-visitor record by its primary key, joined with
   * the name of the user who added it.
   *
   * @param {number} id - `restricted_visitors.id`.
   * @returns {Promise<Object|null>} The matching row (with `added_by_name`), or
   *   `null` if no row exists with that id.
   */
  static async findById(id) {
    const sql = `
      SELECT r.*, u.name as added_by_name
      FROM restricted_visitors r
      LEFT JOIN users u ON r.added_by = u.id
      WHERE r.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Fetch a restricted-visitor record by identity number, regardless of
   * whether the restriction is currently active. Used by the controller to
   * detect duplicate restriction entries before inserting a new one.
   *
   * @param {string} identityNumber - National ID or Student ID to look up.
   * @returns {Promise<Object|null>} The matching row, or `null` if none exists.
   */
  static async findByIdentity(identityNumber) {
    const sql = 'SELECT * FROM restricted_visitors WHERE identity_number = ?';
    const rows = await query(sql, [identityNumber]);
    return rows[0] || null;
  }

  /**
   * Check whether a person is *currently* restricted: `is_active` is true,
   * the restriction has started (`start_date <= CURDATE()`), and — for
   * temporary restrictions — has not yet ended (`end_date` is null or in
   * the future).
   *
   * This is the method other features depend on: Register Visitor (Feature 5)
   * and Campus Entry & Exit (Feature 6) call this before allowing entry, so
   * its name and return shape must stay stable.
   *
   * @param {string} identityNumber - National ID or Student ID to check.
   * @returns {Promise<Object|null>} The active restriction row if the person
   *   is currently restricted, otherwise `null`.
   */
  static async checkActive(identityNumber) {
    const sql = `
      SELECT * FROM restricted_visitors 
      WHERE identity_number = ? 
        AND is_active = TRUE
        AND start_date <= CURDATE()
        AND (end_date IS NULL OR end_date >= CURDATE())
      LIMIT 1
    `;
    const rows = await query(sql, [identityNumber]);
    return rows[0] || null;
  }

  /**
   * List restricted-visitor records with optional status filtering, keyword
   * search, and pagination. Used by the Security Officer's restricted-list
   * dashboard.
   *
   * @param {Object} [filters={}] - Query options.
   * @param {('active'|'inactive')} [filters.status] - Restrict to currently
   *   active restrictions, or to inactive/expired ones. Omit for all records.
   * @param {string} [filters.search] - Case-insensitive substring match against
   *   `name` or `identity_number`.
   * @param {number} [filters.limit] - Max rows to return (enables pagination
   *   together with `offset`).
   * @param {number} [filters.offset=0] - Row offset when `limit` is set.
   * @returns {Promise<Object[]>} Matching rows, newest first, each including
   *   `added_by_name`.
   */
  static async findAll(filters = {}) {
    let sql = `
      SELECT r.*, u.name as added_by_name
      FROM restricted_visitors r
      LEFT JOIN users u ON r.added_by = u.id
    `;
    const conditions = [];
    const params = [];

    if (filters.status === 'active') {
      conditions.push('r.is_active = TRUE');
      conditions.push('r.start_date <= CURDATE()');
      conditions.push('(r.end_date IS NULL OR r.end_date >= CURDATE())');
    } else if (filters.status === 'inactive') {
      conditions.push('(r.is_active = FALSE OR r.end_date < CURDATE())');
    }

    if (filters.search) {
      conditions.push('(r.name LIKE ? OR r.identity_number LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY r.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    return query(sql, params);
  }

  /**
   * Partially update a restricted-visitor record. Only fields present
   * (not `undefined`) in `data` are updated; omitted fields are left
   * unchanged.
   *
   * @param {number} id - `restricted_visitors.id` to update.
   * @param {Object} data - Fields to update.
   * @param {string} [data.name]
   * @param {string} [data.phone]
   * @param {string} [data.reason]
   * @param {('Temporary'|'Permanent')} [data.restriction_type]
   * @param {string} [data.start_date]
   * @param {string} [data.end_date]
   * @param {boolean} [data.is_active]
   * @param {string} [data.remarks]
   * @returns {Promise<Object|null>} The updated row, or `null` if `data`
   *   contained no updatable fields (no query is run in that case).
   */
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.reason !== undefined) { fields.push('reason = ?'); values.push(data.reason); }
    if (data.restriction_type !== undefined) { fields.push('restriction_type = ?'); values.push(data.restriction_type); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); values.push(data.remarks); }

    if (fields.length === 0) return null;
    values.push(id);
    const sql = `UPDATE restricted_visitors SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(id);
  }

  /**
   * Soft-delete a restriction by flipping `is_active` to `FALSE`, rather
   * than deleting the row. Preserves history for audit purposes (FR-7.6).
   *
   * @param {number} id - `restricted_visitors.id` to deactivate.
   * @returns {Promise<boolean>} `true` if a row was updated, `false` if no
   *   row matched `id`.
   */
  static async deactivate(id) {
    const sql = 'UPDATE restricted_visitors SET is_active = FALSE WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = RestrictedVisitor;