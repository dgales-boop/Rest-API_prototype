const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Initialize database — create protocol_executions table if it doesn't exist.
 */
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS protocol_executions (
        id UUID PRIMARY KEY,
        protocol_id VARCHAR(255) NOT NULL,
        site_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'initialized',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Database initialized — protocol_executions table ready");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
