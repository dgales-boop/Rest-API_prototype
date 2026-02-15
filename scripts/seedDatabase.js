/**
 * Database Seed Script
 *
 * Seeds the database with realistic CLOSED execution protocol snapshots.
 * This simulates production-ready integration state without Reportheld backend.
 *
 * Usage: node scripts/seedDatabase.js
 */

require("dotenv").config();
const { pool } = require("../db");

/**
 * Generate realistic CLOSED protocol snapshots for seeding
 */
function generateSeedData() {
  const baseDate = new Date("2026-02-01T00:00:00Z");

  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      siteId: "L3",
      plantId: "T17",
      tenantId: "tenant-acme",
      status: "CLOSED",
      createdAt: new Date("2026-01-15T08:00:00Z"),
      closedAt: new Date("2026-01-15T10:30:00Z"),
      updatedAt: new Date(baseDate.getTime() + 1 * 86400000), // +1 day
      snapshot: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        site: { id: "L3", name: "Site L3 Berlin" },
        plant: { id: "T17", name: "Wind Turbine 17" },
        template: {
          id: "VIS-4",
          name: "Visual Inspection Protocol",
          version: "4.0",
        },
        inspector: {
          id: "inspector-001",
          name: "John Smith",
          email: "j.smith@acme-energy.com",
        },
        status: "CLOSED",
        closedAt: "2026-01-15T10:30:00Z",
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        sections: [
          {
            title: "Key Facts",
            order: 1,
            fields: [
              {
                fieldId: "service_company_notified",
                label: "Service Company Notified",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "inspection_date",
                label: "Inspection Date",
                type: "date",
                value: "2026-01-15",
                valid: true,
                required: true,
              },
              {
                fieldId: "weather_conditions",
                label: "Weather Conditions",
                type: "select",
                value: "clear",
                valid: true,
                required: false,
              },
            ],
          },
          {
            title: "Safety Checks",
            order: 2,
            fields: [
              {
                fieldId: "safety_harness_checked",
                label: "Safety Harness Checked",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "emergency_stop_tested",
                label: "Emergency Stop Tested",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "fire_extinguisher_present",
                label: "Fire Extinguisher Present",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
            ],
          },
          {
            title: "Visual Inspection Results",
            order: 3,
            fields: [
              {
                fieldId: "blade_condition",
                label: "Blade Condition",
                type: "select",
                value: "excellent",
                valid: true,
                required: true,
              },
              {
                fieldId: "tower_condition",
                label: "Tower Condition",
                type: "select",
                value: "good",
                valid: true,
                required: true,
              },
              {
                fieldId: "notes",
                label: "Additional Notes",
                type: "text",
                value:
                  "All components in excellent condition. No maintenance required.",
                valid: true,
                required: false,
              },
            ],
          },
        ],
        attachments: [
          {
            id: "att-001",
            filename: "turbine_t17_overview.jpg",
            url: "/attachments/550e8400-e29b-41d4-a716-446655440001/att-001.jpg",
            type: "image/jpeg",
            size: 2456789,
            uploadedAt: "2026-01-15T09:15:00Z",
          },
          {
            id: "att-002",
            filename: "blade_closeup.jpg",
            url: "/attachments/550e8400-e29b-41d4-a716-446655440001/att-002.jpg",
            type: "image/jpeg",
            size: 3123456,
            uploadedAt: "2026-01-15T09:45:00Z",
          },
        ],
        report: {
          url: "/reports/550e8400-e29b-41d4-a716-446655440001.pdf",
          generatedAt: "2026-01-15T10:30:00Z",
          format: "PDF",
          size: 456789,
        },
        metadata: {
          executionDurationMinutes: 150,
          completedSteps: 12,
          totalSteps: 12,
          appVersion: "2.4.1",
        },
      },
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      siteId: "L3",
      plantId: "T18",
      tenantId: "tenant-acme",
      status: "CLOSED",
      createdAt: new Date("2026-02-01T09:00:00Z"),
      closedAt: new Date("2026-02-01T11:45:00Z"),
      updatedAt: new Date(baseDate.getTime() + 5 * 86400000), // +5 days
      snapshot: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        site: { id: "L3", name: "Site L3 Berlin" },
        plant: { id: "T18", name: "Wind Turbine 18" },
        template: {
          id: "VIS-4",
          name: "Visual Inspection Protocol",
          version: "4.0",
        },
        inspector: {
          id: "inspector-002",
          name: "Jane Doe",
          email: "j.doe@acme-energy.com",
        },
        status: "CLOSED",
        closedAt: "2026-02-01T11:45:00Z",
        validation: {
          isValid: true,
          errors: [],
          warnings: [
            "Temperature sensor reading slightly elevated - recommend calibration",
          ],
        },
        sections: [
          {
            title: "Key Facts",
            order: 1,
            fields: [
              {
                fieldId: "service_company_notified",
                label: "Service Company Notified",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "inspection_date",
                label: "Inspection Date",
                type: "date",
                value: "2026-02-01",
                valid: true,
                required: true,
              },
              {
                fieldId: "weather_conditions",
                label: "Weather Conditions",
                type: "select",
                value: "cloudy",
                valid: true,
                required: false,
              },
            ],
          },
          {
            title: "Safety Checks",
            order: 2,
            fields: [
              {
                fieldId: "safety_harness_checked",
                label: "Safety Harness Checked",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "emergency_stop_tested",
                label: "Emergency Stop Tested",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
            ],
          },
        ],
        attachments: [],
        report: {
          url: "/reports/550e8400-e29b-41d4-a716-446655440002.pdf",
          generatedAt: "2026-02-01T11:45:00Z",
          format: "PDF",
          size: 234567,
        },
        metadata: {
          executionDurationMinutes: 165,
          completedSteps: 8,
          totalSteps: 8,
          appVersion: "2.4.1",
        },
      },
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      siteId: "L5",
      plantId: "T22",
      tenantId: "tenant-globex",
      status: "CLOSED",
      createdAt: new Date("2026-02-10T14:00:00Z"),
      closedAt: new Date("2026-02-10T15:20:00Z"),
      updatedAt: new Date(baseDate.getTime() + 10 * 86400000), // +10 days
      snapshot: {
        id: "550e8400-e29b-41d4-a716-446655440003",
        site: { id: "L5", name: "Site L5 Hamburg" },
        plant: { id: "T22", name: "Wind Turbine 22" },
        template: {
          id: "MAINT-2",
          name: "Maintenance Protocol",
          version: "2.1",
        },
        inspector: {
          id: "inspector-003",
          name: "Bob Johnson",
          email: "b.johnson@globex-wind.com",
        },
        status: "CLOSED",
        closedAt: "2026-02-10T15:20:00Z",
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        sections: [
          {
            title: "Maintenance Tasks",
            order: 1,
            fields: [
              {
                fieldId: "oil_level_checked",
                label: "Oil Level Checked",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "filter_replaced",
                label: "Filter Replaced",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "oil_quality",
                label: "Oil Quality",
                type: "select",
                value: "excellent",
                valid: true,
                required: true,
              },
            ],
          },
        ],
        attachments: [
          {
            id: "att-003",
            filename: "maintenance_log.pdf",
            url: "/attachments/550e8400-e29b-41d4-a716-446655440003/att-003.pdf",
            type: "application/pdf",
            size: 123456,
            uploadedAt: "2026-02-10T15:10:00Z",
          },
        ],
        report: {
          url: "/reports/550e8400-e29b-41d4-a716-446655440003.pdf",
          generatedAt: "2026-02-10T15:20:00Z",
          format: "PDF",
          size: 345678,
        },
        metadata: {
          executionDurationMinutes: 80,
          completedSteps: 5,
          totalSteps: 5,
          appVersion: "2.4.2",
        },
      },
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
      siteId: "L8",
      plantId: "T31",
      tenantId: "tenant-acme",
      status: "CLOSED",
      createdAt: new Date("2026-02-12T10:00:00Z"),
      closedAt: new Date("2026-02-12T12:15:00Z"),
      updatedAt: new Date(baseDate.getTime() + 12 * 86400000), // +12 days
      snapshot: {
        id: "550e8400-e29b-41d4-a716-446655440004",
        site: { id: "L8", name: "Site L8 Munich" },
        plant: { id: "T31", name: "Wind Turbine 31" },
        template: {
          id: "VIS-4",
          name: "Visual Inspection Protocol",
          version: "4.0",
        },
        inspector: {
          id: "inspector-001",
          name: "John Smith",
          email: "j.smith@acme-energy.com",
        },
        status: "CLOSED",
        closedAt: "2026-02-12T12:15:00Z",
        validation: {
          isValid: false,
          errors: ["Blade damage detected - immediate maintenance required"],
          warnings: [],
        },
        sections: [
          {
            title: "Key Facts",
            order: 1,
            fields: [
              {
                fieldId: "service_company_notified",
                label: "Service Company Notified",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
              {
                fieldId: "inspection_date",
                label: "Inspection Date",
                type: "date",
                value: "2026-02-12",
                valid: true,
                required: true,
              },
            ],
          },
          {
            title: "Visual Inspection Results",
            order: 2,
            fields: [
              {
                fieldId: "blade_condition",
                label: "Blade Condition",
                type: "select",
                value: "damaged",
                valid: false,
                required: true,
                errorMessage: "Blade 2 shows crack at 15m mark",
              },
              {
                fieldId: "tower_condition",
                label: "Tower Condition",
                type: "select",
                value: "good",
                valid: true,
                required: true,
              },
            ],
          },
        ],
        attachments: [
          {
            id: "att-004",
            filename: "blade_damage_evidence.jpg",
            url: "/attachments/550e8400-e29b-41d4-a716-446655440004/att-004.jpg",
            type: "image/jpeg",
            size: 4567890,
            uploadedAt: "2026-02-12T11:30:00Z",
          },
        ],
        report: {
          url: "/reports/550e8400-e29b-41d4-a716-446655440004.pdf",
          generatedAt: "2026-02-12T12:15:00Z",
          format: "PDF",
          size: 567890,
        },
        metadata: {
          executionDurationMinutes: 135,
          completedSteps: 8,
          totalSteps: 12,
          appVersion: "2.4.1",
          priority: "HIGH",
        },
      },
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440005",
      siteId: "L5",
      plantId: "T23",
      tenantId: "tenant-globex",
      status: "CLOSED",
      createdAt: new Date("2026-02-14T08:30:00Z"),
      closedAt: new Date("2026-02-14T10:00:00Z"),
      updatedAt: new Date(baseDate.getTime() + 14 * 86400000), // +14 days
      snapshot: {
        id: "550e8400-e29b-41d4-a716-446655440005",
        site: { id: "L5", name: "Site L5 Hamburg" },
        plant: { id: "T23", name: "Wind Turbine 23" },
        template: {
          id: "VIS-4",
          name: "Visual Inspection Protocol",
          version: "4.1",
        },
        inspector: {
          id: "inspector-004",
          name: "Alice Chen",
          email: "a.chen@globex-wind.com",
        },
        status: "CLOSED",
        closedAt: "2026-02-14T10:00:00Z",
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        sections: [
          {
            title: "Key Facts",
            order: 1,
            fields: [
              {
                fieldId: "service_company_notified",
                label: "Service Company Notified",
                type: "boolean",
                value: false,
                valid: true,
                required: false,
              },
              {
                fieldId: "inspection_date",
                label: "Inspection Date",
                type: "date",
                value: "2026-02-14",
                valid: true,
                required: true,
              },
              {
                fieldId: "weather_conditions",
                label: "Weather Conditions",
                type: "select",
                value: "rain",
                valid: true,
                required: false,
              },
            ],
          },
          {
            title: "Safety Checks",
            order: 2,
            fields: [
              {
                fieldId: "safety_harness_checked",
                label: "Safety Harness Checked",
                type: "boolean",
                value: true,
                valid: true,
                required: true,
              },
            ],
          },
        ],
        attachments: [],
        report: {
          url: "/reports/550e8400-e29b-41d4-a716-446655440005.pdf",
          generatedAt: "2026-02-14T10:00:00Z",
          format: "PDF",
          size: 198765,
        },
        metadata: {
          executionDurationMinutes: 90,
          completedSteps: 6,
          totalSteps: 6,
          appVersion: "2.5.0",
        },
      },
    },
  ];
}

