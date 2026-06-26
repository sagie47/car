import { fetchXmlFeed, parseGenericXmlFeed } from '../adapters/generic-xml-feed.js';
import { parseCsvInventory } from '../adapters/csv-inventory.js';
import { createFirecrawlInventoryAdapter } from '../adapters/firecrawl-inventory.js';
import { createNotificationAdapter } from '../adapters/notification-delivery.js';
import {
  buildSyncRunRecord,
  createInventorySourceRecord,
  INVENTORY_SOURCE_FORMATS,
  INVENTORY_SOURCE_TYPES,
  validateInventorySourcePayload
} from '../domain/inventory-source.js';
import { evaluateVehicleEligibility, isVehicleStale } from '../domain/eligibility.js';
import { calculateInventoryHealth } from '../domain/health-score.js';
import { buildListingDraft, updateListingDraftOverrides } from '../domain/listing-draft.js';
import {
  canTransitionListingState,
  createInitialListing,
  transitionListingState
} from '../domain/listing-state-machine.js';
import { assignLeadRecord, createLeadRecord, updateLeadStatusRecord } from '../domain/lead.js';
import { normalizeIncomingVehicle } from '../domain/vehicle.js';
import { createId, nowIso, stableHash } from '../lib/utils.js';
import { InMemoryStore } from '../store/in-memory-store.js';

function defaultRules() {
  return {
    minimumPhotos: 5,
    staleThresholdDays: 45,
    excludeStatuses: ['sold', 'reserved', 'wholesale', 'in_transit']
  };
}

function defaultFeedAdapter() {
  return {
    fetchXmlFeed,
    parseGenericXmlFeed
  };
}

function defaultInventoryAdapter() {
  return createFirecrawlInventoryAdapter();
}

export class LotPilotService {
  constructor({ store, feedAdapter, inventoryAdapter, notificationAdapter } = {}) {
    this.store = store ?? new InMemoryStore();
    this.feedAdapter = feedAdapter ?? defaultFeedAdapter();
    this.inventoryAdapter = inventoryAdapter ?? defaultInventoryAdapter();
    this.notificationAdapter = notificationAdapter ?? createNotificationAdapter();
  }

  async createDealer(payload) {
    if (!payload?.name) {
      throw new Error('Dealer name is required');
    }

    const dealer = {
      id: createId('dealer'),
      name: payload.name,
      createdAt: nowIso()
    };

    return this.store.saveDealer(dealer);
  }

  async listDealers() {
    return this.store.listDealers();
  }

  async getDealer(dealerId) {
    const dealer = await this.store.getDealer(dealerId);
    if (!dealer) {
      throw new Error(`Dealer ${dealerId} was not found`);
    }

    return dealer;
  }

  async createRooftop(payload) {
    if (!payload?.dealerId) {
      throw new Error('dealerId is required');
    }

    if (!payload?.name) {
      throw new Error('Rooftop name is required');
    }

    const dealer = await this.store.getDealer(payload.dealerId);
    if (!dealer) {
      throw new Error(`Dealer ${payload.dealerId} was not found`);
    }

    const rooftop = {
      id: createId('rooftop'),
      dealerId: payload.dealerId,
      name: payload.name,
      location: payload.location ?? null,
      phone: payload.phone ?? null,
      logoUrl: payload.logoUrl ?? null,
      disclaimerText: payload.disclaimerText ?? null,
      assignmentMode: payload.assignmentMode ?? 'round_robin',
      rules: {
        ...defaultRules(),
        ...(payload.rules ?? {})
      },
      createdAt: nowIso()
    };

    return this.store.saveRooftop(rooftop);
  }

  async listRooftops({ dealerId } = {}) {
    return this.store.listRooftops({ dealerId });
  }

  async getRooftop(rooftopId) {
    const rooftop = await this.store.getRooftop(rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${rooftopId} was not found`);
    }

    return rooftop;
  }

  async createInventorySource(payload) {
    validateInventorySourcePayload(payload);

    const rooftop = await this.store.getRooftop(payload.rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${payload.rooftopId} was not found`);
    }

