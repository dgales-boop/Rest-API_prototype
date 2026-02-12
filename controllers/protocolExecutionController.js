const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const ProtocolExecution = require("../models/protocolExecution");

// Shared secret for HMAC-SHA256 webhook signing
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "whsec_proto_default";

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 * The receiving system can verify authenticity using the same secret.
 */
function signPayload(payload) {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Send a signed webhook POST to the given URL.
 */
async function sendWebhook(url, payload) {
  const signature = signPayload(payload);

  console.log(`🔔 Sending webhook to ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": `sha256=${signature}`,
    },
    body: JSON.stringify(payload),
  });

  console.log(`✅ Webhook delivered — status ${response.status}`);
}

/**
 * POST /api/v1/protocol-executions
 *
 * Creates a protocol execution, then simulates the full status lifecycle:
 *   initialized → in_progress (2s) → completed (5s)
 * Each transition fires a signed webhook to the provided URL.
 */
async function createExecution(req, res) {
  const { protocolId, siteId, webhookUrl } = req.body;
  const tenantId = req.tenantId;

  // --- Validate required fields ---
  if (!protocolId || !siteId) {
    return res.status(400).json({
      error: "Missing required fields: protocolId, siteId",
    });
  }

  try {
    const id = uuidv4();

    // Insert with status "initialized"
    const execution = await ProtocolExecution.create({
      id,
      protocolId,
      siteId,
      tenantId,
    });

    // Respond immediately with 201
    res.status(201).json({
      executionId: execution.id,
      status: execution.status,
      tenantId: execution.tenant_id,
      createdAt: execution.created_at,
    });

    // --- Simulate status lifecycle ---
    if (webhookUrl) {
      // Step 1: initialized → in_progress (after 2 seconds)
      setTimeout(async () => {
        try {
          const updated = await ProtocolExecution.updateStatus(
            id,
            "in_progress",
          );
          await sendWebhook(webhookUrl, {
            executionId: updated.id,
            status: updated.status,
            tenantId: updated.tenant_id,
            updatedAt: updated.updated_at,
          });
        } catch (err) {
          console.error("❌ Webhook (in_progress) failed:", err.message);
        }
      }, 2000);

      // Step 2: in_progress → completed (after 5 seconds)
      setTimeout(async () => {
        try {
          const updated = await ProtocolExecution.updateStatus(id, "completed");
          await sendWebhook(webhookUrl, {
            executionId: updated.id,
            status: updated.status,
            tenantId: updated.tenant_id,
            completedAt: updated.updated_at,
          });
        } catch (err) {
          console.error("❌ Webhook (completed) failed:", err.message);
        }
      }, 5000);
    }
  } catch (err) {
    console.error("❌ Failed to create execution:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { createExecution };
