import { createId, nowIso } from '../lib/utils.js';

const ALLOWED_TRANSITIONS = {
  draft_created: ['queued_for_publish', 'needs_manual_review', 'suppressed_unknown'],
  queued_for_publish: ['publish_in_progress', 'publish_failed', 'needs_manual_review'],
  publish_in_progress: ['published', 'publish_failed', 'needs_manual_review'],
  published: ['queued_for_update', 'queued_for_remove', 'needs_manual_review', 'suppressed_unknown'],
  publish_failed: ['queued_for_publish', 'needs_manual_review'],
  queued_for_update: ['update_in_progress', 'needs_manual_review'],
  update_in_progress: ['updated', 'needs_manual_review'],
  updated: ['published', 'queued_for_update', 'queued_for_remove', 'needs_manual_review'],
  queued_for_remove: ['remove_in_progress', 'removal_failed', 'needs_manual_review'],
  remove_in_progress: ['removed', 'removal_failed', 'needs_manual_review'],
  removed: [],
  removal_failed: ['queued_for_remove', 'needs_manual_review'],
  suppressed_unknown: ['draft_created', 'needs_manual_review'],
  needs_manual_review: [
    'draft_created',
    'queued_for_publish',
    'queued_for_update',
    'queued_for_remove',
    'suppressed_unknown'
  ]
};

function createEvent(fromState, toState, metadata = {}) {
  return {
    id: createId('listing_event'),
    fromState,
    toState,
    actor: metadata.actor ?? 'system',
    reason: metadata.reason ?? null,
    metadata: metadata.metadata ?? {},
    createdAt: nowIso()
  };
}

export function createInitialListing(vehicle, draft) {
  return {
    id: createId('listing'),
    vehicleId: vehicle.id,
    rooftopId: vehicle.rooftopId,
    state: 'draft_created',
    draft,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    events: [createEvent(null, 'draft_created', { actor: 'system', reason: 'Draft created' })]
  };
}

export function canTransitionListingState(fromState, toState) {
  return (ALLOWED_TRANSITIONS[fromState] ?? []).includes(toState);
}

export function transitionListingState(listing, toState, metadata = {}) {
  if (!canTransitionListingState(listing.state, toState)) {
    throw new Error(`Invalid listing transition from ${listing.state} to ${toState}`);
  }

  return {
    ...listing,
    state: toState,
    updatedAt: nowIso(),
    events: [...listing.events, createEvent(listing.state, toState, metadata)]
  };
}
