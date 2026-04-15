import { LotPilotStore } from './lotpilot-store.js';

export class InMemoryStore extends LotPilotStore {
  constructor() {
    super();
    this.dealers = new Map();
    this.rooftops = new Map();
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

  async getDealer(dealerId) {
    return this.dealers.get(dealerId) ?? null;
  }

  async saveRooftop(rooftop) {
    this.rooftops.set(rooftop.id, rooftop);
    return rooftop;
  }

  async getRooftop(rooftopId) {
    return this.rooftops.get(rooftopId) ?? null;
  }

  async saveSyncRun(syncRun) {
    this.syncRuns.set(syncRun.id, syncRun);
    return syncRun;
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
