# Polling Model

## Overview

This API uses a **polling-based consumption model** rather than webhooks or real-time subscriptions. External consumers periodically request new or updated data, rather than receiving push notifications.

## Why Polling?

### Trade-off Analysis

| Approach       | Pros                                                  | Cons                                                                      |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| **Webhooks**   | Real-time updates, low latency                        | Complex retry logic, receiver must be always-on, delivery guarantees hard |
| **WebSockets** | True real-time, bidirectional                         | Stateful connections, scaling complexity, mobile unfriendly               |
| **Polling**    | Simple implementation, consumer-controlled, stateless | Higher latency, more requests                                             |

### Reasons for Choosing Polling

1. **Consumer Simplicity**
   - No need to expose public endpoints
   - No webhook signature validation
   - Consumer controls update frequency

2. **Reliability**
   - No lost events if consumer is down
   - No retry queue management
   - Idempotent requests

3. **Firewall Friendly**
   - Outbound-only connections
   - Works behind corporate firewalls
   - No ingress rules needed

4. **Integration Context**
   - Execution protocols finalize infrequently (not real-time critical)
   - Latency of minutes is acceptable for downstream processing
   - Consumers (ERP, DWH) typically batch process anyway

## How Polling Works

### Sequence Diagram

```
┌──────────────┐                    ┌──────────────────┐
│   Consumer   │                    │  Integration API │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       │  Store: lastSyncedAt = null         │
       │                                     │
       │  ──────────────────────────────────>│
       │  GET /execution-protocols           │
       │  ?updatedAfter=<lastSyncedAt>       │
       │                                     │
       │  <──────────────────────────────────│
       │  { protocols: [{id, updatedAt}...]} │
       │                                     │
       │  For each protocol:                 │
       │  ──────────────────────────────────>│
       │  GET /execution-protocols/:id       │
       │                                     │
       │  <──────────────────────────────────│
       │  { full snapshot JSON }             │
       │                                     │
       │  Process snapshot...                │
       │  Update: lastSyncedAt = max(updatedAt)
       │                                     │
       │  Wait 5 minutes...                  │
       │                                     │
       │  ──────────────────────────────────>│
       │  GET /execution-protocols           │
       │  ?updatedAfter=<lastSyncedAt>       │
       │  (repeat)                           │
       │                                     │
```

### State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMER STATE MACHINE                   │
│                                                             │
│  ┌─────────┐     ┌──────────┐     ┌─────────────────────┐  │
│  │  IDLE   │────>│  POLL    │────>│  FETCH SNAPSHOTS    │  │
│  │         │     │  LIST    │     │  (for new protocols)│  │
│  └─────────┘     └──────────┘     └─────────────────────┘  │
│       ▲                                     │              │
│       │                                     │              │
│       │          ┌──────────┐               │              │
│       └──────────│  WAIT    │<──────────────┘              │
│     (5 min)      │  (timer) │                              │
│                  └──────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Consumer Example (n8n / Node.js)

```javascript
const axios = require("axios");

class ProtocolPoller {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.lastSyncedAt = null; // Persist this between restarts!
  }

  async poll() {
    // 1. Get list of updated protocols
    const listResponse = await axios.get(`${this.apiUrl}/execution-protocols`, {
      headers: { "X-API-Key": this.apiKey },
      params: {
        updatedAfter: this.lastSyncedAt,
        limit: 100,
      },
    });

    const protocols = listResponse.data.protocols;

    if (protocols.length === 0) {
      console.log("No new protocols");
      return;
    }

    // 2. Fetch full snapshot for each
    for (const protocol of protocols) {
      const snapshotResponse = await axios.get(
        `${this.apiUrl}/execution-protocols/${protocol.id}`,
        { headers: { "X-API-Key": this.apiKey } },
      );

      // 3. Process the snapshot
      await this.processSnapshot(snapshotResponse.data);

      // 4. Update cursor
      if (protocol.updatedAt > this.lastSyncedAt) {
        this.lastSyncedAt = protocol.updatedAt;
        await this.persistCursor(this.lastSyncedAt);
      }
    }
  }

  async processSnapshot(snapshot) {
    // Send to ERP, data warehouse, etc.
    console.log(`Processing protocol ${snapshot.id}`);
  }

  async persistCursor(timestamp) {
    // Store in database, file, etc.
  }

  async start(intervalMs = 300000) {
    // 5 minutes
    await this.poll();
    setInterval(() => this.poll(), intervalMs);
  }
}
```

### Consumer Example (curl / Shell Script)

