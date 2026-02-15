# API Contract

## Overview

This document defines the stable API contract for the Execution Protocol Integration API. External consumers should rely on this contract for integration development.

## Base URL

```
http://localhost:4001/api/v1
```

Production URL (future):

```
https://api.your-domain.com/api/v1
```

## Authentication

All endpoints (except health check) require API key authentication.

### Request Header

```
X-API-Key: <your-api-key>
```

### Error Response

```json
{
  "error": "Missing X-API-Key header"
}
```

Status: `401 Unauthorized`

---

## Endpoints

### Health Check

Check if the API is running.

```
GET /api/v1/health
```

**Authentication:** Not required

**Response:**

```json
{
  "status": "ok",
  "service": "Execution Protocol Integration API",
  "version": "1.0.0",
  "timestamp": "2026-02-15T12:00:00.000Z"
}
```

---

### List Execution Protocols

Get a paginated list of CLOSED execution protocols for polling-based consumption.

```
GET /api/v1/execution-protocols
```

**Authentication:** Required

**Query Parameters:**

| Parameter      | Type     | Required | Default | Description                                   |
| -------------- | -------- | -------- | ------- | --------------------------------------------- |
| `updatedAfter` | ISO 8601 | No       | -       | Filter protocols updated after this timestamp |
| `limit`        | integer  | No       | 50      | Max results (1-100)                           |
| `offset`       | integer  | No       | 0       | Skip N results                                |

**Example Request:**

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4001/api/v1/execution-protocols?updatedAfter=2026-02-01T00:00:00Z&limit=10"
```

**Response:**

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
    "limit": 10,
    "offset": 0,
    "count": 1,
    "hasMore": false
  }
}
```

**Protocol Metadata Schema:**

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `id`        | UUID     | Unique protocol identifier           |
| `siteId`    | string   | Site reference identifier            |
| `plantId`   | string   | Equipment/plant reference identifier |
| `status`    | string   | Always `"CLOSED"`                    |
| `closedAt`  | ISO 8601 | When protocol was finalized          |
| `updatedAt` | ISO 8601 | Last update timestamp (for polling)  |

---

### Get Execution Protocol Snapshot

Get the full snapshot JSON for a specific protocol.

```
GET /api/v1/execution-protocols/:id
```

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| `id`      | UUID | Protocol identifier |

**Example Request:**

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440001"
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "site": {
    "id": "site-l3-berlin",
    "name": "Site L3 Berlin"
  },
  "plant": {
    "id": "plant-t17",
    "name": "Wind Turbine 17"
  },
  "template": {
    "id": "template-inspection-v2",
    "name": "Standard Inspection Protocol",
    "version": "2.1"
  },
  "inspector": {
    "id": "inspector-mueller",
    "name": "Hans Mueller",
    "email": "h.mueller@example.com"
  },
  "status": "CLOSED",
  "closedAt": "2026-02-01T14:30:00.000Z",
  "sections": [
    {
      "id": "section-visual",
      "title": "Visual Inspection",
      "fields": [
        {
          "fieldId": "field-blade-condition",
          "label": "Blade Condition",
          "type": "select",
          "value": "good",
          "valid": true,
          "required": true
        }
      ]
    }
  ],
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "attachments": [
    {
      "id": "att-001",
      "filename": "blade_photo.jpg",
      "url": "https://storage.example.com/attachments/blade_photo.jpg",
      "type": "image/jpeg",
      "size": 245000,
      "uploadedAt": "2026-02-01T14:00:00.000Z"
    }
  ],
  "report": {
    "url": "https://storage.example.com/reports/protocol-001.pdf",
    "generatedAt": "2026-02-01T14:35:00.000Z",
    "format": "PDF",
    "size": 1250000
  },
  "metadata": {
    "executionDurationMinutes": 45,
    "completedSteps": 12,
    "totalSteps": 12,
    "appVersion": "3.2.1"
  }
}
```

**Error Responses:**

| Status | Response                                  | Description                            |
| ------ | ----------------------------------------- | -------------------------------------- |
| `400`  | `{"error": "Invalid protocol ID format"}` | UUID format invalid                    |
| `404`  | `{"error": "Protocol not found"}`         | Protocol doesn't exist or wrong tenant |

---

### Get Execution Protocol Snapshot (Alias)

Alternative endpoint for snapshot retrieval.

```
GET /api/v1/execution-protocols/:id/snapshot
```

Same behavior as `GET /api/v1/execution-protocols/:id`.

---

## Snapshot Schema

### Full Schema Definition

```typescript
interface ExecutionProtocolSnapshot {
  // Identity
  id: string; // UUID v4

