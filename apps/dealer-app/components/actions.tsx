'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  assignLead,
  createLead,
  createDealer,
  createInventorySource,
  createNotificationRecipient,
  createRooftop,
  isApiError,
  recordLeadEvent,
  rebuildPostingQueue,
  retryLeadNotifications,
  snoozePostingJob,
  setupFromInventoryUrl,
  syncInventorySource,
  uploadCsvInventorySource,
  transitionListing,
  updateNotificationRecipient,
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

export function InventoryUrlSetupForm() {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack hero-form"
      action={async (formData) => {
        await state.run(async () => {
          const inventoryUrl = String(formData.get('inventoryUrl') ?? '').trim();
          const result = await setupFromInventoryUrl({ inventoryUrl });
          router.refresh();
          return `Imported ${result.syncRun.rowsImported} vehicles for ${result.inferred.dealerName}.`;
        });
      }}
    >
      <label className="field">
        <span>Inventory URL</span>
        <input name="inventoryUrl" type="url" placeholder="https://dealer.example.com/used-inventory" required />
      </label>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Finding inventory...' : 'Import inventory'}
      </button>
      <p className="muted">
        Paste the public inventory page. LotPilot infers the dealer/location, creates the source, scrapes vehicles, and builds Marketplace drafts.
      </p>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function RebuildPostingQueueButton({ rooftopId }: { rooftopId: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <div className="inline-action">
      <button
        className="button button-primary"
        disabled={state.pending}
        onClick={() =>
          state.run(async () => {
            const result = await rebuildPostingQueue(rooftopId);
            router.refresh();
            return `Queued ${result.createdJobs.length} job${result.createdJobs.length === 1 ? '' : 's'}; ${result.blockedJobs.length} blocked.`;
          })
        }
      >
        {state.pending ? 'Rebuilding...' : 'Rebuild posting queue'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </div>
  );
}

export function SnoozePostingJobButton({ jobId, minutes = 60 }: { jobId: string; minutes?: number }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <div className="inline-action">
      <button
        className="button"
        disabled={state.pending}
        onClick={() =>
          state.run(async () => {
            await snoozePostingJob(jobId, minutes);
            router.refresh();
            return `Snoozed for ${minutes} minutes.`;
          })
        }
      >
        {state.pending ? 'Snoozing...' : 'Snooze'}
      </button>
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </div>
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
  const [sourceType, setSourceType] = useState<'website_inventory_url' | 'csv_upload' | 'xml_feed_url'>('website_inventory_url');

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          const source = await createInventorySource({
            rooftopId,
            name: String(formData.get('name') ?? '').trim(),
            type: sourceType,
            format:
              sourceType === 'website_inventory_url'
                ? 'firecrawl_structured_v1'
                : sourceType === 'csv_upload'
                  ? 'generic_csv_v1'
                  : 'generic_xml_v1',
            sourceUrl: sourceType === 'csv_upload' ? null : String(formData.get('sourceUrl') ?? '').trim()
          });
          if (sourceType === 'csv_upload') {
            const file = formData.get('csvFile');
            if (!(file instanceof File) || !file.size) throw new Error('Choose a CSV file to upload');
            await uploadCsvInventorySource(source.id, await file.text(), file.name);
          }
          router.refresh();
          return sourceType === 'csv_upload' ? 'CSV inventory source saved and uploaded.' : 'Inventory source saved.';
        });
      }}
    >
      <label className="field">
        <span>Source name</span>
        <input name="name" placeholder="Primary inventory source" required />
      </label>
      <label className="field">
        <span>Import method</span>
        <select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}>
          <option value="website_inventory_url">Public dealer inventory URL</option>
          <option value="csv_upload">CSV upload fallback</option>
          <option value="xml_feed_url">XML feed URL</option>
        </select>
      </label>
      {sourceType === 'csv_upload' ? (
        <label className="field">
          <span>Inventory CSV</span>
          <input name="csvFile" type="file" accept=".csv,text/csv" required />
        </label>
      ) : (
        <label className="field">
          <span>{sourceType === 'xml_feed_url' ? 'Feed URL' : 'Inventory page URL'}</span>
          <input
            name="sourceUrl"
            type="url"
            placeholder={sourceType === 'xml_feed_url' ? 'https://dealer.example.com/feed.xml' : 'https://dealer.example.com/inventory'}
            required
          />
        </label>
      )}
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Save inventory source'}
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

