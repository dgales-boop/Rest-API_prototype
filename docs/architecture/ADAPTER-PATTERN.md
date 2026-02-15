# Adapter Pattern

## Overview

This API uses the **Repository Pattern** (a form of the Adapter Pattern) to decouple the application logic from the data source. This allows seamless switching between PostgreSQL (current) and future Reportheld integration without changing any controller or route code.

## Why This Pattern?

### The Problem

Traditional implementations tightly couple business logic to data sources:

```javascript
// ❌ Tight coupling - hard to change, hard to test
async function getProtocols(req, res) {
  const result = await pool.query(
    "SELECT * FROM protocols WHERE tenant_id = $1",
    [req.tenantId],
  );
  res.json(result.rows);
}
```

Problems with this approach:

- Cannot test without a database
- Cannot switch data sources without rewriting code
- Business logic mixed with data access

### The Solution

The Repository Pattern introduces an abstraction layer:

```javascript
// ✅ Loose coupling - easy to change, easy to test
async function getProtocols(req, res) {
  const protocols = await repository.getAllForPolling(req.tenantId, options);
  res.json({ protocols });
}
```

The `repository` can be:

- PostgreSQL implementation (current — for development and staging)
- Reportheld adapter (for production)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Controller Layer                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  getAllForPolling(tenantId, options)                    │   │
│  │  getById(tenantId, id)                                  │   │
│  │  getSnapshotById(tenantId, id)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ calls                            │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Repository Interface (Abstract)             │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  getAllForPolling(tenantId, { updatedAfter,     │    │   │
│  │  │                     limit, offset })             │    │   │
│  │  │  getById(tenantId, id)                           │    │   │
│  │  │  getSnapshotById(tenantId, id)                   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ implemented by                   │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Concrete Implementations                 │   │
│  │                                                          │   │
│  ┌──────────────┐ ┌──────────────────┐ │   │
│  │  PostgreSQL  │ │    Reportheld    │ │   │
│  │  Repository  │ │     Adapter      │ │   │
│  │              │ │                  │ │   │
│  │ SQL queries  │ │ HTTP client to   │ │   │
│  │ against DB   │ │ Reportheld API   │ │   │
│  └──────────────┘ └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## The Repository Interface

Located at: [repository/executionProtocolRepository.js](../../repository/executionProtocolRepository.js)

```javascript
class ExecutionProtocolRepository {
  /**
   * Get protocols for polling-based consumption.
   * Returns minimal metadata (not full snapshots).
   *
   * @param {string} tenantId - Tenant identifier
   * @param {Object} options
   * @param {string} options.updatedAfter - ISO timestamp filter
   * @param {number} options.limit - Max results (1-100)
   * @param {number} options.offset - Pagination offset
   * @returns {Promise<Array>} Protocol metadata array
   */
  async getAllForPolling(tenantId, { updatedAfter, limit, offset }) {
    throw new Error("Abstract method - must be implemented");
  }

  /**
   * Get a single protocol by ID.
   * Enforces tenant isolation.
   *
   * @param {string} tenantId - Tenant identifier
   * @param {string} id - Protocol UUID
   * @returns {Promise<Object|null>} Protocol or null
   */
  async getById(tenantId, id) {
    throw new Error("Abstract method - must be implemented");
  }

  /**
   * Get full snapshot JSON for a protocol.
   * Returns the complete JSONB snapshot.
   *
   * @param {string} tenantId - Tenant identifier
   * @param {string} id - Protocol UUID
   * @returns {Promise<Object|null>} Snapshot or null
   */
  async getSnapshotById(tenantId, id) {
    throw new Error("Abstract method - must be implemented");
  }
}
```

## Implementations

### 1. PostgreSQL Repository (Current)

**File:** [repository/postgresExecutionProtocolRepository.js](../../repository/postgresExecutionProtocolRepository.js)

**Purpose:** Development, staging, integration testing with seeded data

```javascript
class PostgresExecutionProtocolRepository extends ExecutionProtocolRepository {
  async getAllForPolling(tenantId, { updatedAfter, limit, offset }) {
    const params = [tenantId, limit, offset];
    let query = `
      SELECT id, site_id, plant_id, status, closed_at, updated_at
      FROM execution_protocols
      WHERE tenant_id = $1 AND status = 'CLOSED'
    `;
    if (updatedAfter) {
      query += ` AND updated_at > $4`;
      params.push(updatedAfter);
    }
    query += ` ORDER BY updated_at ASC LIMIT $2 OFFSET $3`;
    const result = await pool.query(query, params);
    return result.rows;
  }
}
```

