# Testing Guide

This guide walks you through testing the API step by step, from basic health checks to full integration scenarios.

## Quick Reference

| Endpoint                                   | Method | Auth Required | Purpose                  |
| ------------------------------------------ | ------ | ------------- | ------------------------ |
| `/api/v1/health`                           | GET    | No            | Health check             |
| `/api/v1/execution-protocols`              | GET    | Yes           | List protocols (polling) |
| `/api/v1/execution-protocols/:id`          | GET    | Yes           | Get full snapshot        |
| `/api/v1/execution-protocols/:id/snapshot` | GET    | Yes           | Get snapshot (alias)     |

## Setup for Testing

### Prerequisites

1. Server running: `npm start`
2. API key configured in `.env`:
   ```ini
   API_KEYS={"test-key-acme":"tenant-acme","test-key-globex":"tenant-globex"}
   ```

### Test Data

The database is seeded with 5 protocols:

- 3 protocols for `tenant-acme`
- 2 protocols for `tenant-globex`
- IDs: `550e8400-e29b-41d4-a716-446655440001` through `...440005`

Setup:

```bash
docker compose up -d
docker exec proto-api node scripts/initDatabase.js
docker exec proto-api node scripts/seedDatabase.js
```

---

## Test 1: Health Check

Verify the server is running.

### curl

```bash
curl http://localhost:4001/api/v1/health
```

### PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Expected Response

```json
{
  "status": "ok",
  "service": "Execution Protocol Integration API",
  "version": "1.0.0",
  "timestamp": "2026-02-15T12:00:00.000Z"
}
```

✅ **Pass if:** Status is `200 OK` and `status` is `"ok"`

---

## Test 2: Authentication Required

Verify authentication is enforced.

### curl (No API Key)

```bash
curl http://localhost:4001/api/v1/execution-protocols
```

### Expected Response

```json
{
  "error": "Missing X-API-Key header"
}
```

Status: `401 Unauthorized`

### curl (Invalid API Key)

```bash
curl -H "X-API-Key: invalid-key" http://localhost:4001/api/v1/execution-protocols
```

### Expected Response

```json
{
  "error": "Invalid API key"
}
```

Status: `401 Unauthorized`

✅ **Pass if:** Both return `401` with appropriate error messages

---

## Test 3: List Protocols

Get all protocols for a tenant.

### curl

```bash
curl -H "X-API-Key: test-key-acme" http://localhost:4001/api/v1/execution-protocols
```

### PowerShell

```powershell
$headers = @{'X-API-Key'='test-key-acme'}
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/execution-protocols" -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Expected Response

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
    },
    ...
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 3,
    "hasMore": false
  }
}
```

✅ **Pass if:**

- Status is `200 OK`
- Returns array of protocols
- Only contains `tenant-acme` protocols (3 protocols)
- All have `status: "CLOSED"`

---

## Test 4: Tenant Isolation

Verify tenants only see their own data.

### Test tenant-acme

```bash
curl -H "X-API-Key: test-key-acme" http://localhost:4001/api/v1/execution-protocols
```

Expected: 3 protocols

### Test tenant-globex

```bash
curl -H "X-API-Key: test-key-globex" http://localhost:4001/api/v1/execution-protocols
```

Expected: 2 protocols

### Cross-tenant access attempt

```bash
# Try to access tenant-acme's protocol with tenant-globex's key
curl -H "X-API-Key: test-key-globex" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440001
```

### Expected Response

```json
{
  "error": "Protocol not found"
}
```

Status: `404 Not Found`

✅ **Pass if:** Each tenant only sees their own protocols, cross-tenant access returns 404

---

## Test 5: Get Protocol Snapshot

Retrieve full protocol details.

### curl

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440001
```

### PowerShell

```powershell
$headers = @{'X-API-Key'='test-key-acme'}
$id = "550e8400-e29b-41d4-a716-446655440001"
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/execution-protocols/$id" -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Expected Response

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

✅ **Pass if:**

- Status is `200 OK`
- Full snapshot JSON returned
- Contains all expected fields (site, plant, template, sections, etc.)

---

## Test 6: UUID Validation

Verify invalid UUIDs are rejected.

### Invalid UUID format

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/not-a-uuid
```

### Expected Response

```json
{
  "error": "Invalid protocol ID format"
}
```

Status: `400 Bad Request`

### Non-existent UUID

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/00000000-0000-0000-0000-000000000000
```

### Expected Response

```json
{
  "error": "Protocol not found"
}
```

Status: `404 Not Found`

✅ **Pass if:** Invalid format returns 400, non-existent returns 404

---

## Test 7: Polling with updatedAfter Filter

Test incremental synchronization.

### Get all protocols first

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols
```

Note the `updatedAt` values.

### Filter by timestamp

```bash
# With seeded data, filter for protocols updated after Feb 5, 2026
curl -H "X-API-Key: test-key-acme" \
  "http://localhost:4001/api/v1/execution-protocols?updatedAfter=2026-02-05T00:00:00Z"
```

### PowerShell

```powershell
$headers = @{'X-API-Key'='test-key-acme'}
$timestamp = "2026-02-05T00:00:00Z"
Invoke-WebRequest -Uri "http://localhost:4001/api/v1/execution-protocols?updatedAfter=$timestamp" -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Expected Behavior

| Timestamp              | Expected Result (seeded data)   |
| ---------------------- | ------------------------------- |
| Not provided           | All 3 protocols for tenant-acme |
| `2026-02-01T00:00:00Z` | All 3 protocols                 |
| `2026-02-05T00:00:00Z` | 2 protocols (Feb 6, Feb 13)     |
| `2026-02-10T00:00:00Z` | 1 protocol (Feb 13 only)        |
| `2026-02-20T00:00:00Z` | 0 protocols                     |

