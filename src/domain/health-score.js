import { evaluateVehicleEligibility, isVehicleStale } from './eligibility.js';

function percent(part, total) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function hasRequiredFields(vehicle, minimumPhotos) {
  return Boolean(
    vehicle.vin &&
      vehicle.year &&
      vehicle.make &&
      vehicle.model &&
      vehicle.price > 0 &&
      Array.isArray(vehicle.photoUrls) &&
      vehicle.photoUrls.length >= minimumPhotos
  );
}

export function calculateInventoryHealth(vehicles, rules = {}) {
  const minimumPhotos = rules.minimumPhotos ?? 5;
  const totalVehicles = vehicles.length;

  if (!totalVehicles) {
    return {
      score: 0,
      totalVehicles: 0,
      metrics: {
        requiredFieldsPct: 0,
        eligiblePct: 0,
        missingPricePct: 0,
        insufficientPhotosPct: 0,
        stalePct: 0,
        unresolvedSyncIssuePct: 0
      }
    };
  }

  let requiredFieldsCount = 0;
  let eligibleCount = 0;
  let missingPriceCount = 0;
  let insufficientPhotosCount = 0;
  let staleCount = 0;
  let unresolvedSyncIssueCount = 0;

  for (const vehicle of vehicles) {
    const eligibility = vehicle.eligibility ?? evaluateVehicleEligibility(vehicle, rules);

    if (hasRequiredFields(vehicle, minimumPhotos)) {
      requiredFieldsCount += 1;
    }

    if (eligibility.status !== 'blocked') {
      eligibleCount += 1;
    }

    if (!(vehicle.price > 0)) {
      missingPriceCount += 1;
    }

    if ((vehicle.photoUrls?.length ?? 0) < minimumPhotos) {
      insufficientPhotosCount += 1;
    }

    if (isVehicleStale(vehicle, rules)) {
      staleCount += 1;
    }

    if ((vehicle.syncIssues?.length ?? 0) > 0) {
      unresolvedSyncIssueCount += 1;
    }
  }

  const metrics = {
    requiredFieldsPct: percent(requiredFieldsCount, totalVehicles),
    eligiblePct: percent(eligibleCount, totalVehicles),
    missingPricePct: percent(missingPriceCount, totalVehicles),
    insufficientPhotosPct: percent(insufficientPhotosCount, totalVehicles),
    stalePct: percent(staleCount, totalVehicles),
    unresolvedSyncIssuePct: percent(unresolvedSyncIssueCount, totalVehicles)
  };

  const score = Math.round(
    metrics.requiredFieldsPct * 0.25 +
      metrics.eligiblePct * 0.25 +
      (100 - metrics.missingPricePct) * 0.15 +
      (100 - metrics.insufficientPhotosPct) * 0.15 +
      (100 - metrics.stalePct) * 0.1 +
      (100 - metrics.unresolvedSyncIssuePct) * 0.1
  );

  return {
    score,
    totalVehicles,
    metrics
  };
}
