const { query } = require('../config/database');

/**
 * Checkpoint model.
 * Represents a physical security checkpoint that guards can be assigned to.
 */
class Checkpoint {
  /**
   * Create a new checkpoint.
   *
   * @param {Object} data - Checkpoint data.
   * @param {string} data.name - Checkpoint name.
   * @param {string} data.location - Checkpoint location.
   * @param {string} [data.description] - Optional checkpoint description.
   * @returns {Promise<Object>} The newly created checkpoint record.
   */
  static async create(data) {
    const sql = 'INSERT INTO checkpoints (name, location, description) VALUES (?, ?, ?)';
    const result = await query(sql, [data.name, data.location, data.description || null]);
    return this.findById(result.insertId);
  }

  /**
   * Find a checkpoint by its ID.
   *
   * @param {number|string} id - Checkpoint ID.
   * @returns {Promise<Object|null>} The checkpoint record, or null if not found.
   */
  static async findById(id) {
    const sql = 'SELECT * FROM checkpoints WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Find all active checkpoints, ordered by name.
   *
   * @returns {Promise<Array<Object>>} List of active checkpoints.
   */
  static async findAllActive() {
    const sql = 'SELECT * FROM checkpoints WHERE is_active = TRUE ORDER BY name';
    return query(sql);
  }

  /**
   * Find all checkpoints (active and inactive), ordered by name.
   *
   * @returns {Promise<Array<Object>>} List of all checkpoints.
   */
  static async findAll() {
    const sql = 'SELECT * FROM checkpoints ORDER BY name';
    return query(sql);
  }

  /**
   * Update an existing checkpoint. Only provided fields are updated.
   *
   * @param {number|string} id - Checkpoint ID.
   * @param {Object} data - Fields to update.
   * @param {string} [data.name] - Updated name.
   * @param {string} [data.location] - Updated location.
   * @param {string} [data.description] - Updated description.
   * @param {boolean} [data.is_active] - Updated active status.
   * @returns {Promise<Object|null>} The updated checkpoint, or null if there was nothing to update.
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.location !== undefined) {
      fields.push('location = ?');
      values.push(data.location);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (fields.length === 0) return null;
    values.push(id);
    const sql = `UPDATE checkpoints SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(id);
  }

  /**
   * Soft-delete a checkpoint by marking it inactive.
   *
   * @param {number|string} id - Checkpoint ID.
   * @returns {Promise<boolean>} True if a row was affected, false otherwise.
   */
  static async delete(id) {
    const sql = 'UPDATE checkpoints SET is_active = FALSE WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Checkpoint;
