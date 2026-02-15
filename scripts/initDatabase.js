/**
 * Database Initialization Script
 *
 * Creates the execution_protocols table and indexes.
 * Run this before seeding the database.
 *
 * Usage: node scripts/initDatabase.js
 */

require("dotenv").config();
const { pool, initDb } = require("../db");

async function init() {
  try {
    console.log("🔧 Initializing database schema...\n");
    await initDb();
    console.log("\n✅ Database initialization completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

init();
