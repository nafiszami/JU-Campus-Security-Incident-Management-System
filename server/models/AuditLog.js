const { query } = require('../config/database');

class AuditLog {
  static async create(data) {
    const sql = `
      INSERT INTO audit_logs (user_id, action, description, ip_address, user_agent)
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

  static async findById(id) {
    const sql = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (filters.user_id) { conditions.push('a.user_id = ?'); params.push(filters.user_id); }
    if (filters.action) { conditions.push('a.action = ?'); params.push(filters.action); }
    if (filters.date_from) { conditions.push('DATE(a.created_at) >= ?'); params.push(filters.date_from); }
    if (filters.date_to) { conditions.push('DATE(a.created_at) <= ?'); params.push(filters.date_to); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY a.created_at DESC';
    return query(sql, params);
  }

  static async log(userId, action, description, req = null) {
    return this.create({
      user_id: userId,
      action,
      description,
      ip_address: req ? req.ip || req.connection.remoteAddress : null,
      user_agent: req ? req.headers['user-agent'] : null,
    });
  }
}

module.exports = AuditLog;