/**
 * Seed the database
 */
async function seed() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting database seed...\n");

    // Start transaction
    await client.query("BEGIN");

    // Clear existing data (optional - comment out if you want to preserve data)
    await client.query("DELETE FROM execution_protocols");
    console.log("✓ Cleared existing data");

    // Insert seed data
    const seedData = generateSeedData();
    let insertCount = 0;

    for (const record of seedData) {
      const query = `
        INSERT INTO execution_protocols 
          (id, site_id, plant_id, tenant_id, status, snapshot, created_at, closed_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          snapshot = EXCLUDED.snapshot,
          updated_at = EXCLUDED.updated_at
      `;

      const values = [
        record.id,
        record.siteId,
        record.plantId,
        record.tenantId,
        record.status,
        JSON.stringify(record.snapshot),
        record.createdAt,
        record.closedAt,
        record.updatedAt,
      ];

      await client.query(query, values);
      insertCount++;
      console.log(
        `✓ Inserted: ${record.snapshot.site.name} - ${record.snapshot.plant.name} (${record.tenantId})`,
      );
    }

    // Commit transaction
    await client.query("COMMIT");

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`📊 Inserted ${insertCount} execution protocols`);
    console.log(`\n🔍 Summary by tenant:`);

    // Query summary
    const summary = await client.query(`
      SELECT tenant_id, COUNT(*) as count
      FROM execution_protocols
      GROUP BY tenant_id
      ORDER BY tenant_id
    `);

    summary.rows.forEach((row) => {
      console.log(`   ${row.tenant_id}: ${row.count} protocols`);
    });

    console.log(`\n🔗 Test API endpoints:`);
    console.log(
      `   GET /api/v1/execution-protocols (X-API-Key: test-key-acme)`,
    );
    console.log(
      `   GET /api/v1/execution-protocols/${seedData[0].id} (X-API-Key: test-key-acme)`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seed()
  .then(() => {
    console.log("\n✓ Database connection closed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
