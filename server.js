require("dotenv").config();

const express = require("express");
const path = require("path");
const { initDb } = require("./db");
const protocolExecutionRoutes = require("./routes/protocolExecutions");

const app = express();
const PORT = process.env.PORT || 4001;

// ─── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── In-memory webhook event log (for the test UI) ─────
const webhookEvents = [];

// ─── API Routes ─────────────────────────────────────────
app.use("/api/v1/protocol-executions", protocolExecutionRoutes);

// ─── Built-in Webhook Receiver (for testing) ────────────
app.post("/webhook-receiver", (req, res) => {
  const event = {
    receivedAt: new Date().toISOString(),
    ...req.body,
  };
  webhookEvents.push(event);
  console.log("📩 Webhook received:", JSON.stringify(event, null, 2));
  res.status(200).json({ received: true });
});

// ─── Webhook Events Feed (polled by the test UI) ────────
app.get("/webhook-events", (req, res) => {
  res.json(webhookEvents);
});

// ─── Start Server ───────────────────────────────────────
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📄 Test UI at    http://localhost:${PORT}/index.html`);
      console.log(
        `📡 API endpoint  POST http://localhost:${PORT}/api/v1/protocol-executions\n`,
      );
    });
  } catch (err) {
    console.error("💥 Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
