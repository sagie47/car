export type Dealer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Rooftop = {
  id: string;
  dealerId: string;
  name: string;
  location: string | null;
  phone: string | null;
  logoUrl: string | null;
  disclaimerText: string | null;
  assignmentMode: string;
  rules: {
    minimumPhotos?: number;
    staleThresholdDays?: number;
    excludeStatuses?: string[];
  };
  createdAt: string;
};

export type InventorySource = {
  id: string;
  rooftopId: string;
  name: string;
  type: string;
  format: string;
  sourceUrl: string | null;
  sourceConfig: Record<string, unknown>;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncRun = {
  id: string;
  dealerId: string;
  rooftopId: string;
  inventorySourceId: string | null;
  sourceType: string;
  sourceName: string | null;
  status: string;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  rowsReceived: number;
  rowsImported: number;
  rowsSkipped: number;
  duplicateVins: string[];
  errors: Array<{ type?: string; vin?: string; reason: string }>;
};

export type Vehicle = {
  id: string;
  dealerId: string;
  rooftopId: string;
  vin: string;
  stockNumber: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  condition: string;
  mileage: number | null;
  price: number | null;
  bodyStyle: string;
  exteriorColor: string;
  interiorColor: string;
  photoUrls: string[];
  status: string;
  vdpUrl: string;
  salespersonAssignment: string;
  carfaxUrl: string;
  optionsList: string[];
  drivetrain: string;
  transmission: string;
  fuelType: string;
  engine: string;
  daysInInventory: number | null;
  featured: boolean;
  priceHistory: Array<{ amount: number; changedAt: string | null }>;
  rawSource: Record<string, unknown>;
  naturalKey: string;
  sourceFingerprint: string;
  syncIssues: Array<Record<string, unknown>>;
  isStale: boolean;
  eligibility: {
    status: 'eligible' | 'eligible_with_warning' | 'blocked';
    reasons: string[];
    warnings: string[];
    checkedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  snapshots: Array<{
    id: string;
    syncRunId: string;
    capturedAt: string;
    fingerprint: string;
    rawSource: Record<string, unknown>;
  }>;
};

export type ListingEvent = {
  id: string;
  fromState: string | null;
  toState: string;
  actor: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  eventType: string;
  createdAt: string;
};

export type Listing = {
  id: string;
  vehicleId: string;
  rooftopId: string;
  state: string;
  draft: {
    title: string;
    shortDescription: string;
    longDescription: string;
    marketplacePost?: {
      channel: string;
      workflow: string;
      title: string;
      price: number | null;
      category: string;
      description: string;
      contactBlock: string;
      photoUrls: string[];
      checklist: string[];
      copyBlocks: {
        title: string;
        price: string;
        description: string;
      };
    };
    ctaBlock: string;
    tonePreset: string;
    photoOrderRecommendation: Array<{ url: string; position: number; reason: string }>;
    assets: Array<Record<string, unknown>>;
    generator: {
      modelUsed: string;
      promptVersion: string;
      createdAt: string;
      approvedBy: string | null;
      autoApproved: boolean;
    };
    overrides?: {
      title: string | null;
      price: number | null;
      description: string | null;
      photoUrls: string[] | null;
      updatedAt: string | null;
      updatedBy: string | null;
    };
  };
  createdAt: string;
  updatedAt: string;
  events: ListingEvent[];
};

export type PostingAccount = {
  id: string;
  rooftopId: string;
  platform: string;
  label: string;
  status: string;
  dailyCapacity: number;
  spacingMinutes: number;
  autoSubmitEnabled: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PostingAttempt = {
  id: string;
  jobId: string;
  status: string;
  method: string;
  startedAt: string;
  completedAt: string | null;
  result: Record<string, unknown>;
  error: string | null;
  metadata: Record<string, unknown>;
};

export type PostingJob = {
  id: string;
  rooftopId: string;
  listingId: string;
  vehicleId: string;
  accountId: string | null;
  action: 'publish' | 'update' | 'remove' | string;
  status: string;
  priority: number;
  scheduledFor: string;
  claimedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  snoozedUntil: string | null;
  liveUrl: string | null;
  lastError: string | null;
  complianceChecks: Array<{ key: string; ok: boolean; message: string }>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attempts: PostingAttempt[];
};

export type PostingPayload = {
  job: PostingJob;
  listing: Listing;
  vehicle: Vehicle;
  account: PostingAccount | null;
};

export type LeadEvent = {
  id: string;
  type: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Lead = {
  id: string;
  vehicleId: string;
  rooftopId: string;
  sourceChannel: string;
  sourceSubchannel: string | null;
  assignedRepId: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  status: string;
  disposition: string | null;
  appointmentSet: boolean;
  sold: boolean;
  attributedValue: number | null;
  suggestedResponse: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceMessage: string | null;
  externalId: string | null;
  events: LeadEvent[];
};

export type NotificationRecipient = {
  id: string;
  rooftopId: string;
  userId: string | null;
  channel: 'sms' | 'email';
  destination: string;
  label: string | null;
  rules: {
    sendWindow?: 'always' | 'business_hours';
    timezone?: string;
    businessHours?: {
      days?: number[];
      start?: string;
      end?: string;
    };
    fallback?: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationDelivery = {
  id: string;
  leadId: string;
  recipientId: string;
  channel: 'sms' | 'email';
  status: string;
  attempts: number;
  providerId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Health = {
  score: number;
  totalVehicles: number;
  metrics: {
    requiredFieldsPct: number;
    eligiblePct: number;
    missingPricePct: number;
    insufficientPhotosPct: number;
    stalePct: number;
    unresolvedSyncIssuePct: number;
  };
};

export type RooftopDashboard = {
  rooftop: Rooftop;
  health: Health;
  latestSyncRun: SyncRun | null;
  inventorySources: InventorySource[];
  vehicleCounts: {
    total: number;
    eligible: number;
    blocked: number;
    withWarnings: number;
    stale: number;
    withSyncIssues: number;
  };
  listingCounts: {
    total: number;
    active: number;
    published: number;
    needingAttention: number;
    byState: Record<string, number>;
  };
  leadCounts: {
    total: number;
    unassigned: number;
    byStatus: Record<string, number>;
  };
};
