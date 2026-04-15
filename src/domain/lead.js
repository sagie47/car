import { createId, nowIso } from '../lib/utils.js';

const VALID_LEAD_STATUSES = new Set([
  'new',
  'acknowledged',
  'responded',
  'appointment_set',
  'no_show',
  'dead',
  'sold',
  'lost'
]);

function createLeadEvent(type, metadata = {}) {
  return {
    id: createId('lead_event'),
    type,
    actor: metadata.actor ?? 'system',
    metadata,
    createdAt: nowIso()
  };
}

export function buildSuggestedResponse(vehicle) {
  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
  const stockBlock = vehicle.stockNumber ? ` on stock #${vehicle.stockNumber}` : '';

  return `Thanks for reaching out about the ${title}${stockBlock}. It is currently being reviewed for availability. I can help with price, mileage, and the next open appointment.`;
}

export function createLeadRecord(payload, vehicle) {
  const status = payload.status ?? 'new';

  if (!VALID_LEAD_STATUSES.has(status)) {
    throw new Error(`Invalid lead status '${status}'`);
  }

  return {
    id: createId('lead'),
    sourceChannel: payload.sourceChannel,
    sourceSubchannel: payload.sourceSubchannel ?? null,
    vehicleId: payload.vehicleId,
    rooftopId: payload.rooftopId,
    assignedRepId: payload.assignedRepId ?? null,
    createdAt: nowIso(),
    firstResponseAt: null,
    status,
    disposition: payload.disposition ?? null,
    appointmentSet: Boolean(payload.appointmentSet),
    sold: Boolean(payload.sold),
    attributedValue: payload.attributedValue ?? null,
    suggestedResponse: payload.suggestedResponse ?? buildSuggestedResponse(vehicle),
    events: [createLeadEvent('created')]
  };
}

export function assignLeadRecord(lead, assignedRepId, actor = 'system') {
  return {
    ...lead,
    assignedRepId,
    events: [...lead.events, createLeadEvent('assigned', { actor, assignedRepId })]
  };
}

export function updateLeadStatusRecord(lead, status, metadata = {}) {
  if (!VALID_LEAD_STATUSES.has(status)) {
    throw new Error(`Invalid lead status '${status}'`);
  }

  return {
    ...lead,
    status,
    appointmentSet: status === 'appointment_set' ? true : lead.appointmentSet,
    sold: status === 'sold' ? true : lead.sold,
    firstResponseAt:
      status === 'responded' && !lead.firstResponseAt ? nowIso() : lead.firstResponseAt,
    events: [...lead.events, createLeadEvent('status_changed', { actor: metadata.actor ?? 'system', status })]
  };
}
