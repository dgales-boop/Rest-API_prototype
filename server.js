require("dotenv").config();

const express = require("express");
const path = require("path");

// ─── Repository & Controller (Dependency Injection) ─────
const PostgresExecutionProtocolRepository = require("./repository/postgresExecutionProtocolRepository");
const ExecutionProtocolController = require("./controllers/executionProtocolController");
const createExecutionProtocolRoutes = require("./routes/executionProtocols");

// ─── Application Setup ──────────────────────────────────
const app = express();
const PORT = process.env.PORT || 4001;

// ─── Middleware ─────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Dependency Injection: Wire up Repository → Controller → Routes ───
// Current:  PostgreSQL with seeded test data
// Future:   ReportheldAdapterRepository (when Reportheld API is available)
const repository = new PostgresExecutionProtocolRepository();
console.log("📊 Using PostgreSQL repository (database-backed)");

const controller = new ExecutionProtocolController(repository);
const executionProtocolRoutes = createExecutionProtocolRoutes(controller);

// ─── API Routes ─────────────────────────────────────────

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Execution Protocol Integration API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Execution protocol endpoints (read-only)
app.use("/api/v1/execution-protocols", executionProtocolRoutes);

// ─── Start Server ───────────────────────────────────────
async function start() {
  try {
    app.listen(PORT, () => {
      console.log(`\n🚀 Execution Protocol Integration API`);
      console.log(`📡 Server running at http://localhost:${PORT}`);
      console.log(
        `✅ Health check:     GET http://localhost:${PORT}/api/v1/health`,
      );
      console.log(
        `📋 List protocols:   GET http://localhost:${PORT}/api/v1/execution-protocols?updatedAfter=<ISO>&limit=50&offset=0`,
      );
      console.log(
        `📄 Get protocol:     GET http://localhost:${PORT}/api/v1/execution-protocols/:id`,
      );
      console.log(
        `📊 Get snapshot:     GET http://localhost:${PORT}/api/v1/execution-protocols/:id/snapshot`,
      );
      console.log(`\n🔐 All endpoints require X-API-Key header\n`);
    });
  } catch (err) {
    console.error("💥 Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