```bash
#!/bin/bash

API_URL="http://localhost:4001/api/v1"
API_KEY="test-key-acme"
CURSOR_FILE=".last_synced_at"

# Read last sync timestamp
LAST_SYNCED=""
if [ -f "$CURSOR_FILE" ]; then
  LAST_SYNCED=$(cat "$CURSOR_FILE")
fi

# Build URL
URL="$API_URL/execution-protocols?limit=100"
if [ -n "$LAST_SYNCED" ]; then
  URL="$URL&updatedAfter=$LAST_SYNCED"
fi

# Poll for updates
echo "Polling: $URL"
RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$URL")

# Parse response
PROTOCOL_IDS=$(echo "$RESPONSE" | jq -r '.protocols[].id')

# Fetch each snapshot
for ID in $PROTOCOL_IDS; do
  echo "Fetching snapshot: $ID"
  SNAPSHOT=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/execution-protocols/$ID")

  # Process snapshot (example: save to file)
  echo "$SNAPSHOT" > "snapshots/$ID.json"

  # Update cursor
  UPDATED_AT=$(echo "$RESPONSE" | jq -r ".protocols[] | select(.id==\"$ID\") | .updatedAt")
  echo "$UPDATED_AT" > "$CURSOR_FILE"
done

echo "Done. Next poll in 5 minutes."
```

## The `updatedAfter` Filter

### Purpose

The `updatedAfter` query parameter enables **incremental synchronization**:

```
GET /api/v1/execution-protocols?updatedAfter=2026-02-10T00:00:00Z
```

### Behavior

| Scenario                     | Result                                    |
| ---------------------------- | ----------------------------------------- |
| `updatedAfter` not provided  | Returns all CLOSED protocols              |
| `updatedAfter` in the past   | Returns protocols updated since that time |
| `updatedAfter` in the future | Returns empty array                       |

### Example

```bash
# First poll (no cursor) - gets all protocols
curl -H "X-API-Key: test-key" \
  "http://localhost:4001/api/v1/execution-protocols"
# Returns: protocols from Feb 1, 2, 5, 10, 15

# Remember max updatedAt: 2026-02-15T00:00:00Z

# Second poll (with cursor) - gets only new ones
curl -H "X-API-Key: test-key" \
  "http://localhost:4001/api/v1/execution-protocols?updatedAfter=2026-02-15T00:00:00Z"
# Returns: empty (nothing new)

# After some time, new protocol arrives with updatedAt: 2026-02-16T10:00:00Z

# Third poll
curl -H "X-API-Key: test-key" \
  "http://localhost:4001/api/v1/execution-protocols?updatedAfter=2026-02-15T00:00:00Z"
# Returns: the new protocol from Feb 16
```

## Pagination

### Parameters

| Parameter | Type    | Default | Max | Description                |
| --------- | ------- | ------- | --- | -------------------------- |
| `limit`   | integer | 50      | 100 | Max protocols per response |
| `offset`  | integer | 0       | -   | Skip N protocols           |

### Example

```bash
# Page 1
curl "http://localhost:4001/api/v1/execution-protocols?limit=10&offset=0"

# Page 2
curl "http://localhost:4001/api/v1/execution-protocols?limit=10&offset=10"

# Page 3
curl "http://localhost:4001/api/v1/execution-protocols?limit=10&offset=20"
```

### Response

```json
{
  "protocols": [ ... ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 10,
    "hasMore": true
  }
}
```

## Best Practices

### Polling Interval

| Use Case             | Recommended Interval  |
| -------------------- | --------------------- |
| Real-time dashboards | 30 seconds - 1 minute |
| Business workflows   | 5 - 15 minutes        |
| Data warehousing     | 1 - 6 hours           |
| Compliance archival  | Daily                 |

### Cursor Management

**DO:**

- Persist cursor to survive restarts
- Use max `updatedAt` from results as cursor
- Handle empty results gracefully

**DON'T:**

- Use current time as cursor (might miss concurrent updates)
- Rely on in-memory cursor only
- Poll more frequently than needed

### Error Handling

```javascript
async function pollWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await poll();
      return;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Retry ${attempt} in ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

## Comparison: Polling vs Webhooks

### This API (Polling)

```
Consumer                          API
   │                               │
   │ GET /protocols?updatedAfter=  │
   │ ─────────────────────────────>│
   │                               │
   │ { protocols: [...] }          │
   │ <─────────────────────────────│
   │                               │
   │ (wait 5 min, repeat)          │
```

**Consumer responsibility:**

- Schedule polling
- Track cursor
- Handle pagination

**API responsibility:**

- Filter and paginate data
- Maintain updated_at timestamps

### Alternative (Webhooks - NOT implemented)

```
Producer                         Consumer
   │                               │
   │ POST /webhook                 │
   │ { event: "protocol.closed" }  │
   │ ─────────────────────────────>│
   │                               │
   │ 200 OK                        │
   │ <─────────────────────────────│
```

**Producer responsibility:**

- Track subscribers
- Retry failed deliveries
- Sign payloads
- Manage delivery queues

**Consumer responsibility:**

- Expose public endpoint
- Verify signatures
- Handle duplicates
- Return 200 quickly

## Summary

| Aspect         | Implementation                          |
| -------------- | --------------------------------------- |
| **Model**      | Consumer-initiated polling              |
| **Filter**     | `updatedAfter` ISO timestamp            |
| **Pagination** | `limit` (max 100), `offset`             |
| **Ordering**   | Ascending by `updatedAt`                |
| **Cursor**     | Consumer stores max `updatedAt`         |
| **Interval**   | Consumer-controlled (5 min recommended) |
