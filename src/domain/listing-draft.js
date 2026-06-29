import { formatCurrency, nowIso } from '../lib/utils.js';
import { isVehicleStale } from './eligibility.js';

function titleFromVehicle(vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
}

function marketplaceTitleFromVehicle(vehicle) {
  const baseTitle = titleFromVehicle(vehicle);
  const mileageText = Number.isFinite(vehicle.mileage) ? `${Math.round(vehicle.mileage / 1000)}k mi` : null;
  const priceText = Number.isFinite(vehicle.price) ? formatCurrency(vehicle.price) : null;

  return [baseTitle, mileageText, priceText].filter(Boolean).join(' · ');
}

function marketplaceContactBlock(rooftop = {}) {
  const contactRooftop = rooftop ?? {};
  const lines = [
    contactRooftop.name ? `Dealer: ${contactRooftop.name}` : null,
    contactRooftop.location ? `Location: ${contactRooftop.location}` : null,
    contactRooftop.phone ? `Call/Text: ${contactRooftop.phone}` : null
  ].filter(Boolean);

  return lines.length ? lines.join('\n') : 'Message for availability, location, and next steps.';
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

function buildMarketplaceDescription(vehicle, { tonePreset, rooftop, stale }) {
  const lines = [
    `${titleFromVehicle(vehicle) || 'Vehicle'} available now.`,
    Number.isFinite(vehicle.price) ? `Price: ${formatCurrency(vehicle.price)}` : null,
    Number.isFinite(vehicle.mileage) ? `Mileage: ${vehicle.mileage.toLocaleString()} miles` : null,
    vehicle.stockNumber ? `Stock #: ${vehicle.stockNumber}` : null,
    vehicle.bodyStyle ? `Body style: ${vehicle.bodyStyle}` : null,
    vehicle.exteriorColor ? `Exterior color: ${vehicle.exteriorColor}` : null,
    vehicle.transmission ? `Transmission: ${vehicle.transmission}` : null,
    vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : null
  ].filter(Boolean);

  if (tonePreset === 'premium') {
    lines.push('Clean presentation, fast follow-up, and ready for your next drive.');
  } else if (tonePreset === 'value-focused') {
    lines.push('Priced for value and ready for a quick local appointment.');
  } else {
    lines.push('Message for availability and the fastest next step.');
  }

  if (stale) {
    lines.push('Ask about updated pricing, fresh media, and current availability.');
  }

  lines.push('', marketplaceContactBlock(rooftop));

  return lines.join('\n');
}

function buildMarketplaceChecklist(vehicle) {
  return [
    'Confirm price, mileage, and stock number match the dealer site before posting.',
    'Use exterior front photo first, then interior, odometer, and high-value detail shots.',
    Number.isFinite(vehicle.price) && vehicle.price <= 15000
      ? 'Mention the value price clearly because this unit fits the Marketplace sweet spot.'
      : 'Be ready to qualify buyer seriousness because higher-priced units may attract lower-quality leads.',
    'Copy the title, price, description, and contact block into Facebook Marketplace.',
    'Mark the listing as queued for publish only after dealer approval.'
  ];
}

function buildMarketplacePost(vehicle, options) {
  const stale = options.stale;
  const description = buildMarketplaceDescription(vehicle, options);

  return {
    channel: 'facebook_marketplace',
    workflow: 'copy_and_approve',
    title: marketplaceTitleFromVehicle(vehicle),
    price: Number.isFinite(vehicle.price) ? vehicle.price : null,
    category: 'Vehicles',
    description,
    contactBlock: marketplaceContactBlock(options.rooftop),
    photoUrls: vehicle.photoUrls,
    checklist: buildMarketplaceChecklist(vehicle),
    copyBlocks: {
      title: marketplaceTitleFromVehicle(vehicle),
      price: Number.isFinite(vehicle.price) ? String(vehicle.price) : '',
      description
    }
  };
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

function applyOverrides(draft, overrides = {}) {
  const marketplacePost = {
    ...draft.marketplacePost,
    title: overrides.title ?? draft.marketplacePost.title,
    price: overrides.price ?? draft.marketplacePost.price,
    description: overrides.description ?? draft.marketplacePost.description,
    photoUrls: overrides.photoUrls ?? draft.marketplacePost.photoUrls
  };

  marketplacePost.copyBlocks = {
    title: marketplacePost.title,
    price: marketplacePost.price === null ? '' : String(marketplacePost.price),
    description: marketplacePost.description
  };

  return {
    ...draft,
    marketplacePost,
    overrides: {
      title: overrides.title ?? null,
      price: overrides.price ?? null,
      description: overrides.description ?? null,
      photoUrls: overrides.photoUrls ?? null,
      updatedAt: overrides.updatedAt ?? null,
      updatedBy: overrides.updatedBy ?? null
    }
  };
}

export function buildListingDraft(vehicle, options = {}) {
  const tonePreset = options.tonePreset ?? 'straightforward';
  const stale = isVehicleStale(vehicle, options.rules);
  const marketplacePost = buildMarketplacePost(vehicle, {
    tonePreset,
    stale,
    rooftop: options.rooftop ?? null
  });

  const draft = {
    title: titleFromVehicle(vehicle),
    shortDescription: shortDescriptionForTone(vehicle, tonePreset),
    longDescription: longDescriptionForVehicle(vehicle, tonePreset),
    marketplacePost,
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
      promptVersion: 'marketplace-copy-and-approve-v1',
      createdAt: nowIso(),
      approvedBy: null,
      autoApproved: false
    }
  };

  return applyOverrides(draft, options.overrides);
}

export function updateListingDraftOverrides(draft, updates, { actor, updatedAt = nowIso() } = {}) {
  const existing = draft.overrides ?? {};
  const overrides = {
    ...existing,
    ...updates,
    updatedAt,
    updatedBy: actor ?? existing.updatedBy ?? 'system'
  };

  return applyOverrides({ ...draft, marketplacePost: { ...draft.marketplacePost } }, overrides);
}
