/**
 * @module models/ExceptionRequest
 * @description Data-access layer for the `restriction_exceptions` table.
 * Implements FR-7.4 and FR-7.5 (Requesting and Approving/Rejecting
 * Exceptional Entry Permission, SRS 3.1.7). All methods talk to MySQL
 * through the shared `query` helper from `../config/database`.
 */

const { query } = require('../config/database');

/**
 * @class ExceptionRequest
 * @classdesc Static data-access methods for exceptional-entry requests
 * raised against a restricted visitor. Never instantiated — called
 * directly on the class (e.g. `ExceptionRequest.create(...)`).
 */
class ExceptionRequest {
  /**
   * Create a new exception request for a restricted visitor. New requests
   * always start in the `'Pending'` status (set by the database's column
   * default — this method does not set it explicitly).
   *
   * @param {Object} data - Exception request details.
   * @param {number} data.restricted_visitor_id - `restricted_visitors.id` the
   *   exception is being requested for.
   * @param {number} data.requested_by - `users.id` of the Gate Operator (or
   *   Security Officer/Admin) submitting the request.
   * @param {string} data.request_date_time - Requested date/time of entry
   *   (datetime string, e.g. `'2026-08-30 14:00:00'`).
   * @param {string} data.purpose - Purpose of the visit.
   * @param {string} data.host_authority - Hosting authority approving/sponsoring the visit.
   * @returns {Promise<Object>} The newly created exception-request row
   *   (see {@link ExceptionRequest.findById} for the joined shape).
   */
  static async create(data) {
    const sql = `
      INSERT INTO restriction_exceptions (
        restricted_visitor_id, requested_by, request_date_time,
        purpose, host_authority
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.restricted_visitor_id,
      data.requested_by,
      data.request_date_time,
      data.purpose,
      data.host_authority,
    ]);
    return this.findById(result.insertId);
  }

  /**
   * Fetch a single exception request by its primary key, joined with the
   * restricted visitor's name/identity number and the names of the
   * requesting and approving users.
   *
   * @param {number} id - `restriction_exceptions.id`.
   * @returns {Promise<Object|null>} The matching row (with `restricted_name`,
   *   `identity_number`, `requested_by_name`, `approved_by_name`), or `null`
   *   if no row exists with that id.
   */
  static async findById(id) {
    const sql = `
      SELECT e.*, 
             r.name as restricted_name, r.identity_number,
             u1.name as requested_by_name,
             u2.name as approved_by_name
      FROM restriction_exceptions e
      LEFT JOIN restricted_visitors r ON e.restricted_visitor_id = r.id
      LEFT JOIN users u1 ON e.requested_by = u1.id
      LEFT JOIN users u2 ON e.approved_by = u2.id
      WHERE e.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * List all exception requests currently awaiting Proctor/Security Officer
   * review, oldest first (FIFO review order).
   *
   * @returns {Promise<Object[]>} Rows with `status = 'Pending'`, each including
   *   `restricted_name`, `identity_number`, and `requested_by_name`.
   */
  static async getPending() {
    const sql = `
      SELECT e.*, 
             r.name as restricted_name, r.identity_number,
             u.name as requested_by_name
      FROM restriction_exceptions e
      LEFT JOIN restricted_visitors r ON e.restricted_visitor_id = r.id
      LEFT JOIN users u ON e.requested_by = u.id
      WHERE e.status = 'Pending'
      ORDER BY e.created_at ASC
    `;
    return query(sql);
  }

  /**
   * Approve or reject a pending exception request. Sets `approved_at` to
   * the current server time regardless of whether the outcome is approval
   * or rejection.
   *
   * @param {number} id - `restriction_exceptions.id` to update.
   * @param {('Approved'|'Rejected')} status - Outcome of the review.
   * @param {number} approvedBy - `users.id` of the Proctor/Security Officer
   *   who made the decision.
   * @param {string|null} [rejectionReason=null] - Reason for rejection;
   *   should be provided when `status === 'Rejected'`, otherwise `null`.
   * @returns {Promise<Object>} The updated exception-request row.
   */
  static async updateStatus(id, status, approvedBy, rejectionReason = null) {
    const sql = `
      UPDATE restriction_exceptions 
      SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?
      WHERE id = ?
    `;
    await query(sql, [status, approvedBy, rejectionReason, id]);
    return this.findById(id);
  }
}

module.exports = ExceptionRequest;