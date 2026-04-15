export class InMemoryStore {
  constructor() {
    this.dealers = new Map();
    this.rooftops = new Map();
    this.syncRuns = new Map();
    this.vehicles = new Map();
    this.vehicleKeys = new Map();
    this.listings = new Map();
    this.vehicleListingIds = new Map();
    this.leads = new Map();
  }

  saveDealer(dealer) {
    this.dealers.set(dealer.id, dealer);
    return dealer;
  }

  getDealer(dealerId) {
    return this.dealers.get(dealerId) ?? null;
  }

  saveRooftop(rooftop) {
    this.rooftops.set(rooftop.id, rooftop);
    return rooftop;
  }

  getRooftop(rooftopId) {
    return this.rooftops.get(rooftopId) ?? null;
  }

  saveSyncRun(syncRun) {
    this.syncRuns.set(syncRun.id, syncRun);
    return syncRun;
  }

  getVehicleByNaturalKey(naturalKey) {
    const vehicleId = this.vehicleKeys.get(naturalKey);
    return vehicleId ? this.vehicles.get(vehicleId) ?? null : null;
  }

  saveVehicle(vehicle) {
    this.vehicles.set(vehicle.id, vehicle);
    this.vehicleKeys.set(vehicle.naturalKey, vehicle.id);
    return vehicle;
  }

  getVehicle(vehicleId) {
    return this.vehicles.get(vehicleId) ?? null;
  }

  listVehiclesByRooftop(rooftopId) {
    return [...this.vehicles.values()].filter((vehicle) => vehicle.rooftopId === rooftopId);
  }

  saveListing(listing) {
    this.listings.set(listing.id, listing);
    this.vehicleListingIds.set(listing.vehicleId, listing.id);
    return listing;
  }

  getListing(listingId) {
    return this.listings.get(listingId) ?? null;
  }

  getListingByVehicleId(vehicleId) {
    const listingId = this.vehicleListingIds.get(vehicleId);
    return listingId ? this.listings.get(listingId) ?? null : null;
  }

  listListingsByRooftop(rooftopId) {
    return [...this.listings.values()].filter((listing) => listing.rooftopId === rooftopId);
  }

  saveLead(lead) {
    this.leads.set(lead.id, lead);
    return lead;
  }

  getLead(leadId) {
    return this.leads.get(leadId) ?? null;
  }

  listLeadsByRooftop(rooftopId) {
    return [...this.leads.values()].filter((lead) => lead.rooftopId === rooftopId);
  }
}
