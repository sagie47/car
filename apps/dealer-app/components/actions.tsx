'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  assignLead,
  createDealer,
  createInventorySource,
  createRooftop,
  isApiError,
  syncInventorySource,
  transitionListing,
  updateLeadStatus
} from '../lib/api';

function useActionState() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return {
    pending,
    message,
    error,
    async run(action: () => Promise<string>) {
      setPending(true);
      setError(null);
      setMessage(null);
      try {
        const result = await action();
        setMessage(result);
      } catch (caughtError) {
        if (isApiError(caughtError)) {
          setError(caughtError.syncRunId ? `${caughtError.message} (sync ${caughtError.syncRunId})` : caughtError.message);
        } else {
          setError('Unknown request failure');
        }
      } finally {
        setPending(false);
      }
    }
  };
}

export function CreateDealerForm() {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          const name = String(formData.get('name') ?? '').trim();
          await createDealer({ name });
          router.refresh();
          return 'Dealer created.';
        });
      }}
    >
      <label className="field">
        <span>Dealer name</span>
        <input name="name" placeholder="Northside Auto" required />
      </label>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Creating...' : 'Create dealer'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function CreateRooftopForm({ dealerId }: { dealerId: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          await createRooftop({
            dealerId,
            name: String(formData.get('name') ?? '').trim(),
            location: String(formData.get('location') ?? '').trim(),
            phone: String(formData.get('phone') ?? '').trim(),
            rules: {
              minimumPhotos: Number(formData.get('minimumPhotos') ?? 5),
              staleThresholdDays: Number(formData.get('staleThresholdDays') ?? 45)
            }
          });
          router.refresh();
          return 'Rooftop created.';
        });
      }}
    >
      <label className="field">
        <span>Rooftop name</span>
        <input name="name" placeholder="Northside Main" required />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Location</span>
          <input name="location" placeholder="Kelowna, BC" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" placeholder="250-555-0100" />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Minimum photos</span>
          <input name="minimumPhotos" type="number" min="1" defaultValue="5" />
        </label>
        <label className="field">
          <span>Stale threshold days</span>
          <input name="staleThresholdDays" type="number" min="1" defaultValue="45" />
        </label>
      </div>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Create rooftop'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function CreateInventorySourceForm({ rooftopId }: { rooftopId: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          await createInventorySource({
            rooftopId,
            name: String(formData.get('name') ?? '').trim(),
            type: 'xml_feed_url',
            format: 'generic_xml_v1',
            sourceUrl: String(formData.get('sourceUrl') ?? '').trim()
          });
          router.refresh();
          return 'Inventory source saved.';
        });
      }}
    >
      <label className="field">
        <span>Source name</span>
        <input name="name" placeholder="Primary XML Feed" required />
      </label>
      <label className="field">
        <span>Feed URL</span>
        <input name="sourceUrl" type="url" placeholder="https://dealer.example.com/feed.xml" required />
      </label>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Save XML feed'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function SyncSourceButton({ inventorySourceId, label = 'Sync now' }: { inventorySourceId: string; label?: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <div className="inline-stack">
      <button
        className="button button-primary"
        disabled={state.pending}
        onClick={async () => {
          await state.run(async () => {
            const result = await syncInventorySource(inventorySourceId);
            router.refresh();
            return `Sync completed. Imported ${result.syncRun.rowsImported} rows.`;
          });
        }}
      >
        {state.pending ? 'Syncing...' : label}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </div>
  );
}

const TRANSITIONS_BY_STATE: Record<string, string[]> = {
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
  needs_manual_review: ['draft_created', 'queued_for_publish', 'queued_for_update', 'queued_for_remove', 'suppressed_unknown']
};

export function ListingTransitionForm({ listingId, currentState }: { listingId: string; currentState: string }) {
  const router = useRouter();
  const state = useActionState();
  const options = useMemo(() => TRANSITIONS_BY_STATE[currentState] ?? [], [currentState]);

  if (!options.length) {
    return <p className="muted">No further transitions available from this state.</p>;
  }

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          await transitionListing(listingId, {
            toState: String(formData.get('toState')),
            actor: 'dealer-app',
            reason: String(formData.get('reason') ?? '').trim() || 'Manual transition from dealer app'
          });
          router.refresh();
          return 'Listing transition applied.';
        });
      }}
    >
      <label className="field">
        <span>Move to state</span>
        <select name="toState" defaultValue={options[0]}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Reason</span>
        <input name="reason" placeholder="Ready for manual review" />
      </label>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Applying...' : 'Apply transition'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function LeadAssignmentForm({ leadId, assignedRepId }: { leadId: string; assignedRepId?: string | null }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="inline-form"
      action={async (formData) => {
        await state.run(async () => {
          await assignLead(leadId, String(formData.get('assignedRepId') ?? '').trim(), 'dealer-app');
          router.refresh();
          return 'Lead assigned.';
        });
      }}
    >
      <input name="assignedRepId" defaultValue={assignedRepId ?? ''} placeholder="rep_123" />
      <button className="button" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Assign'}
      </button>
      {state.error ? <span className="error-copy compact-copy">{state.error}</span> : null}
    </form>
  );
}

export function LeadStatusForm({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const state = useActionState();
  const statuses = ['new', 'acknowledged', 'responded', 'appointment_set', 'no_show', 'dead', 'sold', 'lost'];

  return (
    <form
      className="inline-form"
      action={async (formData) => {
        await state.run(async () => {
          await updateLeadStatus(leadId, String(formData.get('status')), 'dealer-app');
          router.refresh();
          return 'Lead status updated.';
        });
      }}
    >
      <select name="status" defaultValue={currentStatus}>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <button className="button" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Update'}
      </button>
      {state.error ? <span className="error-copy compact-copy">{state.error}</span> : null}
    </form>
  );
}
