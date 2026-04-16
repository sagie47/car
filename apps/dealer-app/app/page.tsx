import Link from 'next/link';
import { SyncSourceButton } from '../components/actions';
import { Card, DataTable, EmptyState, PageHeader, StatGrid } from '../components/cards';
import { SetupWizard } from '../components/setup-wizard';
import { getAppContext } from '../lib/app-context';
import { formatDateTime, formatNumber, syncRunLabel } from '../lib/format';

export default async function HomePage() {
  const context = await getAppContext();

  if (context.setupStage !== 'ready') {
    return <SetupWizard context={context} />;
  }

  const dashboard = context.dashboard;
  const latestSource = context.inventorySources[0] ?? null;

  if (!dashboard) {
    return <EmptyState title="No dashboard data" body="Run setup first to populate the dealer console." />;
  }

  return (
    <div className="stack page-stack">
      <PageHeader
        title={`${dashboard.rooftop.name} overview`}
        subtitle="Health, sync, inventory, listings, and leads in one beta console."
        actions={
          latestSource ? (
            <>
              <SyncSourceButton inventorySourceId={latestSource.id} />
              <Link className="button" href="/settings">Settings</Link>
            </>
          ) : null
        }
      />

      <StatGrid
        stats={[
          { label: 'Health score', value: dashboard.health.score, hint: syncRunLabel(dashboard.latestSyncRun), tone: 'blue' },
          { label: 'Vehicles', value: formatNumber(dashboard.vehicleCounts.total), hint: `${dashboard.vehicleCounts.eligible} eligible`, tone: 'green' },
          { label: 'Listings', value: formatNumber(dashboard.listingCounts.total), hint: `${dashboard.listingCounts.published} published`, tone: 'amber' },
          { label: 'Leads', value: formatNumber(dashboard.leadCounts.total), hint: `${dashboard.leadCounts.unassigned} unassigned`, tone: 'slate' }
        ]}
      />

      <div className="content-grid">
        <Card title="Current feed status" accent="blue">
          <div className="stack">
            <p className="muted">
              {latestSource
                ? `${latestSource.name} • ${latestSource.type} • ${latestSource.format}`
                : 'No inventory source configured.'}
            </p>
            <p className="mono-copy">{latestSource?.sourceUrl ?? 'No feed URL yet'}</p>
            <p className="muted">
              Last sync: {formatDateTime(latestSource?.lastSyncedAt)} • status {latestSource?.lastSyncStatus ?? 'none'}
            </p>
          </div>
        </Card>

        <Card title="Health details" accent="green">
          <DataTable
            columns={['Metric', 'Value']}
            rows={[
              ['Required fields', `${dashboard.health.metrics.requiredFieldsPct}%`],
              ['Eligible inventory', `${dashboard.health.metrics.eligiblePct}%`],
              ['Missing price', `${dashboard.health.metrics.missingPricePct}%`],
              ['Insufficient photos', `${dashboard.health.metrics.insufficientPhotosPct}%`],
              ['Stale inventory', `${dashboard.health.metrics.stalePct}%`],
              ['Sync issues', `${dashboard.health.metrics.unresolvedSyncIssuePct}%`]
            ]}
          />
        </Card>
      </div>

      <div className="content-grid">
        <Card title="Latest sync run" accent="amber">
          <DataTable
            columns={['Field', 'Value']}
            rows={[
              ['Status', dashboard.latestSyncRun?.status ?? 'none'],
              ['Started', formatDateTime(dashboard.latestSyncRun?.startedAt ?? null)],
              ['Completed', formatDateTime(dashboard.latestSyncRun?.completedAt ?? null)],
              ['Rows received', formatNumber(dashboard.latestSyncRun?.rowsReceived ?? 0)],
              ['Rows imported', formatNumber(dashboard.latestSyncRun?.rowsImported ?? 0)],
              ['Rows skipped', formatNumber(dashboard.latestSyncRun?.rowsSkipped ?? 0)]
            ]}
          />
        </Card>

        <Card title="Quick links" accent="slate">
          <div className="stack">
            <Link className="button" href="/vehicles">Open vehicles</Link>
            <Link className="button" href="/listings">Open listings</Link>
            <Link className="button" href="/stale">Open stale queue</Link>
            <Link className="button" href="/leads">Open lead log</Link>
            <Link className="button" href="/reports">Open reports</Link>
          </div>
        </Card>
      </div>

      <Card title="Status snapshot" accent="slate">
        <DataTable
          columns={['Bucket', 'Count']}
          rows={[
            ['Vehicles with warnings', formatNumber(dashboard.vehicleCounts.withWarnings)],
            ['Blocked vehicles', formatNumber(dashboard.vehicleCounts.blocked)],
            ['Stale vehicles', formatNumber(dashboard.vehicleCounts.stale)],
            ['Listings needing attention', formatNumber(dashboard.listingCounts.needingAttention)],
            ['Unassigned leads', formatNumber(dashboard.leadCounts.unassigned)]
          ]}
        />
      </Card>
    </div>
  );
}
