const ExecutionProtocolRepository = require("./executionProtocolRepository");
const ExecutionProtocol = require("../domain/executionProtocol");
const { pool } = require("../db");

/**
 * PostgresExecutionProtocolRepository
 *
 * PostgreSQL-backed implementation for the repository interface.
 * Stores snapshots as JSONB for efficient querying.
 *
 * This implementation reads from the execution_protocols table
 * seeded with realistic CLOSED protocol snapshots.
 */
class PostgresExecutionProtocolRepository extends ExecutionProtocolRepository {
  /**
   * Retrieve execution protocols with polling support
   * Filters by tenantId, status=CLOSED, and optional updatedAfter timestamp
   */
  async getAllForPolling({ tenantId, updatedAfter, limit = 50, offset = 0 }) {
    // Cap limit at 100
    const cappedLimit = Math.min(limit, 100);

    // Build query with optional updatedAfter filter
    const params = [tenantId, "CLOSED"];
    let query = `
      SELECT id, site_id, plant_id, tenant_id, status, 
             created_at, closed_at, updated_at
      FROM execution_protocols
      WHERE tenant_id = $1 
        AND status = $2
    `;

    if (updatedAfter) {
      params.push(updatedAfter);
      query += ` AND updated_at > $${params.length}`;
    }

    query += `
      ORDER BY updated_at ASC
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `;
    params.push(cappedLimit, offset);

    // Execute query
    const result = await pool.query(query, params);

    // Get total count
    const countParams = [tenantId, "CLOSED"];
    let countQuery = `
      SELECT COUNT(*) as total
      FROM execution_protocols
      WHERE tenant_id = $1 
        AND status = $2
    `;

    if (updatedAfter) {
      countParams.push(updatedAfter);
      countQuery += ` AND updated_at > $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Map rows to domain objects (without snapshots for performance)
    const protocols = result.rows.map((row) =>
      ExecutionProtocol.fromRepositoryData({
        ...row,
        snapshot: null, // Don't load snapshot for list endpoint
      }),
    );

    return {
      data: protocols,
      total,
    };
  }

  /**
   * Retrieve a single execution protocol by ID (with tenant isolation)
   * Only returns protocols with status=CLOSED
   */
  async getById(id, tenantId) {
    const query = `
      SELECT id, site_id, plant_id, tenant_id, status, 
             snapshot, created_at, closed_at, updated_at
      FROM execution_protocols
      WHERE id = $1 
        AND tenant_id = $2 
        AND status = 'CLOSED'
    `;

    const result = await pool.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return ExecutionProtocol.fromRepositoryData(result.rows[0]);
  }

  /**
   * Retrieve the snapshot for a specific execution protocol
   * Only returns snapshots for protocols with status=CLOSED
   */
  async getSnapshotById(id, tenantId) {
    const query = `
      SELECT snapshot
      FROM execution_protocols
      WHERE id = $1 
        AND tenant_id = $2 
        AND status = 'CLOSED'
    `;

    const result = await pool.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].snapshot;
  }
}

module.exports = PostgresExecutionProtocolRepository;