**Characteristics:**

- Real SQL queries
- Seeded test data
- Production-like behavior
- Tests database indexes and performance

### 2. Reportheld Adapter (Future Production)

**File:** To be created at `repository/reportheldAdapterRepository.js`

**Purpose:** Production data from Reportheld platform

```javascript
// FUTURE IMPLEMENTATION
class ReportheldAdapterRepository extends ExecutionProtocolRepository {
  constructor(httpClient, config) {
    super();
    this.client = httpClient;
    this.baseUrl = config.reportheldApiUrl;
    this.apiKey = config.reportheldApiKey;
  }

  async getAllForPolling(tenantId, { updatedAfter, limit, offset }) {
    const response = await this.client.get(`${this.baseUrl}/protocols`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      params: { tenantId, updatedAfter, limit, offset },
    });

    return response.data.protocols.map(this.transformToContract);
  }

  // Transform Reportheld's internal format to our contract
  transformToContract(reportheldProtocol) {
    return {
      id: reportheldProtocol.uuid,
      siteId: reportheldProtocol.site.id,
      // ... map all fields to contract schema
    };
  }
}
```

**Characteristics:**

- HTTP calls to Reportheld API
- Data transformation layer
- Error handling for network issues
- Caching potential

## Dependency Injection

The application wires everything together in `server.js`:

```javascript
// server.js

// Select repository based on configuration
const repository = new PostgresExecutionProtocolRepository();

// Future: when Reportheld is available
// if (process.env.REPOSITORY_TYPE === 'reportheld') {
//   repository = new ReportheldAdapterRepository(httpClient, config);
// }

// Inject into controller
const controller = new ExecutionProtocolController(repository);

// Wire routes
const routes = createExecutionProtocolRoutes(controller);
app.use("/api/v1/execution-protocols", routes);
```

## Configuration

Set the repository type via environment variable:

```bash
# Use PostgreSQL (current)
npm start

# Use Reportheld (future)
REPOSITORY_TYPE=reportheld
```

## Testing Benefits

### Unit Testing (with Mock)

For unit tests, you can create a simple inline mock:

```javascript
describe("ExecutionProtocolController", () => {
  let controller;

  beforeEach(() => {
    const mockRepo = {
      getAllForPolling: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getById: jest.fn().mockResolvedValue(null),
      getSnapshotById: jest.fn().mockResolvedValue(null),
    };
    controller = new ExecutionProtocolController(mockRepo);
  });

  it("returns only tenant protocols", async () => {
    const req = { tenantId: "tenant-acme", query: {} };
    const res = { json: jest.fn() };

    await controller.getAllForPolling(req, res);

    expect(res.json).toHaveBeenCalledWith({
      protocols: expect.any(Array),
      pagination: expect.any(Object),
    });
  });
});
```

### Integration Testing (with PostgreSQL)

```javascript
describe("Integration: Polling Endpoint", () => {
  beforeAll(async () => {
    await runSeedScript();
  });

  it("filters by updatedAfter", async () => {
    const response = await request(app)
      .get("/api/v1/execution-protocols")
      .set("X-API-Key", "test-key-acme")
      .query({ updatedAfter: "2026-02-05T00:00:00Z" });

    expect(response.status).toBe(200);
    expect(response.body.protocols.length).toBe(2);
  });
});
```

## Migration Path

When Reportheld integration is ready:

1. **Create Adapter**

   ```javascript
   // repository/reportheldAdapterRepository.js
   class ReportheldAdapterRepository extends ExecutionProtocolRepository {
     // Implement all interface methods
   }
   ```

2. **Add Configuration**

   ```bash
   # .env
   REPOSITORY_TYPE=reportheld
   REPORTHELD_API_URL=https://api.reportheld.com
   REPORTHELD_API_KEY=secret
   ```

3. **Update server.js**

   ```javascript
   if (process.env.REPOSITORY_TYPE === "reportheld") {
     repository = new ReportheldAdapterRepository(httpClient, config);
   }
   ```

4. **Deploy**
   - No changes to controllers, routes, or API contracts
   - External consumers unaffected
   - Gradual rollout possible (canary deployment)

## Summary

| Aspect                 | Benefit                                      |
| ---------------------- | -------------------------------------------- |
| **Testability**        | Run tests without database or network        |
| **Flexibility**        | Swap data sources without code changes       |
| **Maintainability**    | Single place to change data access logic     |
| **Scalability**        | Add new data sources easily                  |
| **Contract Stability** | API contract unchanged regardless of backend |
