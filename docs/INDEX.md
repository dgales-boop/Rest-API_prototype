# Documentation Index

Welcome to the Execution Protocol Integration API documentation.

## Quick Navigation

### Getting Started

Start here if you're new to the project:

1. [Getting Started Guide](guides/GETTING-STARTED.md) - Setup and installation
2. [Testing Guide](guides/TESTING.md) - How to test the API endpoints
3. [API Contract](api/CONTRACT.md) - Full API specification
4. [n8n Integration](guides/N8N-INTEGRATION.md) - Import and run the n8n polling workflow

### Understanding the Architecture

Learn how and why things are built this way:

1. [Architecture Overview](architecture/OVERVIEW.md) - System design and components
2. [Adapter Pattern](architecture/ADAPTER-PATTERN.md) - Repository pattern for swappable data sources
3. [Polling Model](architecture/POLLING-MODEL.md) - Why polling instead of webhooks

### API Reference

Technical specifications:

1. [API Contract](api/CONTRACT.md) - Endpoints, schemas, examples
2. [Security Model](api/SECURITY.md) - Authentication and authorization

### Future Development

Planning for production:

1. [Future Strategy](integration/FUTURE-STRATEGY.md) - Reportheld integration roadmap

---

## Document Map

```
docs/
├── INDEX.md                          ← You are here
│
├── architecture/
│   ├── OVERVIEW.md                   # System architecture
│   ├── ADAPTER-PATTERN.md            # Repository pattern
│   └── POLLING-MODEL.md              # Polling vs webhooks
│
├── guides/
│   ├── GETTING-STARTED.md            # Setup instructions
│   ├── TESTING.md                    # Testing guide
│   └── N8N-INTEGRATION.md           # n8n workflow setup
│
├── api/
│   ├── CONTRACT.md                   # API specification
│   └── SECURITY.md                   # Security model
│
└── integration/
    └── FUTURE-STRATEGY.md            # Reportheld integration
```

---

## Key Concepts

### What Is This API?

A **Contract-First Integration Prototype** that:

- Exposes execution protocol data via REST endpoints
- Uses polling for incremental synchronization
- Supports multi-tenant data isolation
- Is designed for future Reportheld integration

### Who Uses This API?

External systems that need to consume finalized protocol data:

- **ERP Systems** - Import inspection results
- **n8n Workflows** - Automate data processing
- **AI Tools** - Analyze protocol content
- **Data Warehouses** - Archive and report

### How Does It Work?

```
1. Consumer polls:     GET /execution-protocols?updatedAfter=<timestamp>
2. API returns:        List of protocol metadata
3. Consumer fetches:   GET /execution-protocols/:id for each new protocol
4. Consumer stores:    Save snapshot, update timestamp cursor
5. Repeat
```

### Why Seeded Data?

This is a **prototype** using PostgreSQL with seeded test data that:

- Validates the API contract before production
- Enables integration development in parallel
- Tests consumer implementations with realistic database behavior

When Reportheld integration is ready, we swap the data source (PostgreSQL → Reportheld adapter) without changing the API contract.

---

## Frequently Asked Questions

### How do I start the server?

```bash
# Start PostgreSQL
docker compose -f data/docker-compose.yml up -d

# Set up database
npm run db:init
npm run db:seed

# Start
npm start
```

### How do I test the API?

```bash
curl -H "X-API-Key: test-key-acme" http://localhost:4001/api/v1/execution-protocols
```

See [Testing Guide](guides/TESTING.md) for comprehensive test scenarios.

### Why is this read-only?

External consumers need to **read** finalized data, not modify it. The source of truth is the Reportheld platform.

### Why polling instead of webhooks?

- Simpler implementation (no retry logic, no public URLs needed)
- Consumer-controlled timing
- Works behind corporate firewalls
- See [Polling Model](architecture/POLLING-MODEL.md) for details

### When will Reportheld integration be ready?

See [Future Strategy](integration/FUTURE-STRATEGY.md) for the integration roadmap.

---

## Contributing

### Adding Documentation

1. Create markdown file in appropriate directory
2. Update this index
3. Link from relevant documents

### Documentation Standards

- Use clear headings (H1 for title, H2 for sections)
- Include code examples
- Add tables for reference data
- Keep language professional and concise