✅ **Pass if:** Filter correctly reduces result set based on timestamp

---

## Test 8: Pagination

Test limit and offset parameters.

### First page

```bash
curl -H "X-API-Key: test-key-acme" \
  "http://localhost:4001/api/v1/execution-protocols?limit=1&offset=0"
```

### Second page

```bash
curl -H "X-API-Key: test-key-acme" \
  "http://localhost:4001/api/v1/execution-protocols?limit=1&offset=1"
```

### Expected Response (first page)

```json
{
  "protocols": [
    { "id": "...", ... }
  ],
  "pagination": {
    "limit": 1,
    "offset": 0,
    "count": 1,
    "hasMore": true
  }
}
```

✅ **Pass if:**

- `limit` is respected
- `offset` skips correct number
- `hasMore` indicates more pages available

---

## Test 9: Validation States (PostgreSQL only)

With seeded data, test protocols with different validation states.

### Valid protocol

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440001
```

```json
{
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

### Valid with warnings

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440002
```

```json
{
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": ["Temperature sensor calibration recommended"]
  }
}
```

### Invalid protocol

```bash
curl -H "X-API-Key: test-key-acme" \
  http://localhost:4001/api/v1/execution-protocols/550e8400-e29b-41d4-a716-446655440004
```

```json
{
  "validation": {
    "isValid": false,
    "errors": ["Blade damage detected - immediate maintenance required"],
    "warnings": []
  },
  "metadata": {
    "priority": "high"
  }
}
```

✅ **Pass if:** Different validation states are correctly represented

---

## Test Summary Checklist

| #   | Test                | Status |
| --- | ------------------- | ------ |
| 1   | Health check        | ✅     |
| 2   | Auth required       | ✅     |
| 3   | List protocols      | ✅     |
| 4   | Tenant isolation    | ✅     |
| 5   | Get snapshot        | ✅     |
| 6   | UUID validation     | ✅     |
| 7   | updatedAfter filter | ✅     |
| 8   | Pagination          | ✅     |
| 9   | Validation states   | ✅     |

---

## Automated Testing Script

Save as `test-api.sh`:

```bash
#!/bin/bash
set -e

API_URL="http://localhost:4001/api/v1"
API_KEY="test-key-acme"
PROTOCOL_ID="550e8400-e29b-41d4-a716-446655440001"

echo "=== Testing Execution Protocol Integration API ==="
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
curl -s "$API_URL/health" | jq .status
echo ""

# Test 2: Auth required
echo "Test 2: Auth Required (expect 401)"
curl -s -o /dev/null -w "%{http_code}" "$API_URL/execution-protocols"
echo ""

# Test 3: List protocols
echo "Test 3: List Protocols"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/execution-protocols" | jq '.protocols | length'
echo ""

# Test 4: Get snapshot
echo "Test 4: Get Snapshot"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/execution-protocols/$PROTOCOL_ID" | jq '.id'
echo ""

# Test 5: Invalid UUID
echo "Test 5: Invalid UUID (expect 400)"
curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $API_KEY" "$API_URL/execution-protocols/invalid"
echo ""

echo "=== All tests completed ==="
```

Run:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## PowerShell Testing Script

Save as `Test-Api.ps1`:

```powershell
$ApiUrl = "http://localhost:4001/api/v1"
$ApiKey = "test-key-acme"
$ProtocolId = "550e8400-e29b-41d4-a716-446655440001"
$Headers = @{'X-API-Key'=$ApiKey}

Write-Host "=== Testing Execution Protocol Integration API ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`nTest 1: Health Check" -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing |
  Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "Status: $($health.status)" -ForegroundColor Green

# Test 2: Auth required
Write-Host "`nTest 2: Auth Required (expect 401)" -ForegroundColor Yellow
try {
  Invoke-WebRequest -Uri "$ApiUrl/execution-protocols" -UseBasicParsing -ErrorAction Stop
} catch {
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
}

# Test 3: List protocols
Write-Host "`nTest 3: List Protocols" -ForegroundColor Yellow
$list = Invoke-WebRequest -Uri "$ApiUrl/execution-protocols" -Headers $Headers -UseBasicParsing |
  Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "Count: $($list.protocols.Count)" -ForegroundColor Green

# Test 4: Get snapshot
Write-Host "`nTest 4: Get Snapshot" -ForegroundColor Yellow
$snapshot = Invoke-WebRequest -Uri "$ApiUrl/execution-protocols/$ProtocolId" -Headers $Headers -UseBasicParsing |
  Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "ID: $($snapshot.id)" -ForegroundColor Green

# Test 5: Invalid UUID
Write-Host "`nTest 5: Invalid UUID (expect 400)" -ForegroundColor Yellow
try {
  Invoke-WebRequest -Uri "$ApiUrl/execution-protocols/invalid" -Headers $Headers -UseBasicParsing -ErrorAction Stop
} catch {
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
}

Write-Host "`n=== All tests completed ===" -ForegroundColor Cyan
```

Run:

```powershell
.\Test-Api.ps1
```

---

## Using Postman

### Import Collection

1. Open Postman
2. Import → Raw Text
3. Paste:

```json
{
  "info": {
    "name": "Execution Protocol API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:4001/api/v1" },
    { "key": "apiKey", "value": "test-key-acme" }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "List Protocols",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/execution-protocols",
        "header": [{ "key": "X-API-Key", "value": "{{apiKey}}" }]
      }
    },
    {
      "name": "Get Protocol",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/execution-protocols/550e8400-e29b-41d4-a716-446655440001",
        "header": [{ "key": "X-API-Key", "value": "{{apiKey}}" }]
      }
    }
  ]
}
```

4. Set environment variables and run
