const { isValidUUID } = require("../utils/validation");

/**
 * ExecutionProtocolController
 *
 * Handles HTTP request/response logic for execution protocol endpoints.
 * Depends on ExecutionProtocolRepository abstraction (dependency inversion).
 *
 * This controller is agnostic to the data source implementation.
 * The repository can be swapped (PostgreSQL, Reportheld adapter) without
 * changing any code in this controller.
 */
class ExecutionProtocolController {
  /**
   * @param {ExecutionProtocolRepository} repository - Repository implementation
   */
  constructor(repository) {
    if (!repository) {
      throw new Error("ExecutionProtocolController requires a repository");
    }
    this.repository = repository;
  }

  /**
   * GET /api/v1/execution-protocols
   * Polling endpoint - returns minimal metadata for CLOSED protocols only
   * Supports filtering by updatedAfter and pagination
   */
  getAllForPolling = async (req, res) => {
    try {
      // Tenant isolation - tenantId is set by auth middleware
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Missing tenant context",
        });
      }

      // Parse query parameters
      const { updatedAfter, limit = 50, offset = 0 } = req.query;

      // Validate updatedAfter if provided (ISO 8601 timestamp)
      if (updatedAfter) {
        const timestamp = new Date(updatedAfter);
        if (isNaN(timestamp.getTime())) {
          return res.status(400).json({
            error: "Bad request",
            message:
              "Invalid updatedAfter format. Use ISO 8601 timestamp (e.g., 2026-02-15T10:00:00Z)",
          });
        }
      }

      // Parse and validate pagination params
      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100); // Cap at 100
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      // Fetch protocols with polling filters
      const result = await this.repository.getAllForPolling({
        tenantId,
        updatedAfter,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      // Return minimal metadata only (NOT full snapshots)
      const metadata = result.data.map((p) => p.toListMetadata());

      res.json({
        protocols: metadata,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: result.total,
        },
      });
    } catch (error) {
      console.error("Error fetching execution protocols:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve execution protocols",
      });
    }
  };

  /**
   * GET /api/v1/execution-protocols/:id
   * Retrieve the full snapshot for a specific execution protocol
   * Returns snapshot JSON only if tenant matches and status is CLOSED
   */
  getById = async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      // Validate tenant context
      if (!tenantId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Missing tenant context",
        });
      }

      // Validate UUID format
      if (!isValidUUID(id)) {
        return res.status(404).json({
          error: "Not found",
          message: "Invalid protocol ID format",
        });
      }

      // Retrieve snapshot (includes tenant and CLOSED status checks)
      const snapshot = await this.repository.getSnapshotById(id, tenantId);

      if (!snapshot) {
        return res.status(404).json({
          error: "Not found",
          message: "Execution protocol not found",
        });
      }

      // Return snapshot JSON only (unwrapped)
      res.json(snapshot);
    } catch (error) {
      console.error("Error fetching execution protocol:", error);
      // Don't leak stack traces
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve execution protocol",
      });
    }
  };

  /**
   * GET /api/v1/execution-protocols/:id/snapshot
   * Retrieve the full snapshot for a specific execution protocol
   * (Alternative endpoint - same as /:id)
   */
  getSnapshotById = async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Missing tenant context",
        });
      }

      // Validate UUID format
      if (!isValidUUID(id)) {
        return res.status(404).json({
          error: "Not found",
          message: "Invalid protocol ID format",
        });
      }

      const snapshot = await this.repository.getSnapshotById(id, tenantId);

      if (!snapshot) {
        return res.status(404).json({
          error: "Not found",
          message: "Execution protocol not found",
        });
      }

      // Return snapshot JSON only (unwrapped)
      res.json(snapshot);
    } catch (error) {
      console.error("Error fetching execution protocol snapshot:", error);
      // Don't leak stack traces
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve execution protocol snapshot",
      });
    }
  };
}

module.exports = ExecutionProtocolController;
