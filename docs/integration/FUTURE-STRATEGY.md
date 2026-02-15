# Future Integration Strategy

## Overview

This API prototype is designed for **seamless migration** to production Reportheld integration. The pluggable architecture means external consumers can integrate now and experience zero disruption when the prototype transitions to live data.

## Current State vs Future State

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURRENT STATE                            │
│                     (Prototype / Staging)                       │
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐  │
│   │  External   │────>│ Integration │────>│  PostgreSQL DB  │  │
│   │  Consumer   │     │     API     │     │  (seeded data)  │  │
│   └─────────────┘     └─────────────┘     └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              │
                              │ Migration
                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                        FUTURE STATE                             │
│                        (Production)                             │
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐  │
│   │  External   │────>│ Integration │────>│   Reportheld    │  │
│   │  Consumer   │     │     API     │     │    Platform     │  │
│   └─────────────┘     └─────────────┘     └─────────────────┘  │
│                                                                 │
│          Same endpoints     Same contract     Live data        │
└─────────────────────────────────────────────────────────────────┘
```

## Migration Path

### Phase 1: Prototype (Current)

**Status:** ✅ Complete

| Component      | Implementation                        |
| -------------- | ------------------------------------- |
| API Contract   | Defined and stable                    |
| Endpoints      | Fully functional                      |
| Authentication | API key based                         |
| Data Source    | PostgreSQL with seeded data           |
| Repository     | `PostgresExecutionProtocolRepository` |

**What works:**

- External consumers can integrate
- Contract is validated
- Polling model is tested
- Multi-tenant isolation is verified

### Phase 2: Reportheld Adapter Development

**Status:** 🔜 Planned

**Tasks:**

1. **Create Adapter Repository**

   ```javascript
   // repository/reportheldAdapterRepository.js

   const ExecutionProtocolRepository = require("./executionProtocolRepository");

   class ReportheldAdapterRepository extends ExecutionProtocolRepository {
     constructor(httpClient, config) {
       super();
       this.client = httpClient;
       this.baseUrl = config.reportheldApiUrl;
       this.apiKey = config.reportheldApiKey;
     }

     async getAllForPolling(tenantId, { updatedAfter, limit, offset }) {
       const response = await this.client.get(`${this.baseUrl}/executions`, {
         headers: {
           Authorization: `Bearer ${this.apiKey}`,
           "X-Tenant-Id": tenantId,
         },
         params: {
           status: "CLOSED",
           updatedAfter,
           limit,
           offset,
         },
       });

       // Transform Reportheld format to our contract
       return response.data.executions.map(this.transformToMetadata);
     }

     async getSnapshotById(tenantId, id) {
       const response = await this.client.get(
         `${this.baseUrl}/executions/${id}/snapshot`,
         {
           headers: {
             Authorization: `Bearer ${this.apiKey}`,
             "X-Tenant-Id": tenantId,
           },
         },
       );

       return this.transformToSnapshot(response.data);
     }

     // Transform internal Reportheld format to stable contract
     transformToMetadata(execution) {
       return {
         id: execution.uuid,
         siteId: execution.location.siteId,
         plantId: execution.equipment.plantId,
         status: execution.state.toUpperCase(),
         closedAt: execution.timestamps.completed,
         updatedAt: execution.timestamps.modified,
       };
     }

     transformToSnapshot(data) {
       return {
         id: data.uuid,
         site: {
           id: data.location.siteId,
           name: data.location.siteName,
         },
         plant: {
           id: data.equipment.plantId,
           name: data.equipment.plantName,
         },
         // ... complete transformation
       };
     }
   }

   module.exports = ReportheldAdapterRepository;
   ```

2. **Add Configuration**

   ```ini
   # .env additions
   REPOSITORY_TYPE=reportheld
   REPORTHELD_API_URL=https://api.reportheld.com/v1
   REPORTHELD_API_KEY=rh_integration_key_xxx
   ```

3. **Update Server Wiring**

   ```javascript
   // server.js addition
   const ReportheldAdapterRepository = require("./repository/reportheldAdapterRepository");
   const axios = require("axios");

   if (REPOSITORY_TYPE === "reportheld") {
     const httpClient = axios.create({ timeout: 30000 });
     repository = new ReportheldAdapterRepository(httpClient, {
       reportheldApiUrl: process.env.REPORTHELD_API_URL,
       reportheldApiKey: process.env.REPORTHELD_API_KEY,
     });
     console.log("🔗 Using Reportheld adapter (production)");
   }
   ```

### Phase 3: Parallel Testing

**Status:** 🔜 Planned

Run both implementations side-by-side to verify correctness:

```javascript
// Verification script
async function verifyAdapter() {
  const pgRepo = new PostgresExecutionProtocolRepository();
  const rhRepo = new ReportheldAdapterRepository(client, config);

  const pgResult = await pgRepo.getAllForPolling("tenant-test", {});
  const rhResult = await rhRepo.getAllForPolling("tenant-test", {});

  // Compare schemas
  const pgSchema = Object.keys(pgResult[0] || {}).sort();
  const rhSchema = Object.keys(rhResult[0] || {}).sort();

  assert.deepEqual(pgSchema, rhSchema, "Schemas must match");
  console.log("✅ Adapter produces correct contract");
}
```

### Phase 4: Production Deployment

**Status:** 🔜 Planned

**Deployment strategy:**

1. **Canary deployment**
   - Route 5% of traffic to Reportheld adapter
   - Monitor for errors and latency

2. **Progressive rollout**
   - Increase traffic: 5% → 25% → 50% → 100%
   - Rollback if issues detected

3. **Full migration**
   - Remove PostgreSQL repository code
   - Archive seeded data
   - Update documentation

## Consumer Migration

### What Consumers Do

**Nothing.** That's the point.

External consumers integrating with this prototype API will experience:

- ✅ Same endpoints
- ✅ Same JSON structure
- ✅ Same authentication
- ✅ Same polling model

### What Consumers May Notice

| Change                     | Impact                         |
| -------------------------- | ------------------------------ |
| Different protocol IDs     | Expected - real vs seeded data |
| More protocols             | Expected - production volume   |
| Different site/plant names | Expected - production data     |
| Slightly different latency | Minor - network to Reportheld  |

## Data Transformation

The adapter must transform Reportheld's internal format to our stable contract.

### Reportheld Format (Example)

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "location": {
    "siteId": "site-001",
    "siteName": "Wind Farm Alpha"
  },
  "equipment": {
    "plantId": "turbine-42",
    "plantName": "Turbine 42"
  },
  "state": "closed",
  "timestamps": {
    "created": "2026-02-01T10:00:00Z",
    "modified": "2026-02-15T14:30:00Z",
    "completed": "2026-02-15T14:00:00Z"
  },
  "protocol": {
    "templateId": "insp-v3",
    "templateName": "Standard Inspection",
    "version": "3.0"
  },
  "assignee": {
    "userId": "user-123",
    "displayName": "Jane Smith",
    "emailAddress": "jane@example.com"
  },
  "results": [
    {
      "sectionId": "s1",
      "sectionLabel": "Visual Inspection",
      "items": [...]
    }
  ],
  "files": [...],
  "summary": {
    "passed": true,
    "issues": [],
    "notes": []
  }
}
```

