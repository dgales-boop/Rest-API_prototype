const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Initialize database — create execution_protocols table if it doesn't exist.
 */
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS execution_protocols (
        id UUID PRIMARY KEY,
        site_id VARCHAR(255) NOT NULL,
        plant_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'CLOSED',
        snapshot JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      -- Index for efficient polling queries
      CREATE INDEX IF NOT EXISTS idx_execution_protocols_polling 
        ON execution_protocols(tenant_id, status, updated_at);
      
      -- Index for tenant isolation
      CREATE INDEX IF NOT EXISTS idx_execution_protocols_tenant 
        ON execution_protocols(tenant_id);
    `);
    console.log("✅ Database initialized — execution_protocols table ready");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