    const inventorySource = createInventorySourceRecord(payload);
    return this.store.saveInventorySource(inventorySource);
  }

  async listInventorySources({ rooftopId } = {}) {
    return this.store.listInventorySources({ rooftopId });
  }

  async getInventorySource(inventorySourceId) {
    const inventorySource = await this.store.getInventorySource(inventorySourceId);
    if (!inventorySource) {
      throw new Error(`Inventory source ${inventorySourceId} was not found`);
    }

    return inventorySource;
  }

  async listVehicles({ rooftopId } = {}) {
    return this.store.listVehicles({ rooftopId });
  }

  async getVehicle(vehicleId) {
    const vehicle = await this.store.getVehicle(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} was not found`);
    }

    return vehicle;
  }

  async listListings({ rooftopId } = {}) {
    return this.store.listListings({ rooftopId });
  }

  async getListing(listingId) {
    const listing = await this.store.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} was not found`);
    }

    return listing;
  }

  async listLeads({ rooftopId, status } = {}) {
    return this.store.listLeads({ rooftopId, status });
  }

  async getLead(leadId) {
    const lead = await this.store.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} was not found`);
    }

    return lead;
  }

  async getSyncRun(syncRunId) {
    const syncRun = await this.store.getSyncRun(syncRunId);
    if (!syncRun) {
      throw new Error(`Sync run ${syncRunId} was not found`);
    }

    return syncRun;
  }

  async listSyncRuns({ rooftopId, inventorySourceId, status } = {}) {
    return this.store.listSyncRuns({ rooftopId, inventorySourceId, status });
  }

  async getRooftopDashboard(rooftopId) {
    const rooftop = await this.getRooftop(rooftopId);
    const [health, vehicles, listings, leads, inventorySources, syncRuns] = await Promise.all([
      this.getRooftopHealth(rooftopId),
      this.listVehicles({ rooftopId }),
      this.listListings({ rooftopId }),
      this.listLeads({ rooftopId }),
      this.listInventorySources({ rooftopId }),
      this.listSyncRuns({ rooftopId })
    ]);

    const vehicleCounts = vehicles.reduce(
      (counts, vehicle) => {
        counts.total += 1;

        if (vehicle.eligibility?.status === 'blocked') {
          counts.blocked += 1;
        } else if (vehicle.eligibility?.status === 'eligible_with_warning') {
          counts.withWarnings += 1;
          counts.eligible += 1;
        } else {
          counts.eligible += 1;
        }

        if (vehicle.isStale) {
          counts.stale += 1;
        }

        if ((vehicle.syncIssues?.length ?? 0) > 0) {
          counts.withSyncIssues += 1;
        }

        return counts;
      },
      {
        total: 0,
        eligible: 0,
        blocked: 0,
        withWarnings: 0,
        stale: 0,
        withSyncIssues: 0
      }
    );

    const listingCounts = listings.reduce(
      (counts, listing) => {
        counts.total += 1;
        counts.byState[listing.state] = (counts.byState[listing.state] ?? 0) + 1;

        if (listing.state !== 'removed') {
          counts.active += 1;
        }

        if (listing.state === 'published') {
          counts.published += 1;
        }

        if (
          listing.state === 'publish_failed' ||
          listing.state === 'removal_failed' ||
          listing.state === 'needs_manual_review'
        ) {
          counts.needingAttention += 1;
        }

        return counts;
      },
      {
        total: 0,
        active: 0,
        published: 0,
        needingAttention: 0,
        byState: {}
      }
    );

    const leadCounts = leads.reduce(
      (counts, lead) => {
        counts.total += 1;
        counts.byStatus[lead.status] = (counts.byStatus[lead.status] ?? 0) + 1;

        if (!lead.assignedRepId) {
          counts.unassigned += 1;
        }

        return counts;
      },
      {
        total: 0,
        unassigned: 0,
        byStatus: {}
      }
    );

    return {
      rooftop,
      health,
      latestSyncRun: syncRuns[0] ?? null,
      inventorySources,
      vehicleCounts,
      listingCounts,
      leadCounts
    };
  }

  async getRooftopHealth(rooftopId) {
    const rooftop = await this.store.getRooftop(rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${rooftopId} was not found`);
    }

    return calculateInventoryHealth(await this.store.listVehicles({ rooftopId }), rooftop.rules);
  }

  async listStaleVehicles(rooftopId) {
    const rooftop = await this.store.getRooftop(rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${rooftopId} was not found`);
    }

    return (await this.store.listVehicles({ rooftopId })).filter(
      (vehicle) => isVehicleStale(vehicle, rooftop.rules) && vehicle.eligibility.status !== 'blocked'
    );
  }

  async failSyncRun(syncRun, error) {
    const failedSyncRun = {
      ...syncRun,
      status: 'failed',
      completedAt: nowIso(),
      errors: [
        ...(syncRun.errors ?? []),
        {
          type: 'sync_failure',
          reason: error.message
        }
      ]
    };

    await this.store.saveSyncRun(failedSyncRun);
    return failedSyncRun;
  }

  async ingestVehicleRows({ rooftop, rules, vehicles, syncRun, tonePreset }) {
    const activeSyncRun = syncRun;
    activeSyncRun.rowsReceived = vehicles.length;
    await this.store.saveSyncRun(activeSyncRun);

    const seenVins = new Set();
    const summary = {
      createdVehicles: 0,
      updatedVehicles: 0,
      createdListings: 0,
      queuedForRemoval: 0
    };

    for (const rawVehicle of vehicles) {
      const normalizedVehicle = normalizeIncomingVehicle(rawVehicle, {
        dealerId: rooftop.dealerId,
        rooftopId: rooftop.id
      });

      if (normalizedVehicle.vin) {
        if (seenVins.has(normalizedVehicle.vin)) {
          activeSyncRun.rowsSkipped += 1;
          activeSyncRun.duplicateVins.push(normalizedVehicle.vin);
          activeSyncRun.errors.push({
            vin: normalizedVehicle.vin,
            reason: 'Duplicate VIN in the same import batch'
          });
          continue;
        }

        seenVins.add(normalizedVehicle.vin);
      }

      const existingVehicle = await this.store.getVehicleByNaturalKey(normalizedVehicle.naturalKey);
      const fingerprint = stableHash(normalizedVehicle.rawSource);
      const vehicle = {
        ...(existingVehicle ?? {}),
        ...normalizedVehicle,
        id: existingVehicle?.id ?? createId('vehicle'),
        createdAt: existingVehicle?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        sourceFingerprint: fingerprint,
        syncIssues: [],
        snapshots: [
          ...(existingVehicle?.snapshots ?? []),
          {
            id: createId('snapshot'),
            syncRunId: activeSyncRun.id,
            capturedAt: nowIso(),
            fingerprint,
            rawSource: normalizedVehicle.rawSource
          }
        ]
      };

      vehicle.isStale = isVehicleStale(vehicle, rules);
      vehicle.eligibility = evaluateVehicleEligibility(vehicle, rules);

      if (existingVehicle) {
        summary.updatedVehicles += 1;
      } else {
        summary.createdVehicles += 1;
      }

      await this.store.saveVehicle(vehicle);
      activeSyncRun.rowsImported += 1;

      let listing = await this.store.getListingByVehicleId(vehicle.id);

      if (!listing && vehicle.eligibility.status !== 'blocked') {
        listing = createInitialListing(
          vehicle,
          buildListingDraft(vehicle, {
            tonePreset,
            rules,
            rooftop
          })
        );
        summary.createdListings += 1;
        await this.store.saveListing(listing);
        continue;
      }

      if (!listing) {
        continue;
      }

      listing = {
        ...listing,
        draft: buildListingDraft(vehicle, {
          tonePreset: listing.draft?.tonePreset ?? tonePreset,
          rules,
          rooftop,
          overrides: listing.draft?.overrides
        }),
        updatedAt: nowIso()
      };

      if (
        vehicle.eligibility.status === 'blocked' &&
        canTransitionListingState(listing.state, 'queued_for_remove')
      ) {
        listing = transitionListingState(listing, 'queued_for_remove', {
          actor: 'system',
          reason: 'Vehicle became ineligible'
        });
        summary.queuedForRemoval += 1;
      }

      await this.store.saveListing(listing);
    }

    return {
      syncRun: activeSyncRun,
      summary,
      health: calculateInventoryHealth(await this.store.listVehicles({ rooftopId: rooftop.id }), rules)
    };
  }

  async ingestInventory(payload) {
    if (!payload?.rooftopId) {
      throw new Error('rooftopId is required');
    }

    if (!Array.isArray(payload?.vehicles)) {
      throw new Error('vehicles must be an array');
    }

    const rooftop = await this.store.getRooftop(payload.rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${payload.rooftopId} was not found`);
    }

    const rules = {
      ...rooftop.rules,
      ...(payload.rules ?? {})
    };

    let syncRun = buildSyncRunRecord({
      rooftop,
      inventorySourceId: payload.inventorySourceId ?? null,
      sourceType: payload.sourceType ?? 'manual',
      sourceName: payload.sourceName ?? null,
      trigger: payload.trigger ?? 'manual'
    });

    await this.store.saveSyncRun(syncRun);

    try {
      const result = await this.ingestVehicleRows({
        rooftop,
        rules,
        vehicles: payload.vehicles,
        syncRun,
        tonePreset: payload.tonePreset
      });

      syncRun = {
        ...result.syncRun,
        status: 'completed',
        completedAt: nowIso()
      };
      await this.store.saveSyncRun(syncRun);

      return {
        syncRun,
        summary: result.summary,
        health: result.health
      };
    } catch (error) {
      syncRun = await this.failSyncRun(syncRun, error);
      error.syncRunId = syncRun.id;
      throw error;
    }
  }

  async syncInventorySource(inventorySourceId) {
    const inventorySource = await this.getInventorySource(inventorySourceId);
    const rooftop = await this.store.getRooftop(inventorySource.rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${inventorySource.rooftopId} was not found`);
    }

    let syncRun = buildSyncRunRecord({
      rooftop,
      inventorySourceId: inventorySource.id,
      sourceType: inventorySource.type,
      sourceName: inventorySource.name,
      trigger: 'manual'
    });

    await this.store.saveSyncRun(syncRun);

    try {
      let vehicles;
      let extraction = null;

      if (
        inventorySource.type === INVENTORY_SOURCE_TYPES.XML_FEED_URL &&
        inventorySource.format === INVENTORY_SOURCE_FORMATS.GENERIC_XML_V1
      ) {
        const xml = await this.feedAdapter.fetchXmlFeed(inventorySource.sourceUrl);
        vehicles = this.feedAdapter.parseGenericXmlFeed(xml);
      } else if (
        inventorySource.type === INVENTORY_SOURCE_TYPES.WEBSITE_INVENTORY_URL &&
        inventorySource.format === INVENTORY_SOURCE_FORMATS.FIRECRAWL_STRUCTURED_V1
      ) {
        extraction = await this.inventoryAdapter.importInventory(inventorySource.sourceUrl);
        vehicles = extraction.vehicles;
      } else if (
        inventorySource.type === INVENTORY_SOURCE_TYPES.CSV_UPLOAD &&
        inventorySource.format === INVENTORY_SOURCE_FORMATS.GENERIC_CSV_V1
      ) {
        vehicles = parseCsvInventory(inventorySource.sourceConfig?.csvText ?? '');
      } else {
        throw new Error(`Unsupported inventory source '${inventorySource.type}/${inventorySource.format}'`);
      }

      if (!vehicles.length) {
        throw new Error('Feed XML does not contain any usable vehicle records');
      }

      const result = await this.ingestVehicleRows({
        rooftop,
        rules: rooftop.rules,
        vehicles,
        syncRun,
        tonePreset: null
      });

      syncRun = {
        ...result.syncRun,
        status: 'completed',
        completedAt: nowIso()
      };
      await this.store.saveSyncRun(syncRun);

      const updatedInventorySource = await this.store.saveInventorySource({
        ...inventorySource,
        sourceConfig: {
          ...(inventorySource.sourceConfig ?? {}),
          lastExtraction: extraction
            ? {
                importedAt: syncRun.completedAt,
                detailPageCount: extraction.raw.detailPageCount
              }
            : inventorySource.sourceConfig?.lastExtraction ?? null
        },
        lastSyncedAt: syncRun.completedAt,
        lastSyncStatus: 'completed',
        updatedAt: nowIso()
      });

      return {
        inventorySource: updatedInventorySource,
        syncRun,
        summary: result.summary,
        health: result.health
      };
    } catch (error) {
      syncRun = await this.failSyncRun(syncRun, error);
      await this.store.saveInventorySource({
        ...inventorySource,
        lastSyncedAt: syncRun.completedAt,
        lastSyncStatus: 'failed',
        updatedAt: nowIso()
      });
      error.syncRunId = syncRun.id;
      throw error;
    }
  }

  async uploadCsvInventorySource(inventorySourceId, csvText, { fileName = 'inventory.csv' } = {}) {
    const inventorySource = await this.getInventorySource(inventorySourceId);
    if (inventorySource.type !== INVENTORY_SOURCE_TYPES.CSV_UPLOAD) {
      throw new Error('CSV content can only be uploaded to csv_upload sources');
    }
    if (typeof csvText !== 'string' || Buffer.byteLength(csvText, 'utf8') > 5 * 1024 * 1024) {
      throw new Error('CSV upload must be text smaller than 5 MB');
    }

    return this.store.saveInventorySource({
      ...inventorySource,
      sourceConfig: {
        ...(inventorySource.sourceConfig ?? {}),
        csvText,
        fileName,
        uploadedAt: nowIso()
      },
      updatedAt: nowIso()
    });
  }

  async updateListingDraft(listingId, updates, { actor = 'system' } = {}) {
    const listing = await this.getListing(listingId);
    const allowed = {};
    if (typeof updates.title === 'string') allowed.title = updates.title.trim();
    if (updates.price === null || Number.isFinite(updates.price)) allowed.price = updates.price;
    if (typeof updates.description === 'string') allowed.description = updates.description.trim();
    if (Array.isArray(updates.photoUrls)) allowed.photoUrls = updates.photoUrls.filter((url) => typeof url === 'string');

    const updatedListing = {
      ...listing,
      draft: updateListingDraftOverrides(listing.draft, allowed, { actor }),
      updatedAt: nowIso(),
      events: [
        ...listing.events,
        {
          id: createId('listing_event'),
          fromState: listing.state,
          toState: listing.state,
          actor,
          reason: 'Dealer edited Marketplace draft',
          metadata: { fields: Object.keys(allowed) },
          eventType: 'draft_edited',
          createdAt: nowIso()
        }
      ]
    };

    return this.store.saveListing(updatedListing);
  }

  async recordListingActivity(listingId, type, metadata = {}, { actor = 'system' } = {}) {
    if (!['copied', 'exported'].includes(type)) {
      throw new Error(`Unsupported listing activity '${type}'`);
    }
    const listing = await this.getListing(listingId);
    return this.store.saveListing({
      ...listing,
      updatedAt: nowIso(),
      events: [
        ...listing.events,
        {
          id: createId('listing_event'),
          fromState: listing.state,
          toState: listing.state,
          actor,
          reason: `Listing ${type}`,
          metadata,
          eventType: type,
          createdAt: nowIso()
        }
      ]
    });
  }

  async upsertUserProfile(identity) {
    if (!identity?.id || !identity?.email) throw new Error('User identity requires id and email');
    const existing = await this.store.getUserProfile(identity.id);
    return this.store.saveUserProfile({
      id: identity.id,
      email: identity.email.toLowerCase(),
      displayName: identity.displayName ?? existing?.displayName ?? null,
      phone: identity.phone ?? existing?.phone ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso()
    });
  }

  async saveMembership({ dealerId, userId, role }) {
    if (!['owner', 'manager', 'salesperson'].includes(role)) throw new Error(`Invalid membership role '${role}'`);
    return this.store.saveMembership({
      id: createId('membership'),
      dealerId,
      userId,
      role,
      createdAt: nowIso()
    });
  }

  async grantRooftopAccess({ rooftopId, userId }) {
    return this.store.saveRooftopAccess({ id: createId('rooftop_access'), rooftopId, userId, createdAt: nowIso() });
  }

  async createInvitation({ dealerId, email, role, rooftopIds = [], invitedById = null }) {
    if (!['owner', 'manager', 'salesperson'].includes(role)) throw new Error(`Invalid invitation role '${role}'`);
    return this.store.saveInvitation({
      id: createId('invitation'),
      dealerId,
      email: email.toLowerCase(),
      role,
      rooftopIds,
      status: 'pending',
      invitedById,
      createdAt: nowIso(),
      acceptedAt: null
    });
  }

  async acceptPendingInvitations(user) {
    const invitations = await this.store.listInvitations({ email: user.email, status: 'pending' });
    for (const invitation of invitations) {
      await this.saveMembership({ dealerId: invitation.dealerId, userId: user.id, role: invitation.role });
      for (const rooftopId of invitation.rooftopIds) {
        await this.grantRooftopAccess({ rooftopId, userId: user.id });
      }
      await this.store.saveInvitation({ ...invitation, status: 'accepted', acceptedAt: nowIso() });
    }
    return invitations;
  }

  async createNotificationRecipient({ rooftopId, userId = null, channel, destination }) {
    if (!['sms', 'email'].includes(channel)) throw new Error(`Invalid notification channel '${channel}'`);
    if (!destination) throw new Error('Notification destination is required');
    return this.store.saveNotificationRecipient({
      id: createId('notification_recipient'),
      rooftopId,
      userId,
      channel,
      destination: destination.trim(),
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  async deliverLeadNotifications(lead) {
    const recipients = await this.store.listNotificationRecipients({ rooftopId: lead.rooftopId, isActive: true });
    const vehicle = await this.getVehicle(lead.vehicleId);
    const subject = `New lead: ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}`;
    const text = [
      subject,
      lead.contactName ? `Contact: ${lead.contactName}` : null,
      lead.contactEmail ? `Email: ${lead.contactEmail}` : null,
      lead.contactPhone ? `Phone: ${lead.contactPhone}` : null,
      lead.sourceMessage ? `Message: ${lead.sourceMessage}` : null
    ].filter(Boolean).join('\n');

    return Promise.all(recipients.map(async (recipient) => {
      let delivery = {
        id: createId('notification_delivery'),
        leadId: lead.id,
        recipientId: recipient.id,
        channel: recipient.channel,
        status: 'queued',
        attempts: 0,
        providerId: null,
        lastError: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      await this.store.saveNotificationDelivery(delivery);
      try {
        const result = await this.notificationAdapter.send({
          channel: recipient.channel,
          destination: recipient.destination,
          subject,
          text
        });
        delivery = { ...delivery, status: 'sent', attempts: 1, providerId: result.providerId, updatedAt: nowIso() };
      } catch (error) {
        delivery = { ...delivery, status: 'failed', attempts: 1, lastError: error.message, updatedAt: nowIso() };
      }
      return this.store.saveNotificationDelivery(delivery);
    }));
  }

  async ingestInboundLead({ rooftopId, vehicleId, externalId, payload }) {
    const existing = await this.store.getInboundEventByExternalId(externalId);
    if (existing) return { duplicate: true, lead: existing.leadId ? await this.getLead(existing.leadId) : null };

    const lead = await this.createLead({
      rooftopId,
      vehicleId,
      sourceChannel: 'email',
      sourceSubchannel: 'forwarded_notification',
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      sourceMessage: payload.text,
      externalId
    });
    await this.store.saveInboundEvent({
      id: createId('inbound_event'),
      provider: 'resend',
      externalId,
      rooftopId,
      leadId: lead.id,
      payload,
      receivedAt: nowIso()
    });
    return { duplicate: false, lead };
  }

  async findInboundLeadVehicle(rooftopId, text) {
    const vehicles = await this.listVehicles({ rooftopId });
    const normalizedText = String(text ?? '').toLowerCase();
    return (
      vehicles.find((vehicle) => vehicle.vdpUrl && normalizedText.includes(vehicle.vdpUrl.toLowerCase())) ??
      vehicles.find((vehicle) => vehicle.vin && normalizedText.includes(vehicle.vin.toLowerCase())) ??
      vehicles.find((vehicle) => vehicle.stockNumber && normalizedText.includes(vehicle.stockNumber.toLowerCase())) ??
      null
    );
  }

  async generateListingDraft(vehicleId, options = {}) {
    const vehicle = await this.getVehicle(vehicleId);
    const rooftop = await this.store.getRooftop(vehicle.rooftopId);
    const listing = await this.store.getListingByVehicleId(vehicle.id);
    const draft = buildListingDraft(vehicle, {
      ...options,
      rules: rooftop?.rules,
      rooftop,
      overrides: listing?.draft?.overrides
    });

    if (!listing) {
      const createdListing = createInitialListing(vehicle, draft);
      await this.store.saveListing(createdListing);
      return createdListing;
    }

    const updatedListing = {
      ...listing,
      draft,
      updatedAt: nowIso()
    };

    await this.store.saveListing(updatedListing);
    return updatedListing;
  }

  async transitionListing(listingId, toState, metadata = {}) {
    const listing = await this.getListing(listingId);
    const updatedListing = transitionListingState(listing, toState, metadata);
    await this.store.saveListing(updatedListing);
    return updatedListing;
  }

  async createLead(payload) {
    if (!payload?.rooftopId || !payload?.vehicleId || !payload?.sourceChannel) {
      throw new Error('rooftopId, vehicleId, and sourceChannel are required');
    }

    const vehicle = await this.getVehicle(payload.vehicleId);
    const lead = createLeadRecord(payload, vehicle);
    await this.store.saveLead(lead);
    await this.deliverLeadNotifications(lead);
    return lead;
  }

  async assignLead(leadId, assignedRepId, actor = 'system') {
    const lead = await this.store.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} was not found`);
    }

    const updatedLead = assignLeadRecord(lead, assignedRepId, actor);
    await this.store.saveLead(updatedLead);
    return updatedLead;
  }

  async updateLeadStatus(leadId, status, metadata = {}) {
    const lead = await this.store.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} was not found`);
    }

    const updatedLead = updateLeadStatusRecord(lead, status, metadata);
    await this.store.saveLead(updatedLead);
    return updatedLead;
  }
}
