/**
 * ExecutionProtocolRepository - Abstract Interface
 *
 * Defines the contract for data access operations.
 * Implementations can be swapped without affecting consumers (controllers).
 *
 * Current implementation:
 * - PostgresExecutionProtocolRepository (database-backed with seeded test data)
 *
 * Future implementation:
 * - ReportheldAdapterRepository (integrates with real Reportheld system)
 */
class ExecutionProtocolRepository {
  /**
   * Retrieve execution protocols with polling support
   * @param {Object} options - Query options
   * @param {string} options.tenantId - Tenant ID for isolation
   * @param {string} [options.updatedAfter] - ISO timestamp filter
   * @param {number} [options.limit] - Page size (max 100)
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<{data: ExecutionProtocol[], total: number}>}
   */
  async getAllForPolling({ tenantId, updatedAfter, limit = 50, offset = 0 }) {
    throw new Error(
      "Method getAllForPolling() must be implemented by subclass",
    );
  }

  /**
   * Retrieve a single execution protocol by ID (with full snapshot)
   * @param {string} id - Protocol execution ID
   * @param {string} tenantId - Tenant ID for isolation
   * @returns {Promise<ExecutionProtocol|null>}
   */
  async getById(id, tenantId) {
    throw new Error("Method getById() must be implemented by subclass");
  }

  /**
   * Retrieve the snapshot for a specific execution protocol
   * @param {string} id - Protocol execution ID
   * @param {string} tenantId - Tenant ID for isolation
   * @returns {Promise<Object|null>}
   */
  async getSnapshotById(id, tenantId) {
    throw new Error("Method getSnapshotById() must be implemented by subclass");
  }
}

module.exports = ExecutionProtocolRepository;