  // Location
  site: {
    id: string;
    name: string;
  };

  // Equipment
  plant: {
    id: string;
    name: string;
  };

  // Protocol Template
  template: {
    id: string;
    name: string;
    version: string;
  };

  // Assignee
  inspector: {
    id: string;
    name: string;
    email: string;
  };

  // Status
  status: "CLOSED"; // Always CLOSED via this API
  closedAt: string; // ISO 8601 timestamp

  // Content
  sections: Section[];

  // Validation
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  // Files
  attachments: Attachment[];

  // Generated Report
  report: {
    url: string;
    generatedAt: string; // ISO 8601
    format: "PDF";
    size: number; // bytes
  };

  // Execution Metadata
  metadata: {
    executionDurationMinutes: number;
    completedSteps: number;
    totalSteps: number;
    appVersion: string;
    priority?: "low" | "medium" | "high";
  };
}

interface Section {
  id: string;
  title: string;
  fields: Field[];
}

interface Field {
  fieldId: string;
  label: string;
  type: "boolean" | "text" | "select" | "date" | "number";
  value: any;
  valid: boolean;
  required: boolean;
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  type: string; // MIME type
  size: number; // bytes
  uploadedAt: string; // ISO 8601
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message describing the issue"
}
```

### HTTP Status Codes

| Code  | Meaning      | When                                      |
| ----- | ------------ | ----------------------------------------- |
| `200` | Success      | Request completed successfully            |
| `400` | Bad Request  | Invalid input (UUID format, query params) |
| `401` | Unauthorized | Missing or invalid API key                |
| `404` | Not Found    | Protocol doesn't exist or tenant mismatch |
| `500` | Server Error | Internal server error                     |

---

## Rate Limiting

| Limit                | Value |
| -------------------- | ----- |
| Requests per minute  | 100   |
| Pagination max limit | 100   |

Rate limit headers (when implemented):

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708000000
```

---

## Versioning

The API uses URL path versioning:

```
/api/v1/execution-protocols
```

Breaking changes will increment the version:

```
/api/v2/execution-protocols
```

---

## CORS

For browser-based clients, CORS headers are included:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: X-API-Key, Content-Type
```

---

## Examples

### Poll for New Protocols (Node.js)

```javascript
const axios = require("axios");

async function pollProtocols(lastSyncedAt) {
  const response = await axios.get(
    "http://localhost:4001/api/v1/execution-protocols",
    {
      headers: { "X-API-Key": "your-api-key" },
      params: {
        updatedAfter: lastSyncedAt,
        limit: 100,
      },
    },
  );

  return response.data;
}
```

### Fetch Full Snapshot (Python)

```python
import requests

def get_snapshot(protocol_id):
    response = requests.get(
        f'http://localhost:4001/api/v1/execution-protocols/{protocol_id}',
        headers={'X-API-Key': 'your-api-key'}
    )

    response.raise_for_status()
    return response.json()
```

### Incremental Sync (curl)

```bash
# First sync (no cursor)
curl -H "X-API-Key: your-key" \
  "http://localhost:4001/api/v1/execution-protocols" \
  > protocols.json

# Extract max updatedAt
CURSOR=$(jq -r '.protocols | map(.updatedAt) | max' protocols.json)

# Subsequent syncs
curl -H "X-API-Key: your-key" \
  "http://localhost:4001/api/v1/execution-protocols?updatedAfter=$CURSOR"
```
