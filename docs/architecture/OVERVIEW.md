# Architecture Overview

## What is This Project?

This is a **Contract-First Integration API Prototype** designed to demonstrate how external systems (ERP, n8n workflows, AI tools, data warehouses) can consume execution protocol data from the Reportheld platform.

### Key Characteristics

| Aspect          | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| **Type**        | Integration API Prototype                                   |
| **Purpose**     | Validate contract design before full Reportheld integration |
| **Data Source** | PostgreSQL with seeded test data (swappable to production)  |
| **Operations**  | Read-only (GET endpoints only)                              |
| **Pattern**     | Contract-First, Repository Pattern                          |

## Why Contract-First?

Traditional API development often creates tight coupling between consumers and internal systems. This prototype takes a different approach:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CONTRACT-FIRST APPROACH                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. Define Contract    →    2. Build Prototype    →    3. Validate │
│   (API shape, schemas)       (with seeded data)        (real usage) │
│                                                                     │
│         ↓                          ↓                       ↓        │
│                                                                     │
│   4. Integrate          →    5. Swap Data Source   →    6. Deploy   │
│   (Reportheld adapter)       (seeded → production)      (go live)   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Benefits

1. **Decouple Development** - Frontend/integration teams don't wait for backend
2. **Validate Early** - Test integrations before production systems exist
3. **Stable Contracts** - External consumers rely on documented schemas
4. **Lower Risk** - Identify issues before committing to full implementation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CONSUMERS                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐ │
│  │   n8n   │  │   ERP   │  │ AI Tool │  │   DWH   │  │ Analytics │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └─────┬─────┘ │
└───────┼────────────┼────────────┼────────────┼─────────────┼───────┘
        │            │            │            │             │
        └────────────┴────────────┼────────────┴─────────────┘
                                  │
                          ┌───────▼───────┐
                          │   HTTPS/TLS   │
                          │  X-API-Key    │
                          └───────┬───────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                     INTEGRATION API                                │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │                      Express Server                          │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                  Auth Middleware                        │ │  │
│  │  │          (API Key → Tenant ID extraction)               │ │  │
│  │  └────────────────────────┬───────────────────────────────┘ │  │
│  │                           │                                  │  │
│  │  ┌────────────────────────▼───────────────────────────────┐ │  │
│  │  │                    Controller                           │ │  │
│  │  │    (Request validation, response formatting)            │ │  │
│  │  └────────────────────────┬───────────────────────────────┘ │  │
│  │                           │                                  │  │
│  │  ┌────────────────────────▼───────────────────────────────┐ │  │
│  │  │               Repository Interface                      │ │  │
│  │  │         (Abstract data access contract)                 │ │  │
│  │  └────────────────────────┬───────────────────────────────┘ │  │
│  └───────────────────────────┼──────────────────────────────────┘  │
│                              │                                     │
│              ┌───────────────┼───────────────┐                     │
│              │               │               │                     │
│      ┌──────────────┐ ┌──────────────┐             │
│      │  PostgreSQL │ │  Reportheld │             │
│      │  Repository │ │   Adapter   │             │
│      │  (current)  │ │  (future)   │             │
│      └──────────────┘ └──────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Layers Explained

### 1. HTTP Layer (Express Server)

The entry point for all API requests. Handles:

- Request parsing (JSON body, query parameters)
- Static file serving (documentation UI)
- Route registration
- Error handling

### 2. Authentication Layer (Middleware)

Extracts tenant identity from API keys:

```javascript
// Request
X-API-Key: tenant-acme-secret-key

// Middleware extracts
req.tenantId = "tenant-acme"
```

### 3. Controller Layer

Orchestrates business logic:

- Validates input (UUID format, required fields)
- Calls repository methods
- Formats responses (HTTP status codes, JSON structure)
- Handles errors

### 4. Repository Layer

Abstract interface for data access:

```javascript
class ExecutionProtocolRepository {
  async getAllForPolling(tenantId, options) {}
  async getById(tenantId, id) {}
  async getSnapshotById(tenantId, id) {}
}
```