### Our Contract Format

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "site": {
    "id": "site-001",
    "name": "Wind Farm Alpha"
  },
  "plant": {
    "id": "turbine-42",
    "name": "Turbine 42"
  },
  "template": {
    "id": "insp-v3",
    "name": "Standard Inspection",
    "version": "3.0"
  },
  "inspector": {
    "id": "user-123",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "status": "CLOSED",
  "closedAt": "2026-02-15T14:00:00Z",
  "sections": [...],
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "attachments": [...],
  "report": {...},
  "metadata": {...}
}
```

### Transformation Layer

```javascript
transformToSnapshot(reportheld) {
  return {
    id: reportheld.uuid,
    site: {
      id: reportheld.location.siteId,
      name: reportheld.location.siteName
    },
    plant: {
      id: reportheld.equipment.plantId,
      name: reportheld.equipment.plantName
    },
    template: {
      id: reportheld.protocol.templateId,
      name: reportheld.protocol.templateName,
      version: reportheld.protocol.version
    },
    inspector: {
      id: reportheld.assignee.userId,
      name: reportheld.assignee.displayName,
      email: reportheld.assignee.emailAddress
    },
    status: reportheld.state.toUpperCase(),
    closedAt: reportheld.timestamps.completed,
    sections: this.transformSections(reportheld.results),
    validation: {
      isValid: reportheld.summary.passed,
      errors: reportheld.summary.issues,
      warnings: reportheld.summary.notes
    },
    attachments: this.transformFiles(reportheld.files),
    report: this.generateReportMetadata(reportheld),
    metadata: this.extractMetadata(reportheld)
  };
}
```

## Error Handling

The adapter must handle Reportheld-specific errors:

```javascript
async getSnapshotById(tenantId, id) {
  try {
    const response = await this.client.get(...);
    return this.transformToSnapshot(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Protocol not found
    }
    if (error.response?.status === 403) {
      return null; // Tenant mismatch - treat as not found
    }
    if (error.response?.status === 429) {
      throw new RateLimitError('Reportheld rate limit exceeded');
    }
    throw new IntegrationError(`Reportheld API error: ${error.message}`);
  }
}
```

## Caching Strategy

For production, consider adding caching:

```javascript
const NodeCache = require("node-cache");

