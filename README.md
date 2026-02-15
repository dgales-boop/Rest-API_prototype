# Execution Protocol Integration API

A **Contract-First Integration Prototype** for exposing execution protocol data from the Reportheld platform to external consumers (ERP systems, n8n workflows, AI tools, data warehouses).

## What Is This?

This API is an **architectural prototype** that:

- ✅ Defines a **stable contract** for execution protocol data
- ✅ Provides **working endpoints** for integration development
- ✅ Uses **PostgreSQL with seeded test data** (production data via future Reportheld integration)
- ✅ Demonstrates **polling-based consumption** pattern
- ✅ Implements **multi-tenant data isolation**

### This Is NOT

- ❌ A full production integration (data source is seeded test data)
- ❌ A write API (read-only GET endpoints)
- ❌ A webhook/event system (polling model instead)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Start the Server

```bash
npm start
```

### 4. Test the API

```bash
# Health check
curl http://localhost:4001/api/v1/health

# List protocols (requires API key)
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols

# Get full snapshot
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440001
```

---

## API Endpoints

| Endpoint                          | Method | Auth | Description              |
| --------------------------------- | ------ | ---- | ------------------------ |
| `/api/v1/health`                  | GET    | No   | Health check             |
| `/api/v1/execution-protocols`     | GET    | Yes  | List protocols (polling) |
| `/api/v1/execution-protocols/:id` | GET    | Yes  | Get full snapshot        |

### Example Response (List)

```json
{
  "protocols": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "siteId": "site-l3-berlin",
      "plantId": "plant-t17",
      "status": "CLOSED",
      "closedAt": "2026-02-01T14:30:00.000Z",
      "updatedAt": "2026-02-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 3,
    "hasMore": false
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Consumers                        │
│   (n8n, ERP systems, AI tools, Data Warehouses)             │
└─────────────────────────────────────────────────────────────┘
                              │
                       HTTPS + API Key
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Integration API Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │──│ Controller  │──│    Repository       │  │
│  │             │  │             │  │    (swappable)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
   ┌──────▼──────┐                       ┌────────▼────────┐
   │  PostgreSQL │                       │    Reportheld   │
   │ (seed data) │                       │    (future)     │
   └─────────────┘                       └─────────────────┘
```

### Key Design Decisions

| Decision               | Rationale                                                     |
| ---------------------- | ------------------------------------------------------------- |
| **Read-only API**      | Integration consumers only need to read finalized data        |
| **Polling model**      | Simpler than webhooks, consumer-controlled, firewall-friendly |
| **Repository pattern** | Swap data sources without changing API contract               |
| **Contract-first**     | Define API shape before production integration                |

---

## Database Setup (Required)

PostgreSQL is the data source. Use Docker to run it:

### 1. Start PostgreSQL

```bash
docker compose -f data/docker-compose.yml up -d
```

### 2. Initialize Database

```bash
npm run db:init
```

### 3. Seed Test Data

```bash
npm run db:seed
```

### 4. Start the Server

```bash
npm start
```

---

## Documentation

| Document                                                | Description                       |
| ------------------------------------------------------- | --------------------------------- |
| **Architecture**                                        |                                   |
| [Overview](docs/architecture/OVERVIEW.md)               | System architecture and design    |
| [Adapter Pattern](docs/architecture/ADAPTER-PATTERN.md) | Repository pattern explanation    |
| [Polling Model](docs/architecture/POLLING-MODEL.md)     | Why polling, how it works         |
| **Guides**                                              |                                   |
| [Getting Started](docs/guides/GETTING-STARTED.md)       | Setup and installation            |
| [Testing](docs/guides/TESTING.md)                       | How to test the API               |
| **API Reference**                                       |                                   |
| [Contract](docs/api/CONTRACT.md)                        | Full API specification            |
| [Security](docs/api/SECURITY.md)                        | Authentication and security model |
| **Integration**                                         |                                   |
| [Future Strategy](docs/integration/FUTURE-STRATEGY.md)  | Reportheld integration plan       |

---

## Project Structure

```
REST_API/
├── server.js                 # Application entry point
├── db.js                     # Database connection
├── package.json              # Dependencies
│
├── controllers/              # Request handlers
│   └── executionProtocolController.js
│
├── routes/                   # API routes
│   └── executionProtocols.js
│
├── domain/                   # Domain models
│   └── executionProtocol.js
│
├── repository/               # Data access (swappable)
│   ├── executionProtocolRepository.js
│   └── postgresExecutionProtocolRepository.js
│
├── middleware/               # Express middleware
│   └── authMiddleware.js
│
├── scripts/                  # Database scripts
│   ├── initDatabase.js
│   └── seedDatabase.js
│
└── docs/                     # Documentation
    ├── architecture/
    ├── guides/
    ├── api/
    └── integration/
```

---

## Scripts

| Command           | Description            |
| ----------------- | ---------------------- |
| `npm start`       | Start the server       |
| `npm run db:init` | Create database tables |
| `npm run db:seed` | Seed test data         |

---

## Environment Variables

| Variable      | Default        | Description                  |
| ------------- | -------------- | ---------------------------- |
| `PORT`        | `4001`         | Server port                  |
| `DB_HOST`     | `localhost`    | PostgreSQL host              |
| `DB_PORT`     | `5432`         | PostgreSQL port              |
| `DB_USER`     | `proto_user`   | Database user                |
| `DB_PASSWORD` | `proto_secret` | Database password            |
| `DB_NAME`     | `proto_db`     | Database name                |
| `API_KEYS`    | `{}`           | JSON mapping keys to tenants |

---

## Technology Stack

| Component      | Technology     |
| -------------- | -------------- |
| Runtime        | Node.js 18+    |
| Framework      | Express 4.x    |
| Database       | PostgreSQL 14+ |
| Authentication | API Key        |

---

## Future Integration

When Reportheld integration is ready:

1. Create `ReportheldAdapterRepository` implementing the repository interface
2. Add Reportheld credentials to `.env`
3. Add repository wiring in `server.js`
4. Deploy

**No changes to API contract, controllers, or routes required.**

See [Future Strategy](docs/integration/FUTURE-STRATEGY.md) for details.

---

## License

Internal use only.
