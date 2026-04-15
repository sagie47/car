import { createId, nowIso, stableHash } from '../lib/utils.js';
import { evaluateVehicleEligibility, isVehicleStale } from '../domain/eligibility.js';
import { calculateInventoryHealth } from '../domain/health-score.js';
import { buildListingDraft } from '../domain/listing-draft.js';
import {
  canTransitionListingState,
  createInitialListing,
  transitionListingState
} from '../domain/listing-state-machine.js';
import { assignLeadRecord, createLeadRecord, updateLeadStatusRecord } from '../domain/lead.js';
import { normalizeIncomingVehicle } from '../domain/vehicle.js';
import { InMemoryStore } from '../store/in-memory-store.js';

function defaultRules() {
  return {
    minimumPhotos: 5,
    staleThresholdDays: 45,
    excludeStatuses: ['sold', 'reserved', 'wholesale', 'in_transit']
  };
}

export class LotPilotService {
  constructor({ store } = {}) {
    this.store = store ?? new InMemoryStore();
  }

  createDealer(payload) {
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

  createRooftop(payload) {
    if (!payload?.dealerId) {
      throw new Error('dealerId is required');
    }

    if (!payload?.name) {
      throw new Error('Rooftop name is required');
    }

    const dealer = this.store.getDealer(payload.dealerId);
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

  listVehicles({ rooftopId } = {}) {
    if (!rooftopId) {
      return [...this.store.vehicles.values()];
    }

    return this.store.listVehiclesByRooftop(rooftopId);
  }

  getVehicle(vehicleId) {
    const vehicle = this.store.getVehicle(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} was not found`);
    }

    return vehicle;
  }

  listListings({ rooftopId } = {}) {
    if (!rooftopId) {
      return [...this.store.listings.values()];
    }

    return this.store.listListingsByRooftop(rooftopId);
  }

  getListing(listingId) {
    const listing = this.store.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} was not found`);
    }

    return listing;
  }

  listLeads({ rooftopId, status } = {}) {
    const leads = rooftopId ? this.store.listLeadsByRooftop(rooftopId) : [...this.store.leads.values()];
    return status ? leads.filter((lead) => lead.status === status) : leads;
  }

  getRooftopHealth(rooftopId) {
    const rooftop = this.store.getRooftop(rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${rooftopId} was not found`);
    }

    return calculateInventoryHealth(this.store.listVehiclesByRooftop(rooftopId), rooftop.rules);
  }

  listStaleVehicles(rooftopId) {
    const rooftop = this.store.getRooftop(rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${rooftopId} was not found`);
    }

    return this.store
      .listVehiclesByRooftop(rooftopId)
      .filter((vehicle) => isVehicleStale(vehicle, rooftop.rules) && vehicle.eligibility.status !== 'blocked');
  }

  ingestInventory(payload) {
    if (!payload?.rooftopId) {
      throw new Error('rooftopId is required');
    }

    if (!Array.isArray(payload?.vehicles)) {
      throw new Error('vehicles must be an array');
    }

    const rooftop = this.store.getRooftop(payload.rooftopId);
    if (!rooftop) {
      throw new Error(`Rooftop ${payload.rooftopId} was not found`);
    }

    const rules = {
      ...rooftop.rules,
      ...(payload.rules ?? {})
    };
    const syncRun = {
      id: createId('sync'),
      dealerId: rooftop.dealerId,
      rooftopId: rooftop.id,
      sourceType: payload.sourceType ?? 'manual',
      sourceName: payload.sourceName ?? null,
      startedAt: nowIso(),
      completedAt: null,
      rowsReceived: payload.vehicles.length,
      rowsImported: 0,
      rowsSkipped: 0,
      duplicateVins: [],
      errors: []
    };
    const seenVins = new Set();
    const summary = {
      createdVehicles: 0,
      updatedVehicles: 0,
      createdListings: 0,
      queuedForRemoval: 0
    };

    for (const rawVehicle of payload.vehicles) {
      const normalizedVehicle = normalizeIncomingVehicle(rawVehicle, {
        dealerId: rooftop.dealerId,
        rooftopId: rooftop.id
      });

      if (normalizedVehicle.vin) {
        if (seenVins.has(normalizedVehicle.vin)) {
          syncRun.rowsSkipped += 1;
          syncRun.duplicateVins.push(normalizedVehicle.vin);
          syncRun.errors.push({
            vin: normalizedVehicle.vin,
            reason: 'Duplicate VIN in the same import batch'
          });
          continue;
        }

        seenVins.add(normalizedVehicle.vin);
      }

      const existingVehicle = this.store.getVehicleByNaturalKey(normalizedVehicle.naturalKey);
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
            syncRunId: syncRun.id,
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

      this.store.saveVehicle(vehicle);
      syncRun.rowsImported += 1;

      let listing = this.store.getListingByVehicleId(vehicle.id);

      if (!listing && vehicle.eligibility.status !== 'blocked') {
        listing = createInitialListing(
          vehicle,
          buildListingDraft(vehicle, {
            tonePreset: payload.tonePreset,
            rules
          })
        );
        summary.createdListings += 1;
        this.store.saveListing(listing);
        continue;
      }

      if (!listing) {
        continue;
      }

      listing = {
        ...listing,
        draft: buildListingDraft(vehicle, {
          tonePreset: listing.draft?.tonePreset ?? payload.tonePreset,
          rules
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

      this.store.saveListing(listing);
    }

    syncRun.completedAt = nowIso();
    this.store.saveSyncRun(syncRun);

    return {
      syncRun,
      summary,
      health: calculateInventoryHealth(this.store.listVehiclesByRooftop(rooftop.id), rules)
    };
  }

  generateListingDraft(vehicleId, options = {}) {
    const vehicle = this.getVehicle(vehicleId);
    const rooftop = this.store.getRooftop(vehicle.rooftopId);
    const listing = this.store.getListingByVehicleId(vehicle.id);
    const draft = buildListingDraft(vehicle, {
      ...options,
      rules: rooftop?.rules
    });

    if (!listing) {
      const createdListing = createInitialListing(vehicle, draft);
      this.store.saveListing(createdListing);
      return createdListing;
    }

    const updatedListing = {
      ...listing,
      draft,
      updatedAt: nowIso()
    };

    this.store.saveListing(updatedListing);
    return updatedListing;
  }

  transitionListing(listingId, toState, metadata = {}) {
    const listing = this.getListing(listingId);
    const updatedListing = transitionListingState(listing, toState, metadata);
    this.store.saveListing(updatedListing);
    return updatedListing;
  }

  createLead(payload) {
    if (!payload?.rooftopId || !payload?.vehicleId || !payload?.sourceChannel) {
      throw new Error('rooftopId, vehicleId, and sourceChannel are required');
    }

    const vehicle = this.getVehicle(payload.vehicleId);
    const lead = createLeadRecord(payload, vehicle);
    this.store.saveLead(lead);
    return lead;
  }

  assignLead(leadId, assignedRepId, actor = 'system') {
    const lead = this.store.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} was not found`);
    }

    const updatedLead = assignLeadRecord(lead, assignedRepId, actor);
    this.store.saveLead(updatedLead);
    return updatedLead;
  }

  updateLeadStatus(leadId, status, metadata = {}) {
    const lead = this.store.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} was not found`);
    }

    const updatedLead = updateLeadStatusRecord(lead, status, metadata);
    this.store.saveLead(updatedLead);
    return updatedLead;
  }
}
