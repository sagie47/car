import { formatCurrency, nowIso } from '../lib/utils.js';
import { isVehicleStale } from './eligibility.js';

function titleFromVehicle(vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
}

function shortDescriptionForTone(vehicle, tonePreset) {
  const priceText = formatCurrency(vehicle.price);
  const mileageText = Number.isFinite(vehicle.mileage) ? `${vehicle.mileage.toLocaleString()} miles` : null;
  const parts = [titleFromVehicle(vehicle), mileageText, priceText].filter(Boolean);

  if (tonePreset === 'premium') {
    return `${parts.join(' | ')}. Clean presentation, fast follow-up, and ready for your next drive.`;
  }

  if (tonePreset === 'value-focused') {
    return `${parts.join(' | ')}. Strong value and ready for a quick conversation today.`;
  }

  return `${parts.join(' | ')}. Message for availability and next steps.`;
}

function longDescriptionForVehicle(vehicle, tonePreset) {
  const lines = [
    `Vehicle: ${titleFromVehicle(vehicle) || 'Unknown vehicle'}`,
    vehicle.stockNumber ? `Stock #: ${vehicle.stockNumber}` : null,
    Number.isFinite(vehicle.price) ? `Price: ${formatCurrency(vehicle.price)}` : null,
    Number.isFinite(vehicle.mileage) ? `Mileage: ${vehicle.mileage.toLocaleString()} miles` : null,
    vehicle.bodyStyle ? `Body style: ${vehicle.bodyStyle}` : null,
    vehicle.exteriorColor ? `Exterior color: ${vehicle.exteriorColor}` : null,
    vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : null,
    vehicle.transmission ? `Transmission: ${vehicle.transmission}` : null
  ].filter(Boolean);

  if (tonePreset === 'premium') {
    lines.push('Reach out for a walkaround, exact availability, and the next open appointment.');
  } else if (tonePreset === 'value-focused') {
    lines.push('Ask about current availability, trade value, and the fastest way to secure this unit.');
  } else {
    lines.push('Message for availability, next-step details, and a quick reply from the dealership.');
  }

  return lines.join('\n');
}

function buildPhotoOrderRecommendation(vehicle) {
  return vehicle.photoUrls.map((url, index) => ({
    url,
    position: index + 1,
    reason:
      index === 0
        ? 'Lead with the strongest photo for the hero image.'
        : index < 5
          ? 'Keep high-value images early in the sequence.'
          : 'Useful supporting image.'
  }));
}

export function buildListingDraft(vehicle, options = {}) {
  const tonePreset = options.tonePreset ?? 'straightforward';
  const stale = isVehicleStale(vehicle, options.rules);

  return {
    title: titleFromVehicle(vehicle),
    shortDescription: shortDescriptionForTone(vehicle, tonePreset),
    longDescription: longDescriptionForVehicle(vehicle, tonePreset),
    ctaBlock: stale
      ? 'Ask about updated pricing, fresh media, and the fastest way to claim this unit.'
      : 'Message now for availability, walkaround details, and the next open appointment.',
    tonePreset,
    photoOrderRecommendation: buildPhotoOrderRecommendation(vehicle),
    assets: [
      {
        type: 'hero_overlay',
        status: 'ready',
        facts: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          price: vehicle.price,
          mileage: vehicle.mileage
        }
      },
      ...(stale
        ? [
            {
              type: 'stale_unit_video',
              status: 'queued',
              aspectRatio: '9:16',
              durationSeconds: 20
            }
          ]
        : [])
    ],
    generator: {
      modelUsed: 'rule-based-v1',
      promptVersion: 'inventory-template-v1',
      createdAt: nowIso(),
      approvedBy: null,
      autoApproved: true
    }
  };
}
