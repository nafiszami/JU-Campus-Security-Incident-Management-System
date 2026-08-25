const { query } = require('../config/database');

class Visitor {
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

  static async findByVisitorId(visitorId) {
    const sql = 'SELECT * FROM visitors WHERE visitor_id = ?';
    const rows = await query(sql, [visitorId]);
    return rows[0] || null;
  }

  static async findByIdentity(identityNumber) {
    const sql = 'SELECT * FROM visitors WHERE identity_number = ?';
    const rows = await query(sql, [identityNumber]);
    return rows[0] || null;
  }

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



module.exports = Visitor;