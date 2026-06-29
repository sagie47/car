import Link from 'next/link';
import { InventoryUrlSetupForm, SyncSourceButton } from './actions';
import { Card, DataTable, PageHeader, StatGrid } from './cards';
import type { AppContext } from '../lib/app-context';
import { formatDateTime, formatNumber, syncRunLabel } from '../lib/format';

export function SetupWizard({ context }: { context: AppContext }) {
  const currentSource = context.inventorySources[0] ?? null;
  const latestSyncRun = context.syncRuns[0] ?? null;

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Start with your inventory URL"
        subtitle="Paste the public inventory page. LotPilot figures out the dealer/location and builds the first Marketplace-ready drafts."
        actions={<Link className="button" href="/settings">Settings</Link>}
      />

      {!context.activeDealer ? (
        <Card title="Import inventory" subtitle="No dealer name or rooftop setup required." accent="blue">
          <InventoryUrlSetupForm />
        </Card>
      ) : (
        <>
          <Card title="Import inventory URL" subtitle="Add or test a dealer inventory URL without manually creating dealer/location records." accent="blue">
            <InventoryUrlSetupForm />
          </Card>
          <StatGrid
            stats={[
              { label: 'Dealer', value: context.activeDealer.name, tone: 'blue' },
              { label: 'Location', value: context.activeRooftop?.name ?? 'Pending', tone: 'green' },
              { label: 'Vehicles imported', value: formatNumber(latestSyncRun?.rowsImported ?? 0), hint: syncRunLabel(latestSyncRun), tone: 'amber' },
              { label: 'Setup', value: context.setupStage === 'ready' ? 'Ready' : 'Needs sync', tone: 'slate' }
            ]}
          />
        </>
      )}

      {currentSource ? (
        <div className="content-grid">
          <Card title="Detected inventory source" accent="green">
            <DataTable
              columns={['Field', 'Value']}
              rows={[
                ['Source', currentSource.name],
                ['Type', currentSource.type],
                ['Format', currentSource.format],
                ['URL', currentSource.sourceUrl ?? 'Not set'],
                ['Last sync', formatDateTime(currentSource.lastSyncedAt)],
                ['Last status', currentSource.lastSyncStatus ?? 'None']
              ]}
            />
          </Card>

          <Card title="Next action" accent={context.setupStage === 'ready' ? 'green' : 'amber'}>
            <div className="stack">
              <p className="muted">
                {latestSyncRun
                  ? `Latest sync ${latestSyncRun.status} at ${formatDateTime(latestSyncRun.completedAt ?? latestSyncRun.startedAt)}.`
                  : 'No sync has completed yet.'}
              </p>
              <SyncSourceButton inventorySourceId={currentSource.id} label={context.setupStage === 'ready' ? 'Refresh inventory' : 'Run sync'} />
              {context.setupStage === 'ready' ? <Link className="button" href="/listings">Review Marketplace drafts</Link> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
