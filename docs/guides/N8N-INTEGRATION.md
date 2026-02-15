# n8n Workflow Integration Guide

## Overview

This guide explains how to import and configure the n8n workflow that polls our Execution Protocol Integration API. The workflow runs on a schedule, fetches protocol data, retrieves full snapshots, and processes them for downstream use.

## Docker Networking (Why `localhost` Doesn't Work)

When both n8n and the REST API run in Docker, `localhost` inside n8n refers to **n8n's own container** — not your host machine and not the API container. This is why connection attempts to `http://localhost:4001` fail from inside n8n.

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │   postgres   │   │     api      │   │       n8n        │ │
│  │   :5432      │   │    :4001     │   │      :5678       │ │
│  └──────────────┘   └──────────────┘   └──────────────────┘ │
│         ▲                  ▲                   │             │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│              Containers reach each other by NAME             │
│              e.g. http://api:4001                            │
└──────────────────────────────────────────────────────────────┘
         │                  │                   │
     localhost:5432     localhost:4001     localhost:5678
         │                  │                   │
┌────────┴──────────────────┴───────────────────┴──────────────┐
│                     Your Host Machine                        │
│              (Browser, Postman, curl, etc.)                  │
└──────────────────────────────────────────────────────────────┘
```

### URL Rules

| Context                                    | Correct URL                        | Why                          |
| ------------------------------------------ | ---------------------------------- | ---------------------------- |
| **n8n → REST API** (both in Docker)        | `http://api:4001`                  | Containers use service names |
| **Browser → REST API** (from host)         | `http://localhost:4001`            | Host uses published ports    |
| **Browser → n8n** (from host)              | `http://localhost:5678`            | Host uses published ports    |
| **n8n → API** (n8n in Docker, API on host) | `http://host.docker.internal:4001` | Special Docker DNS for host  |

---

## Quick Start (Recommended)

The project includes a `docker-compose.yml` at the project root that runs PostgreSQL, the REST API, and n8n together on one shared network.

### Step 1: Start All Services

```powershell
# From the project root
docker compose up -d
```

This starts three containers:

| Service    | Container        | Port | URL from host           |
| ---------- | ---------------- | ---- | ----------------------- |
| PostgreSQL | `proto-postgres` | 5432 | `localhost:5432`        |
| REST API   | `proto-api`      | 4001 | `http://localhost:4001` |
| n8n        | `proto-n8n`      | 5678 | `http://localhost:5678` |

### Step 2: Initialize the Database

```powershell
# Run database init and seed inside the API container
docker exec proto-api node scripts/initDatabase.js
docker exec proto-api node scripts/seedDatabase.js
```

### Step 3: Verify the API

```powershell
# From your host machine (browser or terminal)
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Step 4: Open n8n

Open `http://localhost:5678` in your browser.

The environment variables `API_BASE_URL` (`http://api:4001`) and `API_KEY` (`test-key-acme`) are already set in the docker-compose.yml. The workflow can use them immediately via `{{ $env.API_BASE_URL }}` and `{{ $env.API_KEY }}`.

### Step 5: Import the Workflow

1. Click **"Add workflow"** (or the `+` button)
2. Click the **three dots menu** (⋮) in the top right
3. Select **"Import from File..."**
4. Browse to `n8n/workflow-poll-execution-protocols.json` and select it
5. The workflow will appear in the editor canvas

### Step 6: Test the Workflow

1. Click **"Test workflow"** (play button)
2. Watch each node execute — click on any node to see its output
3. Verify:
   - **Health Check** returns `{ status: "ok" }`
   - **Fetch Protocol List** returns 3 protocols
   - **Fetch Full Snapshot** returns complete snapshot JSON

### Step 7: Activate

Toggle the **"Active"** switch in the top-right corner. The workflow will now run automatically every 5 minutes.

---

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

## Alternative: n8n Already Running Separately

If you already have an n8n instance running in its own Docker setup and don't want to use the combined docker-compose, you have two options:

### Option A: Shared Docker Network (Recommended)

Create a shared network and connect both containers:

```powershell
# Create a shared network
docker network create proto-network

# Connect your existing n8n container
docker network connect proto-network <your-n8n-container-name>

# Start the API stack on the same network
docker compose up -d
docker network connect proto-network proto-api
```

Then use `http://proto-api:4001` as the API URL inside n8n.

### Option B: Use `host.docker.internal`

If you don't want to manage networks, and the API port is published to the host:

1. In n8n, go to **Settings** → **Variables**
2. Set `API_BASE_URL` = `http://host.docker.internal:4001`
3. Set `API_KEY` = `test-key-acme`

This routes traffic through the host machine. Works on Docker Desktop (Windows/Mac). On Linux, add `--add-host=host.docker.internal:host-gateway` to your n8n container.

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

## Modifying for Reportheld Integration

When Reportheld integration goes live, the workflow itself **does not change**. The API endpoints, JSON contract, and authentication all stay the same. You may only need to:

| Change           | Where                          | Why                                     |
| ---------------- | ------------------------------ | --------------------------------------- |
| `API_BASE_URL`   | n8n Variables / docker-compose | If API moves to production server       |
| `API_KEY`        | n8n Variables / docker-compose | New production API key                  |
| Polling interval | Schedule node                  | Production may need different frequency |

---

## Troubleshooting

| Problem                            | Cause                                   | Fix                                                                        |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `ECONNREFUSED` at `localhost:4001` | n8n can't reach API via `localhost`     | Use `http://api:4001` (same compose) or `http://host.docker.internal:4001` |
| Health Check fails                 | API container not running               | `docker compose ps` — check `proto-api` is up                              |
| 401 Unauthorized                   | Wrong API key                           | Verify `API_KEY` env var matches a key in the API's `API_KEYS` config      |
| 0 protocols returned               | Database not seeded                     | Run `docker exec proto-api node scripts/seedDatabase.js`                   |
| `getaddrinfo ENOTFOUND api`        | Containers on different Docker networks | Use shared network or `host.docker.internal`                               |

---

## Useful Docker Commands

```powershell
# Check all containers are running
docker compose ps

# View API logs
docker compose logs -f api

# View n8n logs
docker compose logs -f n8n

# Restart just the API
docker compose restart api

# Re-seed the database
docker exec proto-api node scripts/seedDatabase.js

# Stop everything
docker compose down

# Stop and delete all data (database + n8n)
docker compose down -v
```

---

## Files

| File                                         | Purpose                            |
| -------------------------------------------- | ---------------------------------- |
| `docker-compose.yml`                         | Full stack: PostgreSQL + API + n8n |
| `Dockerfile`                                 | Builds the REST API container      |
| `n8n/workflow-poll-execution-protocols.json` | Importable n8n workflow            |
| `docs/guides/N8N-INTEGRATION.md`             | This guide                         |
