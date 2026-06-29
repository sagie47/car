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
import { appendLeadEvent, assignLeadRecord, createLeadRecord, updateLeadStatusRecord } from '../domain/lead.js';
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

const DEFAULT_NOTIFICATION_RULES = {
  sendWindow: 'always',
  timezone: 'America/Vancouver',
  businessHours: {
    days: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '18:00'
  },
  fallback: true
};

const ACTIVE_POSTING_JOB_STATUSES = new Set(['pending', 'blocked', 'claimed', 'in_progress', 'needs_manual_review']);
const POSTING_ACTION_STATES = {
  publish: {
    queued: 'queued_for_publish',
    inProgress: 'publish_in_progress',
    completed: 'published',
    failed: 'publish_failed'
  },
  update: {
    queued: 'queued_for_update',
    inProgress: 'update_in_progress',
    completed: 'updated',
    failed: 'needs_manual_review'
  },
  remove: {
    queued: 'queued_for_remove',
    inProgress: 'remove_in_progress',
    completed: 'removed',
    failed: 'removal_failed'
  }
};

function defaultPostingAccount(rooftopId) {
  const now = nowIso();
  return {
    id: createId('posting_account'),
    rooftopId,
    platform: 'facebook_marketplace',
    label: 'Default Facebook Marketplace account',
    status: 'active',
    dailyCapacity: 25,
    spacingMinutes: 20,
    autoSubmitEnabled: true,
    settings: {
      runner: 'chrome_extension',
      target: 'facebook_marketplace_vehicle'
    },
    createdAt: now,
    updatedAt: now
  };
}

function vehicleLabel(vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || vehicle.vin || vehicle.stockNumber || vehicle.id;
}

function blockedPostingChecks({ listing, vehicle, rooftop }) {
  const minimumPhotos = rooftop.rules?.minimumPhotos ?? defaultRules().minimumPhotos;
  const checks = [
    { key: 'has_draft', ok: Boolean(listing.draft?.marketplacePost), message: 'Marketplace draft is required.' },
    { key: 'has_year', ok: Boolean(vehicle.year), message: 'Vehicle year is required.' },
    { key: 'has_make', ok: Boolean(vehicle.make), message: 'Vehicle make is required.' },
    { key: 'has_model', ok: Boolean(vehicle.model), message: 'Vehicle model is required.' },
    { key: 'has_price', ok: Number.isFinite(vehicle.price), message: 'Vehicle price is required.' },
    { key: 'has_mileage', ok: Number.isFinite(vehicle.mileage), message: 'Vehicle mileage is required.' },
    { key: 'has_photos', ok: (vehicle.photoUrls ?? []).length >= minimumPhotos, message: `At least ${minimumPhotos} photos are required.` }
  ];
  return checks;
}

function isUnavailableStatus(status) {
  return ['sold', 'reserved', 'wholesale', 'in_transit'].includes(String(status ?? '').toLowerCase());
}

function postingActionFor(listing, vehicle) {
  if (isUnavailableStatus(vehicle.status) || listing.state === 'queued_for_remove' || listing.state === 'removal_failed') {
    return 'remove';
  }
  if (['published', 'updated', 'queued_for_update', 'update_in_progress'].includes(listing.state)) {
    return 'update';
  }
  if (['draft_created', 'queued_for_publish', 'publish_failed', 'needs_manual_review'].includes(listing.state)) {
    return 'publish';
  }
  return null;
}

function priorityForPostingJob(action, vehicle) {
  if (action === 'remove') return 100;
  if (vehicle.isStale) return 80;
  if (action === 'publish') return 60;
  return 50;
}

