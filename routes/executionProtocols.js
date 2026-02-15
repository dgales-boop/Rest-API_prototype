const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * ExecutionProtocol Routes
 *
 * Defines READ-ONLY GET endpoints for execution protocol snapshots.
 * This is a contract-first integration API - no mutations allowed.
 *
 * All endpoints require API key authentication for tenant isolation.
 *
 * The controller is injected as a dependency, enabling different
 * implementations to be used without changing the route definitions.
 *
 * @param {ExecutionProtocolController} controller - Controller instance
 * @returns {express.Router} Express router with configured routes
 */
module.exports = function createExecutionProtocolRoutes(controller) {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // GET /api/v1/execution-protocols
  // Polling endpoint - returns minimal metadata for CLOSED protocols
  // Supports ?updatedAfter=<ISO timestamp>&limit=<number>&offset=<number>
  router.get("/", controller.getAllForPolling);

  // GET /api/v1/execution-protocols/:id
  // Retrieve a specific execution protocol by ID
  router.get("/:id", controller.getById);

  // GET /api/v1/execution-protocols/:id/snapshot
  // Retrieve the full JSONB snapshot for a specific execution protocol
  router.get("/:id/snapshot", controller.getSnapshotById);

  return router;
};
