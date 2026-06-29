import { CreateNotificationRecipientForm, RecipientActiveToggle, SyncSourceButton } from '../../components/actions';
import { Card, DataTable, EmptyState, PageHeader } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listNotificationRecipients } from '../../lib/api';
import { formatDateTime, syncRunLabel } from '../../lib/format';

export default async function SettingsPage() {
  const context = await getAppContext();

  if (!context.activeDealer || !context.activeRooftop) {
    return <EmptyState title="No settings yet" body="Finish setup before using the settings surface." />;
  }

  const latestSource = context.inventorySources[0] ?? null;
  const recipients = await listNotificationRecipients(context.activeRooftop.id);
  const inboundDomain = process.env.NEXT_PUBLIC_INBOUND_LEAD_DOMAIN ?? process.env.INBOUND_LEAD_DOMAIN ?? 'configure-inbound-domain.test';
  const inboundAlias = `lead+${context.activeRooftop.id}@${inboundDomain}`;

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

      <div className="content-grid">
        <Card title="Lead alert recipients" subtitle="SMS and email destinations for new beta leads." accent="green">
          <CreateNotificationRecipientForm rooftopId={context.activeRooftop.id} />
        </Card>

        <Card title="Inbound lead alias" subtitle="Forward Marketplace or lead emails here when testing Resend inbound capture." accent="blue">
          <div className="stack">
            <p className="mono-copy">{inboundAlias}</p>
            <p className="muted">
              Incoming emails are matched to vehicles by VDP URL, VIN, or stock number. Unmatched messages should be created manually from the Leads page.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Configured alert recipients" accent="slate">
        <DataTable
          columns={['Label', 'Channel', 'Destination', 'Window', 'Fallback', 'Status', 'Action']}
          rows={recipients.map((recipient) => [
            recipient.label ?? 'Unlabeled',
            recipient.channel.toUpperCase(),
            recipient.destination,
            recipient.rules?.sendWindow === 'business_hours'
              ? `${recipient.rules.businessHours?.start ?? '09:00'}-${recipient.rules.businessHours?.end ?? '18:00'} ${recipient.rules.timezone ?? ''}`
              : 'Always',
            recipient.rules?.fallback === false ? 'No' : 'Yes',
            recipient.isActive ? 'Active' : 'Inactive',
            <RecipientActiveToggle key={recipient.id} recipientId={recipient.id} isActive={recipient.isActive} />
          ])}
        />
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