export function ManualLeadForm({
  rooftopId,
  vehicles
}: {
  rooftopId: string;
  vehicles: Array<{ id: string; year: number | null; make: string; model: string; stockNumber: string }>;
}) {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          await createLead({
            rooftopId,
            vehicleId: String(formData.get('vehicleId')),
            sourceChannel: String(formData.get('sourceChannel') ?? 'manual'),
            sourceSubchannel: 'manual_capture',
            contactName: String(formData.get('contactName') ?? '').trim() || null,
            contactEmail: String(formData.get('contactEmail') ?? '').trim() || null,
            contactPhone: String(formData.get('contactPhone') ?? '').trim() || null,
            sourceMessage: String(formData.get('sourceMessage') ?? '').trim() || null
          });
          router.refresh();
          return 'Lead captured and alerts queued.';
        });
      }}
    >
      <label className="field">
        <span>Vehicle</span>
        <select name="vehicleId" required disabled={!vehicles.length}>
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.year, vehicle.make, vehicle.model, vehicle.stockNumber ? `#${vehicle.stockNumber}` : null].filter(Boolean).join(' ')}
              </option>
            ))
          ) : (
            <option value="">Import inventory before capturing a lead</option>
          )}
        </select>
      </label>
      {!vehicles.length ? <p className="muted">No vehicles are available yet. Import inventory before manually capturing leads.</p> : null}
      <label className="field">
        <span>Source</span>
        <select name="sourceChannel" defaultValue="facebook">
          <option value="facebook">Facebook Marketplace</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Name</span>
          <input name="contactName" placeholder="Buyer name" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="contactPhone" placeholder="+1 250 555 0100" />
        </label>
      </div>
      <label className="field">
        <span>Email</span>
        <input name="contactEmail" type="email" placeholder="buyer@example.com" />
      </label>
      <label className="field">
        <span>Message</span>
        <textarea name="sourceMessage" placeholder="Is this still available?" rows={4} />
      </label>
      <button className="button button-primary" disabled={state.pending || !vehicles.length}>
        {state.pending ? 'Capturing...' : 'Capture lead'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function CreateNotificationRecipientForm({ rooftopId }: { rooftopId: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <form
      className="stack"
      action={async (formData) => {
        await state.run(async () => {
          await createNotificationRecipient(rooftopId, {
            channel: String(formData.get('channel')) as 'sms' | 'email',
            destination: String(formData.get('destination') ?? '').trim(),
            label: String(formData.get('label') ?? '').trim() || null,
            rules: {
              sendWindow: String(formData.get('sendWindow')) as 'always' | 'business_hours',
              timezone: String(formData.get('timezone') ?? 'America/Vancouver').trim(),
              fallback: formData.get('fallback') === 'on',
              businessHours: {
                days: [1, 2, 3, 4, 5],
                start: String(formData.get('start') ?? '09:00'),
                end: String(formData.get('end') ?? '18:00')
              }
            }
          });
          router.refresh();
          return 'Alert recipient saved.';
        });
      }}
    >
      <div className="field-grid">
        <label className="field">
          <span>Channel</span>
          <select name="channel" defaultValue="sms">
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </label>
        <label className="field">
          <span>Label</span>
          <input name="label" placeholder="Sales manager" />
        </label>
      </div>
      <label className="field">
        <span>Destination</span>
        <input name="destination" placeholder="+12505550100 or manager@example.com" required />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Send window</span>
          <select name="sendWindow" defaultValue="always">
            <option value="always">Always</option>
            <option value="business_hours">Business hours</option>
          </select>
        </label>
        <label className="field">
          <span>Timezone</span>
          <input name="timezone" defaultValue="America/Vancouver" />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Start</span>
          <input name="start" type="time" defaultValue="09:00" />
        </label>
        <label className="field">
          <span>End</span>
          <input name="end" type="time" defaultValue="18:00" />
        </label>
      </div>
      <label className="check-field">
        <input name="fallback" type="checkbox" defaultChecked />
        <span>Use as fallback when no business-hours recipient is open</span>
      </label>
      <button className="button button-primary" disabled={state.pending}>
        {state.pending ? 'Saving...' : 'Add alert recipient'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </form>
  );
}

export function RecipientActiveToggle({
  recipientId,
  isActive
}: {
  recipientId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const state = useActionState();

  return (
    <button
      className="button"
      disabled={state.pending}
      onClick={async () => {
        await state.run(async () => {
          await updateNotificationRecipient(recipientId, { isActive: !isActive });
          router.refresh();
          return isActive ? 'Recipient deactivated.' : 'Recipient activated.';
        });
      }}
    >
      {state.pending ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}

export function RetryLeadNotificationsButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const state = useActionState();

  return (
    <div className="inline-stack">
      <button
        className="button"
        disabled={state.pending}
        onClick={async () => {
          await state.run(async () => {
            const deliveries = await retryLeadNotifications(leadId);
            router.refresh();
            return `Retried ${deliveries.length} failed alert${deliveries.length === 1 ? '' : 's'}.`;
          });
        }}
      >
        {state.pending ? 'Retrying...' : 'Retry failed alerts'}
      </button>
      {state.message ? <p className="success-copy">{state.message}</p> : null}
      {state.error ? <p className="error-copy">{state.error}</p> : null}
    </div>
  );
}

export function CopyReplyTemplateButton({
  leadId,
  templateKey,
  text
}: {
  leadId: string;
  templateKey: string;
  text: string;
}) {
  const state = useActionState();

  return (
    <button
      className="button"
      disabled={state.pending}
      onClick={async () => {
        await state.run(async () => {
          await navigator.clipboard.writeText(text);
          await recordLeadEvent(leadId, 'reply_template_copied', { templateKey });
          return 'Template copied.';
        });
      }}
    >
      {state.pending ? 'Copying...' : 'Copy'}
    </button>
  );
}
