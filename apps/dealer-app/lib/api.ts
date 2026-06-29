import type {
  Dealer,
  Health,
  InventorySource,
  Lead,
  NotificationDelivery,
  NotificationRecipient,
  Listing,
  PostingJob,
  PostingPayload,
  Rooftop,
  RooftopDashboard,
  SyncRun,
  Vehicle
} from './types';

const CLIENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
const SERVER_API_BASE_URL = (process.env.LOT_PILOT_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');

type ApiError = Error & { syncRunId?: string | null };

function buildUrl(path: string) {
  if (typeof window !== 'undefined') {
    return CLIENT_API_BASE_URL ? `${CLIENT_API_BASE_URL}${path}` : path;
  }
  return `${CLIENT_API_BASE_URL ?? SERVER_API_BASE_URL}${path}`;
}

async function getAccessToken() {
  if (typeof window !== 'undefined') {
    const { getBrowserSupabase } = await import('./supabase-browser');
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  return process.env.LOT_PILOT_SERVER_API_TOKEN ?? null;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; syncRunId?: string | null };
    const error = new Error(payload.error ?? `Request failed with status ${response.status}`) as ApiError;
    error.syncRunId = payload.syncRunId ?? null;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error;
}

export async function listDealers(): Promise<Dealer[]> {
  return requestJson<Dealer[]>('/api/dealers');
}

export async function getDealer(dealerId: string): Promise<Dealer> {
  return requestJson<Dealer>(`/api/dealers/${dealerId}`);
}

export async function createDealer(payload: { name: string }) {
  return requestJson<Dealer>('/api/dealers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function setupFromInventoryUrl(payload: { inventoryUrl: string }) {
  return requestJson<{
    dealer: Dealer;
    rooftop: Rooftop;
    inventorySource: InventorySource;
    syncRun: SyncRun;
    summary: {
      createdVehicles: number;
      updatedVehicles: number;
      createdListings: number;
      queuedForRemoval: number;
    };
    health: Health;
    inferred: {
      dealerName: string;
      sourceUrl: string;
    };
  }>('/api/setup/inventory-url', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listRooftops(dealerId?: string | null): Promise<Rooftop[]> {
  const query = dealerId ? `?dealerId=${encodeURIComponent(dealerId)}` : '';
  return requestJson<Rooftop[]>(`/api/rooftops${query}`);
}

export async function getRooftop(rooftopId: string): Promise<Rooftop> {
  return requestJson<Rooftop>(`/api/rooftops/${rooftopId}`);
}

export async function createRooftop(payload: {
  dealerId: string;
  name: string;
  location?: string;
  phone?: string;
  rules?: Rooftop['rules'];
}) {
  return requestJson<Rooftop>('/api/rooftops', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getRooftopHealth(rooftopId: string): Promise<Health> {
  return requestJson<Health>(`/api/rooftops/${rooftopId}/health`);
}

export async function getRooftopDashboard(rooftopId: string): Promise<RooftopDashboard> {
  return requestJson<RooftopDashboard>(`/api/rooftops/${rooftopId}/dashboard`);
}

export async function listStaleVehicles(rooftopId: string): Promise<Vehicle[]> {
  return requestJson<Vehicle[]>(`/api/rooftops/${rooftopId}/stale-vehicles`);
}

export async function listInventorySources(rooftopId?: string | null): Promise<InventorySource[]> {
  const query = rooftopId ? `?rooftopId=${encodeURIComponent(rooftopId)}` : '';
  return requestJson<InventorySource[]>(`/api/inventory-sources${query}`);
}

export async function getInventorySource(inventorySourceId: string): Promise<InventorySource> {
  return requestJson<InventorySource>(`/api/inventory-sources/${inventorySourceId}`);
}

export async function createInventorySource(payload: {
  rooftopId: string;
  name: string;
  type: string;
  format: string;
  sourceUrl?: string | null;
  sourceConfig?: Record<string, unknown>;
  isActive?: boolean;
}) {
  return requestJson<InventorySource>('/api/inventory-sources', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function uploadCsvInventorySource(inventorySourceId: string, csvText: string, fileName: string) {
  return requestJson<InventorySource>(`/api/inventory-sources/${inventorySourceId}/csv`, {
    method: 'POST',
    body: JSON.stringify({ csvText, fileName })
  });
}

export async function syncInventorySource(inventorySourceId: string) {
  return requestJson<{
    inventorySource: InventorySource;
    syncRun: SyncRun;
    summary: {
      createdVehicles: number;
      updatedVehicles: number;
      createdListings: number;
      queuedForRemoval: number;
    };
    health: Health;
  }>(`/api/inventory-sources/${inventorySourceId}/sync`, {
    method: 'POST'
  });
}

export async function listSyncRuns(options: {
  rooftopId?: string | null;
  inventorySourceId?: string | null;
  status?: string | null;
} = {}): Promise<SyncRun[]> {
  const params = new URLSearchParams();
  if (options.rooftopId) params.set('rooftopId', options.rooftopId);
  if (options.inventorySourceId) params.set('inventorySourceId', options.inventorySourceId);
  if (options.status) params.set('status', options.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  return requestJson<SyncRun[]>(`/api/sync-runs${query}`);
}

export async function getSyncRun(syncRunId: string): Promise<SyncRun> {
  return requestJson<SyncRun>(`/api/sync-runs/${syncRunId}`);
}

export async function listVehicles(rooftopId?: string | null): Promise<Vehicle[]> {
  const query = rooftopId ? `?rooftopId=${encodeURIComponent(rooftopId)}` : '';
  return requestJson<Vehicle[]>(`/api/vehicles${query}`);
}

export async function getVehicle(vehicleId: string): Promise<Vehicle> {
  return requestJson<Vehicle>(`/api/vehicles/${vehicleId}`);
}

export async function listListings(rooftopId?: string | null): Promise<Listing[]> {
  const query = rooftopId ? `?rooftopId=${encodeURIComponent(rooftopId)}` : '';
  return requestJson<Listing[]>(`/api/listings${query}`);
}

export async function getListing(listingId: string): Promise<Listing> {
  return requestJson<Listing>(`/api/listings/${listingId}`);
}

export async function transitionListing(
  listingId: string,
  payload: { toState: string; actor?: string; reason?: string; metadata?: Record<string, unknown> }
) {
  return requestJson<Listing>(`/api/listings/${listingId}/transitions`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateListingDraft(
  listingId: string,
  payload: { title?: string; price?: number | null; description?: string; photoUrls?: string[] }
) {
  return requestJson<Listing>(`/api/listings/${listingId}/draft`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function recordListingActivity(listingId: string, type: 'copied' | 'exported', metadata: Record<string, unknown>) {
  return requestJson<Listing>(`/api/listings/${listingId}/activities`, {
    method: 'POST',
    body: JSON.stringify({ type, metadata })
  });
}

export async function listPostingJobs(options: {
  rooftopId?: string | null;
  status?: string | null;
  active?: boolean;
} = {}): Promise<PostingJob[]> {
  const params = new URLSearchParams();
  if (options.rooftopId) params.set('rooftopId', options.rooftopId);
  if (options.status) params.set('status', options.status);
  if (options.active !== undefined) params.set('active', String(options.active));

  const query = params.toString() ? `?${params.toString()}` : '';
  return requestJson<PostingJob[]>(`/api/posting-jobs${query}`);
}

export async function rebuildPostingQueue(rooftopId: string) {
  return requestJson<{
    account: {
      id: string;
      label: string;
      platform: string;
      dailyCapacity: number;
      spacingMinutes: number;
      autoSubmitEnabled: boolean;
    };
    createdJobs: PostingJob[];
    blockedJobs: PostingJob[];
    existingActiveJobs: PostingJob[];
  }>(`/api/rooftops/${rooftopId}/posting-jobs/rebuild`, {
    method: 'POST',
    body: JSON.stringify({ actor: 'dealer-app' })
  });
}

export async function claimPostingJob(jobId: string) {
  return requestJson<PostingPayload>(`/api/posting-jobs/${jobId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ actor: 'dealer-app' })
  });
}

export async function claimNextPostingJob(rooftopId?: string | null) {
  return requestJson<PostingPayload>('/api/posting-jobs/claim-next', {
    method: 'POST',
    body: JSON.stringify({ rooftopId, actor: 'dealer-app' })
  });
}

export async function completePostingJob(jobId: string, payload: Record<string, unknown>) {
  return requestJson<PostingPayload>(`/api/posting-jobs/${jobId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, actor: 'dealer-app' })
  });
}

export async function failPostingJob(jobId: string, payload: Record<string, unknown>) {
  return requestJson<PostingPayload>(`/api/posting-jobs/${jobId}/fail`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, actor: 'dealer-app' })
  });
}

export async function snoozePostingJob(jobId: string, minutes = 60) {
  return requestJson<PostingPayload>(`/api/posting-jobs/${jobId}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes, actor: 'dealer-app' })
  });
}

export async function listLeads(options: { rooftopId?: string | null; status?: string | null } = {}) {
  const params = new URLSearchParams();
  if (options.rooftopId) params.set('rooftopId', options.rooftopId);
  if (options.status) params.set('status', options.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  return requestJson<Lead[]>(`/api/leads${query}`);
}

export async function getLead(leadId: string): Promise<Lead> {
  return requestJson<Lead>(`/api/leads/${leadId}`);
}

export async function assignLead(leadId: string, assignedRepId: string, actor = 'dealer-app') {
  return requestJson<Lead>(`/api/leads/${leadId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({
      assignedRepId,
      actor
    })
  });
}

export async function updateLeadStatus(leadId: string, status: string, actor = 'dealer-app') {
  return requestJson<Lead>(`/api/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      actor
    })
  });
}

export async function createLead(payload: {
  rooftopId: string;
  vehicleId: string;
  sourceChannel: string;
  sourceSubchannel?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sourceMessage?: string | null;
}) {
  return requestJson<Lead>('/api/leads', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listNotificationRecipients(rooftopId: string) {
  return requestJson<NotificationRecipient[]>(`/api/rooftops/${rooftopId}/notification-recipients`);
}

export async function createNotificationRecipient(
  rooftopId: string,
  payload: {
    channel: 'sms' | 'email';
    destination: string;
    label?: string | null;
    rules?: NotificationRecipient['rules'];
    isActive?: boolean;
  }
) {
  return requestJson<NotificationRecipient>(`/api/rooftops/${rooftopId}/notification-recipients`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateNotificationRecipient(
  recipientId: string,
  payload: {
    label?: string | null;
    rules?: NotificationRecipient['rules'];
    isActive?: boolean;
  }
) {
  return requestJson<NotificationRecipient>(`/api/notification-recipients/${recipientId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function listLeadNotificationDeliveries(leadId: string) {
  return requestJson<NotificationDelivery[]>(`/api/leads/${leadId}/notification-deliveries`);
}

export async function retryLeadNotifications(leadId: string) {
  return requestJson<NotificationDelivery[]>(`/api/leads/${leadId}/notifications/retry`, {
    method: 'POST'
  });
}

export async function recordLeadEvent(leadId: string, type: string, metadata: Record<string, unknown>) {
  return requestJson<Lead>(`/api/leads/${leadId}/events`, {
    method: 'POST',
    body: JSON.stringify({ type, metadata })
  });
}
