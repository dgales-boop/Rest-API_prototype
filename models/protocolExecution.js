const { pool } = require("../db");

/**
 * Insert a new protocol execution record.
 */
async function create({ id, protocolId, siteId, tenantId }) {
  const result = await pool.query(
    `INSERT INTO protocol_executions (id, protocol_id, site_id, tenant_id, status)
     VALUES ($1, $2, $3, $4, 'initialized')
     RETURNING *`,
    [id, protocolId, siteId, tenantId],
  );
  return result.rows[0];
}

/**
 * Update the status of an existing protocol execution.
 */
async function updateStatus(id, status) {
  const result = await pool.query(
    `UPDATE protocol_executions
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id],
  );
  return result.rows[0];
}

module.exports = { create, updateStatus };
