# Protocol Execution REST API

A minimal, self-hosted REST API prototype that simulates protocol execution with API key authentication, PostgreSQL persistence, and webhook-based status updates.

## Architecture

```text
Client (HTML / curl / n8n)
  │
  ▼
Express Server (port 4001)
  ├── POST /api/v1/protocol-executions   ← API key auth → DB insert
  ├── POST /webhook-receiver             ← receives simulated webhooks
  └── GET  /webhook-events               ← feeds webhook log to UI
  │
  ▼
PostgreSQL (Docker, port 5432)
```

## Prerequisites

- **Node.js** 18+
- **Docker Desktop** — must be installed and **running**

## Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
```

### 2. Start PostgreSQL

```bash
docker compose -f data/docker-compose.yml up -d
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

You should see:

```text
✅ Database initialized — protocol_executions table ready
🚀 Server running at http://localhost:4001
```

### 5. Test It

**Option A — Browser UI:** Open [http://localhost:4001](http://localhost:4001) and click "Execute Protocol".

**Option B — curl:**

```bash
curl -X POST http://localhost:4001/api/v1/protocol-executions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rh_test_alpha_92f4c1" \
  -d "{\"protocolId\":\"safety-check-v1\",\"siteId\":\"site-001\",\"webhookUrl\":\"http://localhost:4001/webhook-receiver\"}"
```

Expected response (HTTP 201):

```json
{
  "executionId": "uuid-here",
  "status": "initialized",
  "tenantId": "tenant-alpha",
  "createdAt": "2026-02-13T..."
}
```

After the request, the server simulates:

- **2 seconds** → status changes to `in_progress` (webhook sent)
- **5 seconds** → status changes to `completed` (webhook sent)

Each webhook includes an `X-Webhook-Signature` header (HMAC-SHA256).

## API Keys

| Key                    | Tenant       |
| ---------------------- | ------------ |
| `rh_test_alpha_92f4c1` | tenant-alpha |
| `rh_test_beta_7d3e8a`  | tenant-beta  |

## Project Structure

```text
REST_API/
├── data/
│   └── docker-compose.yml          # PostgreSQL container
├── public/
│   └── index.html                  # Test UI
├── controllers/
│   └── protocolExecutionController.js
├── middleware/
│   └── authMiddleware.js           # X-API-Key validation
├── models/
│   └── protocolExecution.js        # SQL queries
├── routes/
│   └── protocolExecutions.js       # Route definitions
├── docs/
│   ├── DECISIONS.txt               # Decision log (what & why)
│   ├── HANDOVER.txt                # Notes for the next team
│   ├── DOMAIN.txt                  # Domain explanation
│   ├── EXCLUDED.txt                # What we left out of v1
│   └── IMPROVEMENTS.txt            # Proposed future improvements
├── db.js                           # PostgreSQL connection + init
├── server.js                       # Express entry point
├── .env.example                    # Environment template
└── package.json
```

## Documentation

All project documentation lives in the `docs/` folder:

- **DECISIONS.txt** — Why we chose this endpoint, database, auth model, etc.
- **HANDOVER.txt** — Assumptions, open questions, what works, what doesn't
- **DOMAIN.txt** — What protocol execution means in the Reportheld domain
- **EXCLUDED.txt** — What we intentionally left out and why
- **IMPROVEMENTS.txt** — Prioritized improvements for v2 and beyond

## Stopping

```bash
# Stop the Node server: Ctrl+C

# Stop PostgreSQL:
docker compose -f data/docker-compose.yml down
```
