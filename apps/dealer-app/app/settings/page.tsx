import { SyncSourceButton } from '../../components/actions';
import { Card, DataTable, EmptyState, PageHeader } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { formatDateTime, syncRunLabel } from '../../lib/format';

export default async function SettingsPage() {
  const context = await getAppContext();

  if (!context.activeDealer || !context.activeRooftop) {
    return <EmptyState title="No settings yet" body="Finish setup before using the settings surface." />;
  }

  const latestSource = context.inventorySources[0] ?? null;

  return (
    <div className="stack page-stack">
      <PageHeader title="Settings" subtitle="Current beta configuration for the single active dealer and rooftop." />

      <div className="content-grid">
        <Card title="Dealer" accent="blue">
          <DataTable
            columns={['Field', 'Value']}
            rows={[
              ['Dealer', context.activeDealer.name],
              ['Created', formatDateTime(context.activeDealer.createdAt)],
              ['Rooftops', String(context.rooftops.length)]
            ]}
          />
        </Card>

        <Card title="Rooftop" accent="green">
          <DataTable
            columns={['Field', 'Value']}
            rows={[
              ['Name', context.activeRooftop.name],
              ['Location', context.activeRooftop.location ?? 'Not set'],
              ['Phone', context.activeRooftop.phone ?? 'Not set'],
              ['Min photos', String(context.activeRooftop.rules.minimumPhotos ?? 5)],
              ['Stale threshold', `${context.activeRooftop.rules.staleThresholdDays ?? 45} days`]
            ]}
          />
        </Card>
      </div>

      <Card title="Inventory source" accent="amber">
        {latestSource ? (
          <div className="stack">
            <DataTable
              columns={['Field', 'Value']}
              rows={[
                ['Name', latestSource.name],
                ['Type', latestSource.type],
                ['Format', latestSource.format],
                ['Feed URL', latestSource.sourceUrl],
                ['Last sync', formatDateTime(latestSource.lastSyncedAt)],
                ['Last status', latestSource.lastSyncStatus ?? 'None']
              ]}
            />
            <SyncSourceButton inventorySourceId={latestSource.id} />
          </div>
        ) : (
          <p className="muted">No inventory source configured yet.</p>
        )}
      </Card>

      <Card title="Recent sync runs" accent="slate">
        <DataTable
          columns={['When', 'Status', 'Rows imported', 'Rows skipped', 'Source']}
          rows={context.syncRuns.map((syncRun) => [
            formatDateTime(syncRun.completedAt ?? syncRun.startedAt),
            syncRunLabel(syncRun),
            String(syncRun.rowsImported),
            String(syncRun.rowsSkipped),
            syncRun.sourceName ?? syncRun.sourceType
          ])}
        />
      </Card>
    </div>
  );
}
