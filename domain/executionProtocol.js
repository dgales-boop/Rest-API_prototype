/**
 * ExecutionProtocol Domain Model
 *
 * Represents a CLOSED protocol execution snapshot.
 * This is the core domain entity that defines the contract
 * for protocol execution data across the system.
 */
class ExecutionProtocol {
  constructor({
    id,
    siteId,
    plantId,
    tenantId,
    status,
    createdAt,
    closedAt,
    updatedAt,
    snapshot,
  }) {
    this.id = id;
    this.siteId = siteId;
    this.plantId = plantId;
    this.tenantId = tenantId;
    this.status = status; // Expected: 'CLOSED'
    this.createdAt = createdAt;
    this.closedAt = closedAt;
    this.updatedAt = updatedAt;
    this.snapshot = snapshot; // Full JSONB snapshot (only loaded when requested)
  }

  /**
   * Factory method to create from repository data
   */
  static fromRepositoryData(data) {
    return new ExecutionProtocol({
      id: data.id,
      siteId: data.site_id || data.siteId,
      plantId: data.plant_id || data.plantId,
      tenantId: data.tenant_id || data.tenantId,
      status: data.status,
      createdAt: data.created_at || data.createdAt,
      closedAt: data.closed_at || data.closedAt,
      updatedAt: data.updated_at || data.updatedAt,
      snapshot: data.snapshot,
    });
  }

  /**
   * Return minimal metadata (for polling list endpoint)
   */
  toListMetadata() {
    return {
      id: this.id,
      siteId: this.siteId,
      plantId: this.plantId,
      status: this.status,
      closedAt: this.closedAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create a snapshot structure from business data
   */
  static createSnapshot({
    id,
    site,
    plant,
    template,
    inspector,
    status,
    closedAt,
    validation,
    sections,
    attachments,
    report,
  }) {
    return {
      id,
      site,
      plant,
      template,
      inspector,
      status,
      closedAt,
      validation,
      sections,
      attachments,
      report,
    };
  }
}

module.exports = ExecutionProtocol;
