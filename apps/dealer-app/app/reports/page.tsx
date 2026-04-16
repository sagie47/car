import { Badge, Card, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { formatNumber } from '../../lib/format';

export default async function ReportsPage() {
  const context = await getAppContext();
  const dashboard = context.dashboard;

  if (!context.activeRooftop || !dashboard) {
    return <EmptyState title="No report data yet" body="Run setup and sync inventory before reviewing reports." />;
  }

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Reports"
        subtitle="Beta reporting over current persisted health, listing, sync, and lead data. This does not include attribution modeling yet."
      />

      <StatGrid
        stats={[
          { label: 'Health score', value: dashboard.health.score, tone: 'blue' },
          { label: 'Eligible vehicles', value: formatNumber(dashboard.vehicleCounts.eligible), tone: 'green' },
          { label: 'Published listings', value: formatNumber(dashboard.listingCounts.published), tone: 'amber' },
          { label: 'Lead total', value: formatNumber(dashboard.leadCounts.total), tone: 'slate' }
        ]}
      />

      <div className="content-grid">
        <Card title="Vehicle summary" accent="green">
          <DataTable
            columns={['Bucket', 'Count']}
            rows={[
              ['Total', formatNumber(dashboard.vehicleCounts.total)],
              ['Eligible', formatNumber(dashboard.vehicleCounts.eligible)],
              ['Warnings', formatNumber(dashboard.vehicleCounts.withWarnings)],
              ['Blocked', formatNumber(dashboard.vehicleCounts.blocked)],
              ['Stale', formatNumber(dashboard.vehicleCounts.stale)],
              ['Sync issues', formatNumber(dashboard.vehicleCounts.withSyncIssues)]
            ]}
          />
        </Card>

        <Card title="Lead summary" accent="amber">
          <DataTable
            columns={['Status', 'Count']}
            rows={Object.entries(dashboard.leadCounts.byStatus).map(([status, count]) => [
              <Badge key={status} tone="slate">{status.replace(/_/g, ' ')}</Badge>,
              formatNumber(count)
            ])}
          />
        </Card>
      </div>

      <Card title="Listing state counts" accent="slate">
        <DataTable
          columns={['State', 'Count']}
          rows={Object.entries(dashboard.listingCounts.byState).map(([state, count]) => [
            state.replace(/_/g, ' '),
            formatNumber(count)
          ])}
        />
      </Card>
    </div>
  );
}
