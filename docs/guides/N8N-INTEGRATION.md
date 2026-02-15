# n8n Workflow Integration Guide

## Overview

This guide explains how to import and configure the n8n workflow that polls our Execution Protocol Integration API. The workflow runs on a schedule, fetches protocol data, retrieves full snapshots, and processes them for downstream use.

## Workflow Architecture

```
┌──────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐
│  Schedule    │───>│ Health Check │───>│ Fetch List  │───>│ Has Protocols │
│  (5 min)     │    │ GET /health  │    │ GET /protos │    │    ?          │
└──────────────┘    └──────────────┘    └─────────────┘    └───────┬───────┘
                                                                   │
                         ┌────────────────┐    ┌───────────────┐   │
                         │ Process Data   │<───│ Fetch Snapshot │<──┘
                         │ (your logic)   │    │ GET /:id/snap │
                         └────────────────┘    └───────────────┘
```

**Nodes in order:**

1. **Poll Every 5 Minutes** — Schedule trigger
2. **Health Check** — `GET /api/v1/health` (no auth needed)
3. **API Healthy?** — If status != "ok", stop
4. **Fetch Protocol List** — `GET /api/v1/execution-protocols` with API key
5. **Has Protocols?** — If 0 results, stop
6. **Split Into Individual Protocols** — Converts array to individual items
7. **Fetch Full Snapshot** — `GET /api/v1/execution-protocols/:id/snapshot` per protocol
8. **Process Snapshot Data** — Extract and transform data (customize this)

---

## Prerequisites

- **n8n** installed and running (self-hosted or cloud)
- **REST API server** running on a reachable URL
- **API key** configured (e.g., `test-key-acme`)

---

## Step-by-Step Import Instructions

### Step 1: Open n8n

Navigate to your n8n instance (e.g., `http://localhost:5678`).

### Step 2: Import the Workflow

1. Click **"Add workflow"** (or the `+` button)
2. Click the **three dots menu** (⋮) in the top right
3. Select **"Import from File..."**
4. Browse to `n8n/workflow-poll-execution-protocols.json` and select it
5. The workflow will appear in the editor canvas

### Step 3: Configure Environment Variables

The workflow uses n8n environment variables (not hardcoded values). Set these in your n8n instance:

| Variable       | Value                   | Description                |
| -------------- | ----------------------- | -------------------------- |
| `API_BASE_URL` | `http://localhost:4001` | Your REST API server URL   |
| `API_KEY`      | `test-key-acme`         | API key for authentication |

**How to set environment variables in n8n:**

**Option A — Self-hosted (recommended):**
Add to your n8n `.env` file or Docker environment:

```ini
N8N_CUSTOM_EXTENSIONS=""
```

Then set via n8n's Settings → Variables:

1. Go to **Settings** → **Variables** (or **Environment Variables**)
2. Add `API_BASE_URL` = `http://localhost:4001`
3. Add `API_KEY` = `test-key-acme`

**Option B — Docker Compose:**

```yaml
environment:
  - API_BASE_URL=http://host.docker.internal:4001
  - API_KEY=test-key-acme
```

> **Note:** If n8n runs in Docker and your API runs on the host, use `host.docker.internal` instead of `localhost`.

### Step 4: Test the Workflow

1. Click **"Test workflow"** (play button) in the n8n editor
2. Watch each node execute in sequence
3. Click on any node to see its input/output data
4. Verify:
   - Health Check returns `{ status: "ok" }`
   - Fetch Protocol List returns protocols array
   - Each snapshot is fetched and processed

### Step 5: Activate the Workflow

Once testing passes:

1. Toggle the **"Active"** switch in the top-right corner
2. The workflow will now run automatically every 5 minutes

---

## Customizing the Workflow

### Change Polling Interval

Click the **"Poll Every 5 Minutes"** node and adjust:

- Every 1 minute (aggressive — for testing)
- Every 15 minutes (balanced — development)
- Every 1 hour (production — typical polling)

### Add `updatedAfter` Filtering

To only fetch protocols updated since the last poll, modify the **"Fetch Protocol List"** node's query parameters:

```
updatedAfter = {{ $now.minus({minutes: 5}).toISO() }}
```

This makes the workflow truly incremental — only new/changed protocols are fetched each cycle.

### Add Downstream Actions

After the **"Process Snapshot Data"** node, you can add:

| Action                  | n8n Node Type          |
| ----------------------- | ---------------------- |
| Save to Google Sheets   | Google Sheets node     |
| Send Slack notification | Slack node             |
| Store in database       | Postgres/MySQL node    |
| Send email report       | Email node             |
| Call another API        | HTTP Request node      |
| Write to file           | Write Binary File node |

---

## Authentication Considerations

### Current (Prototype)

- API key sent via `X-API-Key` header
- Keys are static strings mapped to tenants in the API's `.env`
- The workflow uses `$env.API_KEY` to avoid hardcoding

### Production (Future)

When Reportheld integration is live, authentication may change:

| Scenario          | What to Update                                       |
| ----------------- | ---------------------------------------------------- |
| Same API key auth | Only change `API_KEY` value                          |
| OAuth 2.0         | Add n8n OAuth2 credential, update HTTP Request nodes |
| JWT tokens        | Add a token refresh node before API calls            |

---

## Modifying for Reportheld Integration

When Reportheld integration goes live, the workflow itself **does not change**. Here's why:

### What Stays the Same

- All workflow nodes (same endpoint URLs)
- All query parameters (`updatedAfter`, `limit`, `offset`)
- All response parsing logic (same JSON contract)
- Authentication headers

### What You Might Change

| Change           | Where              | Why                                     |
| ---------------- | ------------------ | --------------------------------------- |
| `API_BASE_URL`   | n8n Variables      | If API moves to production server       |
| `API_KEY`        | n8n Variables      | New production API key                  |
| Polling interval | Schedule node      | Production may need different frequency |
| Error handling   | Add error workflow | Production needs alerting               |

### Adding Reportheld-Specific Nodes (Optional)

If you want the workflow to also call Reportheld directly (bypass our API):

```
[Schedule] → [Call Reportheld API] → [Transform Data] → [Send to Our API]
```

This is optional — the recommended approach is to keep calling our API, which handles Reportheld internally via the adapter pattern.

---

## Troubleshooting

| Problem              | Cause                   | Fix                                                         |
| -------------------- | ----------------------- | ----------------------------------------------------------- |
| Health Check fails   | API server not running  | Start server: `npm start`                                   |
| 401 Unauthorized     | Wrong API key           | Check `API_KEY` env var in n8n                              |
| 0 protocols returned | Wrong tenant or no data | Verify API key maps to correct tenant                       |
| Connection refused   | Network issue           | Check `API_BASE_URL`, use `host.docker.internal` for Docker |
| Timeout errors       | API too slow            | Increase timeout in HTTP Request node settings              |

---

## Files

| File                                         | Purpose                 |
| -------------------------------------------- | ----------------------- |
| `n8n/workflow-poll-execution-protocols.json` | Importable n8n workflow |
| `docs/guides/N8N-INTEGRATION.md`             | This guide              |
