# Security Model

## Overview

This API implements a multi-tenant security model using API key authentication. Each API key is mapped to a specific tenant, ensuring data isolation between organizations.

## Authentication

### API Key Header

All protected endpoints require the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

### How It Works

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Request    │────>│  Auth Middleware│────>│   Handler    │
│              │     │                 │     │              │
│ X-API-Key:   │     │ 1. Extract key  │     │ req.tenantId │
│ acme-key     │     │ 2. Lookup tenant│     │ = "tenant-   │
│              │     │ 3. Set tenantId │     │    acme"     │
└──────────────┘     └─────────────────┘     └──────────────┘
```

### Configuration

API keys are configured via environment variable:

```ini
# .env
API_KEYS={"key-for-acme":"tenant-acme","key-for-globex":"tenant-globex"}
```

Format: JSON object mapping API keys to tenant IDs.

### Middleware Implementation

```javascript
// middleware/authMiddleware.js

const API_KEYS = JSON.parse(process.env.API_KEYS || "{}");

function authMiddleware(req, res, next) {
  const apiKey = req.header("X-API-Key");

  // Check header presence
  if (!apiKey) {
    return res.status(401).json({
      error: "Missing X-API-Key header",
    });
  }

  // Lookup tenant
  const tenantId = API_KEYS[apiKey];

  if (!tenantId) {
    return res.status(401).json({
      error: "Invalid API key",
    });
  }

  // Attach tenant to request
  req.tenantId = tenantId;
  next();
}
```

---

## Tenant Isolation

### Data Access Control

Every database query includes tenant filtering:

```javascript
// Repository query
async getAllForPolling(tenantId, options) {
  const query = `
    SELECT * FROM execution_protocols
    WHERE tenant_id = $1  -- Tenant filter always applied
    AND status = 'CLOSED'
  `;
  return pool.query(query, [tenantId]);
}
```

### Cross-Tenant Protection

| Scenario                              | Result               |
| ------------------------------------- | -------------------- |
| Tenant A requests Tenant A's protocol | ✅ 200 OK            |
| Tenant A requests Tenant B's protocol | ❌ 404 Not Found     |
| Tenant A lists protocols              | Only Tenant A's data |

### Why 404 Instead of 403?

Returning `404 Not Found` for cross-tenant access attempts:

- Prevents information disclosure (attacker can't confirm protocol exists)
- Same response for "doesn't exist" and "exists but not yours"
- Security through obscurity layer

---

## Input Validation

### UUID Validation

Protocol IDs must be valid UUID v4 format:

```javascript
// utils/validation.js

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

Invalid UUID returns `400 Bad Request`:

```json
{
  "error": "Invalid protocol ID format"
}
```

### Query Parameter Validation

| Parameter      | Validation           | Invalid Response       |
| -------------- | -------------------- | ---------------------- |
| `limit`        | 1-100 integer        | Clamped to valid range |
| `offset`       | Non-negative integer | Defaults to 0          |
| `updatedAfter` | ISO 8601 timestamp   | Ignored if invalid     |

---

## Read-Only Operations

### No Write Endpoints

This API only exposes GET endpoints:

| Method | Endpoint                          | Status             |
| ------ | --------------------------------- | ------------------ |
| GET    | `/api/v1/health`                  | ✅ Available       |
| GET    | `/api/v1/execution-protocols`     | ✅ Available       |
| GET    | `/api/v1/execution-protocols/:id` | ✅ Available       |
| POST   | (any)                             | ❌ Not implemented |
| PUT    | (any)                             | ❌ Not implemented |
| DELETE | (any)                             | ❌ Not implemented |

### Why Read-Only?

1. **Integration API** - External consumers only need to read data
2. **Data Integrity** - Source of truth is Reportheld platform
3. **Reduced Attack Surface** - No mutation endpoints to exploit
4. **Simpler Security** - No authorization logic for write permissions

---

## Security Headers

### Recommended Headers (Production)

```javascript
// Add to server.js for production
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  // Strict Transport Security (HTTPS only)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  next();
});
```

---

## Rate Limiting

### Recommended Configuration (Production)

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Rate limit exceeded" },
  headers: true,
  keyGenerator: (req) => req.tenantId || req.ip,
});

app.use("/api/v1/execution-protocols", limiter);
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708000000
```

---

## HTTPS/TLS

### Development

HTTP is acceptable for local development:

```
http://localhost:4001
```

### Production

**HTTPS is mandatory** for production:

```
https://api.your-domain.com
```

Options:

1. **Reverse Proxy** (nginx, Caddy, Traefik) - handles TLS termination
2. **Cloud Load Balancer** (AWS ALB, GCP LB) - manages certificates
3. **Platform Service** (Heroku, Railway) - automatic HTTPS

---

## API Key Best Practices

### Generation

```javascript
// Generate secure API key
const crypto = require("crypto");
const apiKey = crypto.randomBytes(32).toString("hex");
// Example: a1b2c3d4e5f6...
```

### Distribution

1. Generate unique key per client/integration
2. Share via secure channel (not email)
3. Document key rotation procedure
4. Monitor key usage

### Storage

| Environment | Storage Method                                 |
| ----------- | ---------------------------------------------- |
| Development | `.env` file (gitignored)                       |
| Staging     | Environment variables                          |
| Production  | Secrets manager (AWS Secrets, HashiCorp Vault) |

### Rotation

```bash
# Add new key first (old key still works)
API_KEYS='{"old-key":"tenant","new-key":"tenant"}'

# Update clients to use new key

# Remove old key after transition
API_KEYS='{"new-key":"tenant"}'
```

---

## Threat Model

### Addressed Threats

| Threat                    | Mitigation                          |
| ------------------------- | ----------------------------------- |
| Unauthorized access       | API key authentication              |
| Cross-tenant data leakage | Tenant ID filtering on all queries  |
| SQL injection             | Parameterized queries               |
| Invalid input             | UUID validation, input sanitization |
| Information disclosure    | 404 for forbidden resources         |
| Excessive requests        | Rate limiting (recommended)         |
| Man-in-the-middle         | HTTPS/TLS (required for production) |

### Not Addressed (Out of Scope)

| Threat                      | Reason                                 |
| --------------------------- | -------------------------------------- |
| Key compromise              | Client responsibility to secure keys   |
| DDoS                        | Infrastructure-level protection needed |
| Insider threat              | Organizational policy                  |
| API key rotation automation | Client implementation                  |

---

## Audit Logging (Recommended)

For production, add request logging:

```javascript
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        tenantId: req.tenantId,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      }),
    );
  });

  next();
});
```

---

## Summary

| Security Layer     | Implementation                      |
| ------------------ | ----------------------------------- |
| Authentication     | API key in `X-API-Key` header       |
| Authorization      | Tenant-based data isolation         |
| Input Validation   | UUID format, query parameter bounds |
| Transport Security | HTTPS required in production        |
| Data Protection    | Read-only API, no mutations         |
| Rate Limiting      | 100 requests/minute (recommended)   |
