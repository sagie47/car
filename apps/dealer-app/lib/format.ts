import type { Lead, Listing, SyncRun, Vehicle } from './types';

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatCurrency(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 'No price';
  }

  const numericValue = value as number;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(numericValue);
}

export function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const numericValue = value as number;

  return new Intl.NumberFormat('en-US').format(numericValue);
}

export function vehicleLabel(vehicle: Vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || vehicle.vin;
}

export function syncRunLabel(syncRun: SyncRun | null | undefined) {
  if (!syncRun) {
    return 'No sync yet';
  }

  return `${syncRun.status} • ${formatDateTime(syncRun.completedAt ?? syncRun.startedAt)}`;
}

export function listingLabel(listing: Listing) {
  return `${listing.state.replace(/_/g, ' ')} • ${formatDateTime(listing.updatedAt)}`;
}

export function leadLabel(lead: Lead) {
  return `${lead.status.replace(/_/g, ' ')} • ${formatDateTime(lead.createdAt)}`;
}
