const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createExecution,
} = require("../controllers/protocolExecutionController");

// POST /api/v1/protocol-executions
router.post("/", authMiddleware, createExecution);

module.exports = router;
