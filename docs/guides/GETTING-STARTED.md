# Getting Started

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool       | Version        | Check Command    |
| ---------- | -------------- | ---------------- |
| Node.js    | 18.x or higher | `node --version` |
| npm        | 9.x or higher  | `npm --version`  |
| PostgreSQL | 14.x or higher | `psql --version` |

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/dgales-boop/Rest-API_prototype.git
cd Rest-API_prototype

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your settings:

```ini
# Server Configuration
PORT=4001

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=proto_user
DB_PASSWORD=proto_secret
DB_NAME=proto_db

# Repository Type: PostgreSQL
# Handled by docker-compose.yml automatically

# API Keys (JSON object mapping keys to tenant IDs)
API_KEYS={"test-key-acme":"tenant-acme","test-key-globex":"tenant-globex"}
```

### 3. Start Everything

```bash
docker compose up -d
```

### 4. Initialize Database

```bash
docker exec proto-api node scripts/initDatabase.js
docker exec proto-api node scripts/seedDatabase.js
```

### 4. Start the Server

```bash
npm start
```

You should see:

```
📊 Using PostgreSQL repository (database-backed)

🚀 Execution Protocol Integration API
📡 Server running at http://localhost:4001
✅ Health check:     GET http://localhost:4001/api/v1/health
📋 List protocols:   GET http://localhost:4001/api/v1/execution-protocols
📄 Get protocol:     GET http://localhost:4001/api/v1/execution-protocols/:id
📊 Get snapshot:     GET http://localhost:4001/api/v1/execution-protocols/:id/snapshot

🔐 All endpoints require X-API-Key header
```

### 5. Test the API

```bash
# Health check (no auth required)
curl http://localhost:4001/api/v1/health

# List protocols (auth required)
curl -H "X-API-Key: test-key-acme" http://localhost:4001/api/v1/execution-protocols
```

## PostgreSQL Details

The database runs inside Docker via the root `docker-compose.yml`.

### Manual PostgreSQL Setup (alternative to Docker)

```sql
-- Connect as superuser and run:
CREATE USER proto_user WITH PASSWORD 'proto_secret';
CREATE DATABASE proto_db OWNER proto_user;
GRANT ALL PRIVILEGES ON DATABASE proto_db TO proto_user;
```

Or use the included Docker Compose (recommended):

```bash
docker compose up -d
```

### Initialize Database Schema

```bash
npm run db:init
```

This creates the `execution_protocols` table with proper indexes.

### Seed with Test Data

```bash
npm run db:seed
```

This inserts 5 realistic CLOSED execution protocols:

- 3 for `tenant-acme`
- 2 for `tenant-globex`

### Start the Server

```bash
npm start
```

## Available Scripts

| Script        | Command           | Description            |
| ------------- | ----------------- | ---------------------- |
| Start server  | `npm start`       | Launch the API server  |
| Initialize DB | `npm run db:init` | Create database schema |
| Seed data     | `npm run db:seed` | Insert test protocols  |

## Project Structure

```
REST_API/
├── server.js                 # Entry point - start here
├── db.js                     # Database connection
├── package.json              # Dependencies
├── .env                      # Your local config
│
├── controllers/              # Request handlers
├── routes/                   # API route definitions
├── domain/                   # Domain models
├── repository/               # Data access layer
├── middleware/               # Express middleware
├── utils/                    # Utility functions
├── scripts/                  # Database scripts
├── docs/                     # Documentation (you are here)
└── public/                   # Static files
```

## Next Steps

1. **Understand the architecture** → [Architecture Overview](../architecture/OVERVIEW.md)
2. **Test the API** → [Testing Guide](TESTING.md)
3. **Read the API reference** → [API Contract](../api/CONTRACT.md)
4. **Learn about security** → [Security Model](../api/SECURITY.md)

## Troubleshooting

### "Connection refused" error

PostgreSQL is not running or not accessible.

```bash
# Check if PostgreSQL is running
# Windows: Services → PostgreSQL
# Linux: sudo systemctl status postgresql
# Docker: docker ps
```

### "relation does not exist" error

Database schema not initialized.

```bash
npm run db:init
```

### "Invalid API key" error

API key not configured or incorrect.

Check your `.env`:

```ini
API_KEYS={"test-key-acme":"tenant-acme"}
```

Use the header:

```bash
curl -H "X-API-Key: test-key-acme" http://localhost:4001/api/v1/execution-protocols
```

### Port already in use

Another process is using port 4001.

```bash
# Find process using port 4001
# Windows:
netstat -ano | findstr :4001

# Linux/Mac:
lsof -i :4001

# Or change the port in .env
PORT=4002
```
