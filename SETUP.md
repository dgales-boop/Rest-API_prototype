# Setup Guide (New Workstation)

## Prerequisites

Install these two things:

| Tool               | Download                                       |
| ------------------ | ---------------------------------------------- |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop |
| **Git**            | https://git-scm.com/downloads                  |

After installing Docker Desktop, **open it and let it start**.

---

## Setup (5 commands)

Open PowerShell and run:

```powershell
# 1. Clone the repo
git clone https://github.com/dgales-boop/Rest-API_prototype.git
cd Rest-API_prototype

# 2. Start everything (PostgreSQL + API + n8n)
docker compose up -d

# 3. Wait ~30 seconds for containers to start, then initialize the database
docker exec proto-api node scripts/initDatabase.js
docker exec proto-api node scripts/seedDatabase.js
```

Done. Three services are now running:

| Service        | URL                   | What it does        |
| -------------- | --------------------- | ------------------- |
| **REST API**   | http://localhost:4001 | Your API            |
| **n8n**        | http://localhost:5678 | Workflow automation |
| **PostgreSQL** | localhost:5432        | Database (internal) |

---

## Verify It Works

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/health" -UseBasicParsing | Select-Object -ExpandProperty Content

# List protocols
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/execution-protocols" -Headers @{'X-API-Key'='test-key-acme'} -UseBasicParsing | Select-Object -ExpandProperty Content
```

Or open http://localhost:4001 in your browser and use the built-in API tester.

---

## Set Up n8n Workflow

1. Open http://localhost:5678
2. Create an account (first time only — stays local)
3. Click **Add workflow** → **⋮ menu** → **Import from File...**
4. Select `n8n/workflow-poll-execution-protocols.json`
5. Click **Test workflow** ▶

The API URL (`http://api:4001`) and API key (`test-key-acme`) are pre-configured in docker-compose.yml. No extra setup needed.

---

## Daily Usage

```powershell
# Start (if Docker Desktop is running)
cd Rest-API_prototype
docker compose up -d

# Stop
docker compose down

# Stop and delete all data
docker compose down -v
```

---

## Switching Networks / Workstations

This setup works on **any machine with Docker Desktop**. No network configuration needed — everything runs inside Docker's internal network.

- Different WiFi → works
- Different office → works
- VPN on/off → works
- No internet → works (after first `docker compose up`)

The first `docker compose up -d` downloads images (~500MB). After that, it works offline.

---

## Troubleshooting

| Problem                                | Fix                                                              |
| -------------------------------------- | ---------------------------------------------------------------- |
| `docker compose up` fails              | Open Docker Desktop first, wait for it to start                  |
| `docker exec` says container not found | Wait 30 seconds after `docker compose up -d`, then retry         |
| Port 4001 already in use               | Run `docker compose down` first, then `docker compose up -d`     |
| Port 5678 already in use               | Stop your other n8n instance first                               |
| "container name already in use"        | Run `docker rm -f proto-postgres proto-api proto-n8n` then retry |
| n8n can't reach the API                | URL inside n8n must be `http://api:4001` (NOT `localhost`)       |
| API returns 0 protocols                | Run `docker exec proto-api node scripts/seedDatabase.js`         |

---

## File Overview

```
REST_API/
├── docker-compose.yml     ← THE ONLY Docker file you need
├── Dockerfile             ← Builds the API image (used by docker-compose)
├── server.js              ← API entry point
├── scripts/
│   ├── initDatabase.js    ← Creates tables
│   └── seedDatabase.js    ← Inserts test data
└── n8n/
    └── workflow-poll-execution-protocols.json  ← Import into n8n
```