function normalizeNotificationRules(rules = {}) {
  const sendWindow = rules.sendWindow === 'business_hours' ? 'business_hours' : 'always';
  const businessHours = {
    days: Array.isArray(rules.businessHours?.days)
      ? rules.businessHours.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : DEFAULT_NOTIFICATION_RULES.businessHours.days,
    start: /^\d{2}:\d{2}$/.test(rules.businessHours?.start ?? '') ? rules.businessHours.start : DEFAULT_NOTIFICATION_RULES.businessHours.start,
    end: /^\d{2}:\d{2}$/.test(rules.businessHours?.end ?? '') ? rules.businessHours.end : DEFAULT_NOTIFICATION_RULES.businessHours.end
  };
  return {
    sendWindow,
    timezone: typeof rules.timezone === 'string' && rules.timezone.trim() ? rules.timezone.trim() : DEFAULT_NOTIFICATION_RULES.timezone,
    businessHours,
    fallback: rules.fallback === undefined ? true : Boolean(rules.fallback)
  };
}

function minutesFromClock(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
}

function localTimeParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const dayByName = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayByName[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
  };
}

function isRecipientOpen(recipient, now = new Date()) {
  const rules = normalizeNotificationRules(recipient.rules);
  if (rules.sendWindow === 'always') return true;

  const local = localTimeParts(now, rules.timezone);
  const start = minutesFromClock(rules.businessHours.start);
  const end = minutesFromClock(rules.businessHours.end);
  const insideDay = rules.businessHours.days.includes(local.day);
  const insideTime = start <= end
    ? local.minutes >= start && local.minutes <= end
    : local.minutes >= start || local.minutes <= end;
  return insideDay && insideTime;
}

function selectNotificationRecipients(recipients, now = new Date()) {
  const openRecipients = recipients.filter((recipient) => isRecipientOpen(recipient, now));
  if (openRecipients.length) return openRecipients;
  return recipients.filter((recipient) => normalizeNotificationRules(recipient.rules).fallback);
}

