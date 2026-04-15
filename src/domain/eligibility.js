import { nowIso } from '../lib/utils.js';

const BLOCKING_STATUSES = new Set(['sold', 'reserved', 'wholesale', 'in_transit']);

export function isVehicleStale(vehicle, rules = {}) {
  const staleThresholdDays = rules.staleThresholdDays ?? 45;
  const daysInInventory = Number(vehicle.daysInInventory ?? 0);

  return Number.isFinite(daysInInventory) && daysInInventory >= staleThresholdDays;
}

export function evaluateVehicleEligibility(vehicle, rules = {}) {
  const reasons = [];
  const warnings = [];
  const minimumPhotos = rules.minimumPhotos ?? 5;
  const excludedStatuses = new Set(
    (rules.excludeStatuses ?? ['sold', 'reserved', 'wholesale', 'in_transit']).map((value) =>
      String(value).toLowerCase()
    )
  );
  const status = String(vehicle.status ?? '').toLowerCase();
  const photoCount = Array.isArray(vehicle.photoUrls) ? vehicle.photoUrls.length : 0;

  if (!vehicle.vin) {
    reasons.push('VIN is required');
  }

  if (!vehicle.year) {
    reasons.push('Year is required');
  }

  if (!vehicle.make) {
    reasons.push('Make is required');
  }

  if (!vehicle.model) {
    reasons.push('Model is required');
  }

  if (!status) {
    reasons.push('Vehicle status is required');
  }

  if (!(vehicle.price > 0)) {
    reasons.push('Price is required');
  }

  if (photoCount < minimumPhotos) {
    reasons.push(`Minimum ${minimumPhotos} photos required`);
  } else if (photoCount === minimumPhotos) {
    warnings.push('Vehicle only meets the minimum photo threshold');
  }

  if (BLOCKING_STATUSES.has(status) || excludedStatuses.has(status)) {
    reasons.push(`Vehicle status '${status}' is excluded`);
  }

  if (!vehicle.bodyStyle) {
    warnings.push('Body style is missing');
  }

  if (!vehicle.exteriorColor) {
    warnings.push('Exterior color is missing');
  }

  if (!(vehicle.mileage >= 0)) {
    warnings.push('Mileage is missing');
  }

  if (isVehicleStale(vehicle, rules)) {
    warnings.push('Vehicle is stale and should be reviewed for a booster campaign');
  }

  return {
    status: reasons.length > 0 ? 'blocked' : warnings.length > 0 ? 'eligible_with_warning' : 'eligible',
    reasons,
    warnings,
    checkedAt: nowIso()
  };
}
