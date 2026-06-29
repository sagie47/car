import { LotPilotStore } from './lotpilot-store.js';

export class InMemoryStore extends LotPilotStore {
  constructor() {
    super();
    this.dealers = new Map();
    this.userProfiles = new Map();
    this.userIdsByEmail = new Map();
    this.memberships = new Map();
    this.rooftopAccess = new Map();
    this.invitations = new Map();
    this.rooftops = new Map();
    this.inventorySources = new Map();
    this.syncRuns = new Map();
    this.vehicles = new Map();
    this.vehicleKeys = new Map();
    this.listings = new Map();
    this.vehicleListingIds = new Map();
    this.postingAccounts = new Map();
    this.postingJobs = new Map();
    this.postingAttempts = new Map();
    this.leads = new Map();
    this.notificationRecipients = new Map();
    this.inboundEvents = new Map();
    this.inboundEventsByExternalId = new Map();
    this.notificationDeliveries = new Map();
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

  async saveUserProfile(user) {
    this.userProfiles.set(user.id, user);
    this.userIdsByEmail.set(user.email.toLowerCase(), user.id);
    return user;
  }

  async getUserProfile(userId) {
    return this.userProfiles.get(userId) ?? null;
  }

  async getUserProfileByEmail(email) {
    const userId = this.userIdsByEmail.get(email.toLowerCase());
    return userId ? this.userProfiles.get(userId) ?? null : null;
  }

  async saveMembership(membership) {
    this.memberships.set(`${membership.dealerId}:${membership.userId}`, membership);
    return membership;
  }

  async getMembership({ dealerId, userId }) {
    return this.memberships.get(`${dealerId}:${userId}`) ?? null;
  }

  async listMemberships({ dealerId, userId } = {}) {
    return [...this.memberships.values()].filter((membership) =>
      (!dealerId || membership.dealerId === dealerId) && (!userId || membership.userId === userId)
    );
  }

  async saveRooftopAccess(access) {
    this.rooftopAccess.set(`${access.rooftopId}:${access.userId}`, access);
    return access;
  }

  async listRooftopAccess({ rooftopId, userId } = {}) {
    return [...this.rooftopAccess.values()].filter((access) =>
      (!rooftopId || access.rooftopId === rooftopId) && (!userId || access.userId === userId)
    );
  }

  async saveInvitation(invitation) {
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async getInvitation(invitationId) {
    return this.invitations.get(invitationId) ?? null;
  }

  async listInvitations({ email, status } = {}) {
    return [...this.invitations.values()].filter((invitation) =>
      (!email || invitation.email === email.toLowerCase()) && (!status || invitation.status === status)
    );
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

  async savePostingAccount(account) {
    this.postingAccounts.set(account.id, account);
    return account;
  }

  async getPostingAccount(accountId) {
    return this.postingAccounts.get(accountId) ?? null;
  }

  async listPostingAccounts({ rooftopId, status } = {}) {
    return [...this.postingAccounts.values()].filter((account) =>
      (!rooftopId || account.rooftopId === rooftopId) && (!status || account.status === status)
    );
  }

  async savePostingJob(job) {
    this.postingJobs.set(job.id, job);
    return job;
  }

  async getPostingJob(jobId) {
    return this.postingJobs.get(jobId) ?? null;
  }

  async listPostingJobs({ rooftopId, listingId, status, active } = {}) {
    const activeStatuses = new Set(['pending', 'blocked', 'claimed', 'in_progress', 'needs_manual_review']);
    return [...this.postingJobs.values()]
      .filter((job) =>
        (!rooftopId || job.rooftopId === rooftopId) &&
        (!listingId || job.listingId === listingId) &&
        (!status || job.status === status) &&
        (active === undefined || activeStatuses.has(job.status) === active)
      )
      .sort((left, right) =>
        left.scheduledFor.localeCompare(right.scheduledFor) || right.priority - left.priority
      );
  }

  async savePostingAttempt(attempt) {
    this.postingAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async listPostingAttempts({ jobId } = {}) {
    return [...this.postingAttempts.values()]
      .filter((attempt) => !jobId || attempt.jobId === jobId)
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
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

  async saveNotificationRecipient(recipient) {
    this.notificationRecipients.set(recipient.id, recipient);
    return recipient;
  }

  async getNotificationRecipient(recipientId) {
    return this.notificationRecipients.get(recipientId) ?? null;
  }

  async listNotificationRecipients({ rooftopId, isActive } = {}) {
    return [...this.notificationRecipients.values()].filter((recipient) => {
      if (rooftopId && recipient.rooftopId !== rooftopId) return false;
      if (isActive !== undefined && recipient.isActive !== isActive) return false;
      return true;
    });
  }

  async saveInboundEvent(event) {
    this.inboundEvents.set(event.id, event);
    this.inboundEventsByExternalId.set(event.externalId, event.id);
    return event;
  }

  async getInboundEventByExternalId(externalId) {
    const eventId = this.inboundEventsByExternalId.get(externalId);
    return eventId ? this.inboundEvents.get(eventId) ?? null : null;
  }

  async saveNotificationDelivery(delivery) {
    this.notificationDeliveries.set(delivery.id, delivery);
    return delivery;
  }

  async listNotificationDeliveries({ leadId, status } = {}) {
    return [...this.notificationDeliveries.values()].filter((delivery) =>
      (!leadId || delivery.leadId === leadId) && (!status || delivery.status === status)
    );
  }
}