function titleCaseSegment(segment) {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function inferDealerNameFromUrl(inventoryUrl) {
  const host = new URL(inventoryUrl).hostname.replace(/^www\./, '');
  const main = host.split('.')[0] || 'Imported Dealer';
  const tokenized = main
    .replace(/(auto|centre|center|motors|motor|cars|car|dealer|sales|group|imports|trucks|truck)/gi, ' $1 ')
    .replace(/\s+/g, ' ');
  return titleCaseSegment(tokenized) || 'Imported Dealer';
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

  async setupFromInventoryUrl({ inventoryUrl }) {
    if (!inventoryUrl) throw new Error('inventoryUrl is required');
    const inferredName = inferDealerNameFromUrl(inventoryUrl);
    const [existingDealer] = await this.listDealers();
    const dealer = existingDealer
      ? await this.store.saveDealer({ ...existingDealer, name: inferredName })
      : await this.createDealer({ name: inferredName });
    const [existingRooftop] = await this.listRooftops({ dealerId: dealer.id });
    const rooftop = existingRooftop
      ? await this.store.saveRooftop({ ...existingRooftop, name: inferredName })
      : await this.createRooftop({
      dealerId: dealer.id,
      name: inferredName,
      location: null,
      phone: null
    });

    const source = await this.createInventorySource({
      rooftopId: rooftop.id,
      name: `${inferredName} inventory`,
      type: INVENTORY_SOURCE_TYPES.WEBSITE_INVENTORY_URL,
      format: INVENTORY_SOURCE_FORMATS.FIRECRAWL_STRUCTURED_V1,
      sourceUrl: inventoryUrl
    });
    const sync = await this.syncInventorySource(source.id);

    return {
      dealer,
      rooftop,
      inventorySource: sync.inventorySource,
      syncRun: sync.syncRun,
      summary: sync.summary,
      health: sync.health,
      inferred: {
        dealerName: inferredName,
        sourceUrl: inventoryUrl
      }
    };
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

  async ensurePostingAccount(rooftopId) {
    const accounts = await this.store.listPostingAccounts({ rooftopId, status: 'active' });
    if (accounts[0]) return accounts[0];
    return this.store.savePostingAccount(defaultPostingAccount(rooftopId));
  }

  async listPostingAccounts({ rooftopId, status } = {}) {
    return this.store.listPostingAccounts({ rooftopId, status });
  }

  async listPostingJobs({ rooftopId, status, active } = {}) {
    return this.store.listPostingJobs({ rooftopId, status, active });
  }

  async getPostingJob(jobId) {
    const job = await this.store.getPostingJob(jobId);
    if (!job) {
      throw new Error(`Posting job ${jobId} was not found`);
    }

    return job;
  }

  async rebuildPostingQueue(rooftopId, { actor = 'system' } = {}) {
    const rooftop = await this.getRooftop(rooftopId);
    const account = await this.ensurePostingAccount(rooftopId);
    const [listings, vehicles, activeJobs] = await Promise.all([
      this.listListings({ rooftopId }),
      this.listVehicles({ rooftopId }),
      this.store.listPostingJobs({ rooftopId, active: true })
    ]);
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const activeJobKeys = new Set(activeJobs.map((job) => `${job.listingId}:${job.action}`));
    const now = new Date();
    const createdJobs = [];
    const blockedJobs = [];
    let scheduleIndex = activeJobs.filter((job) => job.status !== 'blocked').length;

    for (const listing of listings) {
      const vehicle = vehicleById.get(listing.vehicleId);
      if (!vehicle) continue;

      const action = postingActionFor(listing, vehicle);
      if (!action) continue;

      const key = `${listing.id}:${action}`;
      if (activeJobKeys.has(key)) continue;

      const checks = action === 'remove'
        ? [{ key: 'remove_existing_listing', ok: true, message: 'Removal job is allowed for unavailable inventory.' }]
        : blockedPostingChecks({ listing, vehicle, rooftop });
      const failedChecks = checks.filter((check) => !check.ok);
      const scheduledFor = new Date(now.getTime() + scheduleIndex * account.spacingMinutes * 60 * 1000).toISOString();
      const job = {
        id: createId('posting_job'),
        rooftopId,
        listingId: listing.id,
        vehicleId: vehicle.id,
        accountId: account.id,
        action,
        status: failedChecks.length ? 'blocked' : 'pending',
        priority: priorityForPostingJob(action, vehicle),
        scheduledFor,
        claimedAt: null,
        completedAt: null,
        failedAt: null,
        snoozedUntil: null,
        liveUrl: null,
        lastError: failedChecks.map((check) => check.message).join(' '),
        complianceChecks: checks,
        metadata: {
          actor,
          vehicleLabel: vehicleLabel(vehicle),
          autoSubmitEnabled: account.autoSubmitEnabled,
          runner: account.settings?.runner ?? 'chrome_extension'
        },
        createdAt: nowIso(),
        updatedAt: nowIso(),
        attempts: []
      };

      await this.store.savePostingJob(job);
      activeJobKeys.add(key);

      if (job.status === 'blocked') {
        blockedJobs.push(job);
      } else {
        createdJobs.push(job);
        scheduleIndex += 1;
      }

      const queuedState = POSTING_ACTION_STATES[action]?.queued;
      if (queuedState && canTransitionListingState(listing.state, queuedState)) {
        await this.transitionListing(listing.id, queuedState, {
          actor,
          reason: `Posting ${action} job queued`,
          metadata: { postingJobId: job.id }
        });
      }
    }

    return { account, createdJobs, blockedJobs, existingActiveJobs: activeJobs };
  }

  async postingPayload(job) {
    const [listing, vehicle, account] = await Promise.all([
      this.getListing(job.listingId),
      this.getVehicle(job.vehicleId),
      job.accountId ? this.store.getPostingAccount(job.accountId) : null
    ]);
    return { job, listing, vehicle, account };
  }

  async claimPostingJob(jobId, { actor = 'chrome_extension' } = {}) {
    let job = await this.getPostingJob(jobId);
    if (!['pending', 'needs_manual_review'].includes(job.status)) {
      throw new Error(`Posting job ${job.id} cannot be claimed from ${job.status}`);
    }

    const now = nowIso();
    job = await this.store.savePostingJob({
      ...job,
      status: 'claimed',
      claimedAt: now,
      updatedAt: now,
      metadata: { ...job.metadata, claimedBy: actor }
    });

    const states = POSTING_ACTION_STATES[job.action];
    const listing = await this.getListing(job.listingId);
    if (states?.inProgress && canTransitionListingState(listing.state, states.inProgress)) {
      await this.transitionListing(listing.id, states.inProgress, {
        actor,
        reason: `Posting ${job.action} job claimed`,
        metadata: { postingJobId: job.id }
      });
    }

    return this.postingPayload(job);
  }

  async claimNextPostingJob({ rooftopId = null, actor = 'chrome_extension' } = {}) {
    const jobs = await this.store.listPostingJobs({ rooftopId, status: 'pending' });
    const now = Date.now();
    const job = jobs
      .filter((candidate) => (
        new Date(candidate.scheduledFor).getTime() <= now &&
        (!candidate.snoozedUntil || new Date(candidate.snoozedUntil).getTime() <= now)
      ))
      .sort((left, right) => (
        right.priority - left.priority ||
        new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime()
      ))[0];
    if (!job) {
      throw new Error('No pending posting jobs are available.');
    }

    return this.claimPostingJob(job.id, { actor });
  }

  async completePostingJob(jobId, payload = {}, { actor = 'chrome_extension' } = {}) {
    let job = await this.getPostingJob(jobId);
    const now = nowIso();
    const attempt = {
      id: createId('posting_attempt'),
      jobId: job.id,
      status: 'completed',
      method: payload.method ?? 'chrome_extension',
      startedAt: payload.startedAt ?? job.claimedAt ?? now,
      completedAt: now,
      result: payload.result ?? {},
      error: null,
      metadata: payload.metadata ?? {}
    };
    await this.store.savePostingAttempt(attempt);
    job = await this.store.savePostingJob({
      ...job,
      status: 'completed',
      completedAt: now,
      liveUrl: payload.liveUrl ?? payload.result?.liveUrl ?? job.liveUrl,
      lastError: null,
      updatedAt: now
    });

    const states = POSTING_ACTION_STATES[job.action];
    const listing = await this.getListing(job.listingId);
    if (states?.completed && canTransitionListingState(listing.state, states.completed)) {
      await this.transitionListing(listing.id, states.completed, {
        actor,
        reason: `Posting ${job.action} job completed`,
        metadata: { postingJobId: job.id, liveUrl: job.liveUrl }
      });
    }

    return this.postingPayload(job);
  }

  async failPostingJob(jobId, payload = {}, { actor = 'chrome_extension' } = {}) {
    let job = await this.getPostingJob(jobId);
    const now = nowIso();
    const attempt = {
      id: createId('posting_attempt'),
      jobId: job.id,
      status: 'failed',
      method: payload.method ?? 'chrome_extension',
      startedAt: payload.startedAt ?? job.claimedAt ?? now,
      completedAt: now,
      result: payload.result ?? {},
      error: payload.error ?? 'Posting job failed',
      metadata: payload.metadata ?? {}
    };
    await this.store.savePostingAttempt(attempt);
    job = await this.store.savePostingJob({
      ...job,
      status: payload.needsManualReview === false ? 'failed' : 'needs_manual_review',
      failedAt: now,
      lastError: attempt.error,
      updatedAt: now
    });

    const states = POSTING_ACTION_STATES[job.action];
    const listing = await this.getListing(job.listingId);
    if (states?.failed && canTransitionListingState(listing.state, states.failed)) {
      await this.transitionListing(listing.id, states.failed, {
        actor,
        reason: `Posting ${job.action} job failed`,
        metadata: { postingJobId: job.id, error: attempt.error }
      });
    }

    return this.postingPayload(job);
  }

  async snoozePostingJob(jobId, { minutes = 60, actor = 'dealer-app' } = {}) {
    const job = await this.getPostingJob(jobId);
    const now = nowIso();
    const snoozedUntil = new Date(Date.now() + Number(minutes || 60) * 60 * 1000).toISOString();
    const updated = await this.store.savePostingJob({
      ...job,
      status: 'snoozed',
      snoozedUntil,
      updatedAt: now,
      metadata: { ...job.metadata, snoozedBy: actor }
    });

    return this.postingPayload(updated);
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

  async createNotificationRecipient({ rooftopId, userId = null, channel, destination, label = null, rules = {}, isActive = true }) {
    if (!['sms', 'email'].includes(channel)) throw new Error(`Invalid notification channel '${channel}'`);
    if (!destination) throw new Error('Notification destination is required');
    return this.store.saveNotificationRecipient({
      id: createId('notification_recipient'),
      rooftopId,
      userId,
      channel,
      destination: destination.trim(),
      label: label?.trim() || null,
      rules: normalizeNotificationRules(rules),
      isActive: Boolean(isActive),
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  async updateNotificationRecipient(recipientId, updates = {}) {
    const recipient = await this.store.getNotificationRecipient(recipientId);
    if (!recipient) throw new Error(`Notification recipient ${recipientId} was not found`);

    return this.store.saveNotificationRecipient({
      ...recipient,
      label: updates.label === undefined
        ? recipient.label ?? null
        : (typeof updates.label === 'string' && updates.label.trim() ? updates.label.trim() : null),
      rules: normalizeNotificationRules(updates.rules ?? recipient.rules),
      isActive: updates.isActive === undefined ? recipient.isActive : Boolean(updates.isActive),
      updatedAt: nowIso()
    });
  }

  async composeLeadNotification(lead) {
    const vehicle = await this.getVehicle(lead.vehicleId);
    const subject = `New lead: ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}`;
    const text = [
      subject,
      lead.contactName ? `Contact: ${lead.contactName}` : null,
      lead.contactEmail ? `Email: ${lead.contactEmail}` : null,
      lead.contactPhone ? `Phone: ${lead.contactPhone}` : null,
      lead.sourceMessage ? `Message: ${lead.sourceMessage}` : null
    ].filter(Boolean).join('\n');
    return { subject, text, vehicle };
  }

  async sendLeadNotificationToRecipient(lead, recipient, existingDelivery = null) {
    const { subject, text } = await this.composeLeadNotification(lead);
    let delivery = existingDelivery ?? {
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
    delivery = { ...delivery, status: 'queued', updatedAt: nowIso() };
    await this.store.saveNotificationDelivery(delivery);
    try {
      if (!recipient.isActive) throw new Error('Notification recipient is inactive');
      const result = await this.notificationAdapter.send({
        channel: recipient.channel,
        destination: recipient.destination,
        subject,
        text
      });
      delivery = {
        ...delivery,
        channel: recipient.channel,
        status: 'sent',
        attempts: delivery.attempts + 1,
        providerId: result.providerId,
        lastError: null,
        updatedAt: nowIso()
      };
    } catch (error) {
      delivery = {
        ...delivery,
        channel: recipient.channel,
        status: 'failed',
        attempts: delivery.attempts + 1,
        lastError: error.message,
        updatedAt: nowIso()
      };
    }
    return this.store.saveNotificationDelivery(delivery);
  }

  async deliverLeadNotifications(lead) {
    const recipients = selectNotificationRecipients(
      await this.store.listNotificationRecipients({ rooftopId: lead.rooftopId, isActive: true })
    );

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
      return this.sendLeadNotificationToRecipient(lead, recipient, delivery);
    }));
  }

  async listNotificationDeliveries({ leadId, status } = {}) {
    return this.store.listNotificationDeliveries({ leadId, status });
  }

  async retryFailedLeadNotifications(leadId) {
    const lead = await this.getLead(leadId);
    const failedDeliveries = await this.store.listNotificationDeliveries({ leadId, status: 'failed' });
    return Promise.all(failedDeliveries.map(async (delivery) => {
      const recipient = await this.store.getNotificationRecipient(delivery.recipientId);
      if (!recipient) {
        return this.store.saveNotificationDelivery({
          ...delivery,
          attempts: delivery.attempts + 1,
          lastError: 'Notification recipient was not found',
          updatedAt: nowIso()
        });
      }
      return this.sendLeadNotificationToRecipient(lead, recipient, delivery);
    }));
  }

  async recordLeadEvent(leadId, type, metadata = {}) {
    const lead = await this.getLead(leadId);
    const updatedLead = appendLeadEvent(lead, type, metadata);
    return this.store.saveLead(updatedLead);
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
