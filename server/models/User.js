const { query } = require('../config/database');

class User {
  static async create(data) {
    const sql = `
      INSERT INTO users (name, email, password_hash, role, phone, assigned_gate)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      data.name,
      data.email,
      data.password_hash,
      data.role,
      data.phone || null,
      data.assigned_gate || null,
    ]);
    return this.findById(result.insertId);
  }

  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const rows = await query(sql, [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const sql = 'SELECT id, name, email, role, phone, assigned_gate, is_active, created_at FROM users WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  static async findAll(filters = {}) {
    let sql = 'SELECT id, name, email, role, phone, assigned_gate, is_active, created_at FROM users';
    const conditions = [];
    const params = [];

    if (filters.role) { conditions.push('role = ?'); params.push(filters.role); }
    if (filters.is_active !== undefined) { conditions.push('is_active = ?'); params.push(filters.is_active); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    return query(sql, params);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.assigned_gate !== undefined) { fields.push('assigned_gate = ?'); values.push(data.assigned_gate); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    if (fields.length === 0) return null;
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(id);
  }

  static async updatePassword(id, passwordHash) {
    const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
    await query(sql, [passwordHash, id]);
    return true;
  }
}

module.exports = User;