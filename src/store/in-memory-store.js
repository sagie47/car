import { LotPilotStore } from './lotpilot-store.js';

export class InMemoryStore extends LotPilotStore {
  constructor() {
    super();
    this.dealers = new Map();
    this.rooftops = new Map();
    this.inventorySources = new Map();
    this.syncRuns = new Map();
    this.vehicles = new Map();
    this.vehicleKeys = new Map();
    this.listings = new Map();
    this.vehicleListingIds = new Map();
    this.leads = new Map();
  }

  async saveDealer(dealer) {
    this.dealers.set(dealer.id, dealer);
    return dealer;
  }

  async listDealers() {
    return [...this.dealers.values()];
  }

  async getDealer(dealerId) {
    return this.dealers.get(dealerId) ?? null;
  }

  async saveRooftop(rooftop) {
    this.rooftops.set(rooftop.id, rooftop);
    return rooftop;
  }

  async listRooftops({ dealerId } = {}) {
    const rooftops = [...this.rooftops.values()];
    return dealerId ? rooftops.filter((rooftop) => rooftop.dealerId === dealerId) : rooftops;
  }

  async getRooftop(rooftopId) {
    return this.rooftops.get(rooftopId) ?? null;
  }

  async saveInventorySource(inventorySource) {
    this.inventorySources.set(inventorySource.id, inventorySource);
    return inventorySource;
  }

  async getInventorySource(inventorySourceId) {
    return this.inventorySources.get(inventorySourceId) ?? null;
  }

  async listInventorySources({ rooftopId } = {}) {
    const sources = [...this.inventorySources.values()];
    return rooftopId ? sources.filter((source) => source.rooftopId === rooftopId) : sources;
  }

  async saveSyncRun(syncRun) {
    this.syncRuns.set(syncRun.id, syncRun);
    return syncRun;
  }

  async getSyncRun(syncRunId) {
    return this.syncRuns.get(syncRunId) ?? null;
  }

  async listSyncRuns({ rooftopId, inventorySourceId, status } = {}) {
    const syncRuns = [...this.syncRuns.values()].sort((left, right) =>
      right.startedAt.localeCompare(left.startedAt)
    );
    return syncRuns.filter((syncRun) => {
      if (rooftopId && syncRun.rooftopId !== rooftopId) {
        return false;
      }

      if (inventorySourceId && syncRun.inventorySourceId !== inventorySourceId) {
        return false;
      }

      if (status && syncRun.status !== status) {
        return false;
      }

      return true;
    });
  }

  async getVehicleByNaturalKey(naturalKey) {
    const vehicleId = this.vehicleKeys.get(naturalKey);
    return vehicleId ? this.vehicles.get(vehicleId) ?? null : null;
  }

  async saveVehicle(vehicle) {
    this.vehicles.set(vehicle.id, vehicle);
    this.vehicleKeys.set(vehicle.naturalKey, vehicle.id);
    return vehicle;
  }

  async getVehicle(vehicleId) {
    return this.vehicles.get(vehicleId) ?? null;
  }

  async listVehicles({ rooftopId } = {}) {
    const vehicles = [...this.vehicles.values()];
    return rooftopId ? vehicles.filter((vehicle) => vehicle.rooftopId === rooftopId) : vehicles;
  }

  async saveListing(listing) {
    this.listings.set(listing.id, listing);
    this.vehicleListingIds.set(listing.vehicleId, listing.id);
    return listing;
  }

  async getListing(listingId) {
    return this.listings.get(listingId) ?? null;
  }

  async getListingByVehicleId(vehicleId) {
    const listingId = this.vehicleListingIds.get(vehicleId);
    return listingId ? this.listings.get(listingId) ?? null : null;
  }

  async listListings({ rooftopId } = {}) {
    const listings = [...this.listings.values()];
    return rooftopId ? listings.filter((listing) => listing.rooftopId === rooftopId) : listings;
  }

  async saveLead(lead) {
    this.leads.set(lead.id, lead);
    return lead;
  }

  async getLead(leadId) {
    return this.leads.get(leadId) ?? null;
  }

  async listLeads({ rooftopId, status } = {}) {
    const leads = [...this.leads.values()];
    return leads.filter((lead) => {
      if (rooftopId && lead.rooftopId !== rooftopId) {
        return false;
      }

      if (status && lead.status !== status) {
        return false;
      }

      return true;
    });
  }
}