### 5. Data Layer (Swappable Implementations)

| Implementation                        | Use Case                       |
| ------------------------------------- | ------------------------------ |
| `PostgresExecutionProtocolRepository` | Current - staging, development |
| `ReportheldAdapterRepository`         | Production (future)            |

## What This Prototype Does NOT Include

| Feature                              | Reason                          |
| ------------------------------------ | ------------------------------- |
| Write operations (POST, PUT, DELETE) | Read-only integration API       |
| Webhook dispatching                  | Consumers poll for changes      |
| Real-time updates (WebSocket)        | Polling-based consumption model |
| User authentication                  | API key authentication only     |
| Internal lifecycle management        | Data arrives already finalized  |
| Direct Reportheld connection         | Prototype uses seeded test data |

## Data Flow

### Polling Flow

```
Consumer                     Integration API                    Data Source
   │                               │                                 │
   │  GET /execution-protocols     │                                 │
   │  ?updatedAfter=<timestamp>    │                                 │
   │  X-API-Key: <key>             │                                 │
   │──────────────────────────────►│                                 │
   │                               │                                 │
   │                               │  getAllForPolling(tenant, opts) │
   │                               │────────────────────────────────►│
   │                               │                                 │
   │                               │◄────────────────────────────────│
   │                               │         [metadata array]        │
   │                               │                                 │
   │◄──────────────────────────────│                                 │
   │    { protocols: [...] }       │                                 │
   │                               │                                 │
   │  (for each new protocol)      │                                 │
   │  GET /execution-protocols/:id │                                 │
   │──────────────────────────────►│                                 │
   │                               │                                 │
   │                               │  getSnapshotById(tenant, id)    │
   │                               │────────────────────────────────►│
   │                               │                                 │
   │◄──────────────────────────────│◄────────────────────────────────│
   │    { full snapshot JSON }     │                                 │
   │                               │                                 │
```

## Technology Stack

| Component      | Technology          | Purpose                  |
| -------------- | ------------------- | ------------------------ |
| Runtime        | Node.js 18+         | Server execution         |
| Framework      | Express 4.x         | HTTP routing             |
| Database       | PostgreSQL 14+      | Data persistence         |
| Authentication | API Key (X-API-Key) | Tenant identification    |
| Configuration  | dotenv              | Environment management   |
| Data Format    | JSON/JSONB          | API responses, snapshots |

## File Structure

```
REST_API/
├── server.js                 # Application entry point
├── db.js                     # Database connection pool
├── package.json              # Dependencies and scripts
│
├── controllers/              # HTTP request handlers
│   └── executionProtocolController.js
│
├── routes/                   # Express route definitions
│   └── executionProtocols.js
│
├── domain/                   # Domain models and schemas
│   └── executionProtocol.js
│
├── repository/               # Data access layer
│   ├── executionProtocolRepository.js      # Abstract interface
│   └── postgresExecutionProtocolRepository.js
│
├── middleware/               # Express middleware
│   └── authMiddleware.js
│
├── utils/                    # Utility functions
│   └── validation.js
│
├── scripts/                  # Database scripts
│   ├── initDatabase.js       # Schema creation
│   └── seedDatabase.js       # Test data seeding
│
├── docs/                     # Documentation
│   ├── architecture/         # Architecture documentation
│   ├── guides/               # How-to guides
│   ├── api/                  # API reference
│   └── integration/          # Integration strategy
│
└── public/                   # Static files
    └── index.html            # API documentation UI
```

## Next Steps

1. **Understand the API** → [API Reference](../api/CONTRACT.md)
2. **Set up locally** → [Getting Started](../guides/GETTING-STARTED.md)
3. **Test the endpoints** → [Testing Guide](../guides/TESTING.md)
4. **Learn about adapters** → [Adapter Pattern](ADAPTER-PATTERN.md)
5. **Understand polling** → [Polling Model](POLLING-MODEL.md)
