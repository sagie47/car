import Link from 'next/link';
import { CreateDealerForm, CreateInventorySourceForm, CreateRooftopForm, SyncSourceButton } from './actions';
import { Card, PageHeader } from './cards';
import type { AppContext } from '../lib/app-context';
import { formatDateTime } from '../lib/format';

export function SetupWizard({ context }: { context: AppContext }) {
  const currentSource = context.inventorySources[0] ?? null;
  const latestSyncRun = context.syncRuns[0] ?? null;

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Setup wizard"
        subtitle="Create the dealer, rooftop, and inventory source, then run the first successful sync."
        actions={<Link className="button" href="/settings">Go to settings</Link>}
      />

      <div className="wizard-grid">
        <Card title="Step 1 · Dealer" accent={context.activeDealer ? 'green' : 'amber'}>
          {context.activeDealer ? (
            <div className="stack">
              <p className="success-copy">Dealer ready: {context.activeDealer.name}</p>
              <p className="muted">Created {formatDateTime(context.activeDealer.createdAt)}</p>
            </div>
          ) : (
            <CreateDealerForm />
          )}
        </Card>

        <Card title="Step 2 · Rooftop" accent={context.activeRooftop ? 'green' : 'amber'}>
          {context.activeDealer && !context.activeRooftop ? (
            <CreateRooftopForm dealerId={context.activeDealer.id} />
          ) : context.activeRooftop ? (
            <div className="stack">
              <p className="success-copy">Rooftop ready: {context.activeRooftop.name}</p>
              <p className="muted">
                Photo minimum {context.activeRooftop.rules.minimumPhotos ?? 5} • stale threshold{' '}
                {context.activeRooftop.rules.staleThresholdDays ?? 45} days
              </p>
            </div>
          ) : (
            <p className="muted">Create the dealer first to unlock rooftop setup.</p>
          )}
        </Card>

        <Card title="Step 3 · Inventory source" accent={currentSource ? 'green' : 'amber'}>
          {context.activeRooftop && !currentSource ? (
            <CreateInventorySourceForm rooftopId={context.activeRooftop.id} />
          ) : currentSource ? (
            <div className="stack">
              <p className="success-copy">Source ready: {currentSource.name}</p>
              <p className="muted">{currentSource.type} • {currentSource.format}</p>
              <p className="mono-copy">{currentSource.sourceUrl}</p>
            </div>
          ) : (
            <p className="muted">Create the rooftop first to unlock feed setup.</p>
          )}
        </Card>

        <Card title="Step 4 · First sync" accent={context.setupStage === 'ready' ? 'green' : 'amber'}>
          {currentSource ? (
            <div className="stack">
              <p className="muted">
                {latestSyncRun
                  ? `Latest sync ${latestSyncRun.status} at ${formatDateTime(latestSyncRun.completedAt ?? latestSyncRun.startedAt)}`
                  : 'No sync has been run yet.'}
              </p>
              <SyncSourceButton inventorySourceId={currentSource.id} label="Run first sync" />
            </div>
          ) : (
            <p className="muted">Save an inventory source first to unlock sync.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