class CachedReportheldAdapter extends ReportheldAdapterRepository {
  constructor(httpClient, config) {
    super(httpClient, config);
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minute default TTL
      checkperiod: 60, // Check for expired keys every 60s
    });
  }

  async getSnapshotById(tenantId, id) {
    const cacheKey = `snapshot:${tenantId}:${id}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const snapshot = await super.getSnapshotById(tenantId, id);

    if (snapshot) {
      this.cache.set(cacheKey, snapshot);
    }

    return snapshot;
  }
}
```

## Timeline Estimate

| Phase                 | Duration  | Prerequisites                  |
| --------------------- | --------- | ------------------------------ |
| Prototype Complete    | ✅ Done   | -                              |
| Reportheld API Access | 1-2 weeks | API credentials, documentation |
| Adapter Development   | 2-3 weeks | API access, test environment   |
| Parallel Testing      | 1-2 weeks | Both implementations working   |
| Canary Deployment     | 1 week    | Production access              |
| Full Production       | 1 week    | Canary success                 |

**Total estimated timeline:** 6-10 weeks from Reportheld API access

## Checklist for Production

Before going live:

- [ ] Reportheld API credentials obtained
- [ ] Reportheld API documentation reviewed
- [ ] Adapter repository implemented
- [ ] All contract fields mapped correctly
- [ ] Error handling comprehensive
- [ ] Rate limiting respected
- [ ] Caching strategy implemented
- [ ] Parallel testing completed
- [ ] Performance benchmarks passed
- [ ] Canary deployment successful
- [ ] Rollback procedure documented
- [ ] Monitoring and alerts configured

## Summary

| Aspect          | Current                               | Future                        |
| --------------- | ------------------------------------- | ----------------------------- |
| Data Source     | PostgreSQL (seeded)                   | Reportheld API                |
| Repository      | `PostgresExecutionProtocolRepository` | `ReportheldAdapterRepository` |
| Configuration   | `REPOSITORY_TYPE=postgres`            | `REPOSITORY_TYPE=reportheld`  |
| Consumer Impact | None                                  | None (same contract)          |
| Code Changes    | None in controllers/routes            | Add new repository only       |
