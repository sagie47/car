import Link from 'next/link';
import { RebuildPostingQueueButton, SnoozePostingJobButton } from '../../components/actions';
import { Badge, Card, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listPostingJobs, listVehicles } from '../../lib/api';
import { formatDateTime, formatNumber, vehicleLabel } from '../../lib/format';
import type { PostingJob } from '../../lib/types';

function statusTone(status: string) {
  if (status === 'completed') return 'green';
  if (['blocked', 'failed', 'needs_manual_review'].includes(status)) return 'amber';
  if (['claimed', 'in_progress', 'pending'].includes(status)) return 'blue';
  return 'slate';
}

function actionTone(action: string) {
  if (action === 'remove') return 'amber';
  if (action === 'publish') return 'green';
  return 'blue';
}

function blockerText(job: PostingJob) {
  const failed = job.complianceChecks.filter((check) => !check.ok);
  if (!failed.length) return 'Ready';
  return failed.map((check) => check.message).join(' ');
}

export default async function PostingPage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No rooftop yet" body="Finish setup before managing Marketplace posting." />;
  }

  const [jobs, vehicles] = await Promise.all([
    listPostingJobs({ rooftopId: context.activeRooftop.id }),
    listVehicles(context.activeRooftop.id)
  ]);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const activeJobs = jobs.filter((job) => ['pending', 'claimed', 'in_progress', 'needs_manual_review'].includes(job.status));
  const blockedJobs = jobs.filter((job) => job.status === 'blocked');
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const nextJob = activeJobs
    .filter((job) => job.status === 'pending')
    .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime())[0];
  const account = jobs.find((job) => job.metadata?.autoSubmitEnabled !== undefined)?.metadata ?? null;

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Marketplace posting"
        subtitle="Managed queue for Facebook Marketplace vehicle-sale posts. The Chrome extension claims the next ready job and reports results here."
        actions={<RebuildPostingQueueButton rooftopId={context.activeRooftop.id} />}
      />

      <StatGrid
        stats={[
          { label: 'Ready jobs', value: formatNumber(activeJobs.filter((job) => job.status === 'pending').length), tone: 'blue' },
          { label: 'Blocked jobs', value: formatNumber(blockedJobs.length), tone: 'amber' },
          { label: 'Completed', value: formatNumber(completedJobs.length), tone: 'green' },
          { label: 'Next run', value: nextJob ? formatDateTime(nextJob.scheduledFor) : 'No pending jobs', tone: 'slate' }
        ]}
      />

      <Card
        title="Chrome extension runner"
        subtitle="Default account targets Facebook Marketplace, allows auto-submit, and spaces claims by 20 minutes when the queue is rebuilt."
      >
        <div className="detail-grid">
          <div>
            <p className="muted">Runner</p>
            <strong>Chrome extension</strong>
          </div>
          <div>
            <p className="muted">Auto-submit</p>
            <strong>{account?.autoSubmitEnabled === false ? 'Disabled' : 'Enabled'}</strong>
          </div>
          <div>
            <p className="muted">Daily capacity</p>
            <strong>25 jobs</strong>
          </div>
          <div>
            <p className="muted">Safety basis</p>
            <strong>Draft, price, mileage, required vehicle fields, photos</strong>
          </div>
        </div>
      </Card>

      <DataTable
        columns={['Job', 'Vehicle', 'Status', 'Scheduled', 'Blockers', 'Attempts', 'Actions']}
        emptyLabel="No posting jobs yet. Rebuild the queue after inventory import."
        rows={jobs.map((job) => {
          const vehicle = vehicleById.get(job.vehicleId);
          const canSnooze = ['pending', 'needs_manual_review'].includes(job.status);
          return [
            <div key={`${job.id}-job`} className="stack-tight">
              <Badge tone={actionTone(job.action)}>{job.action}</Badge>
              <span className="muted">{job.id}</span>
            </div>,
            vehicle ? (
              <Link key={`${job.id}-vehicle`} href={`/vehicles/${vehicle.id}`}>
                {vehicleLabel(vehicle)}
              </Link>
            ) : job.vehicleId,
            <Badge key={`${job.id}-status`} tone={statusTone(job.status)}>
              {job.status.replace(/_/g, ' ')}
            </Badge>,
            formatDateTime(job.snoozedUntil ?? job.scheduledFor),
            <span key={`${job.id}-blockers`} className={job.status === 'blocked' ? 'error-copy' : 'muted'}>
              {blockerText(job)}
            </span>,
            formatNumber(job.attempts.length),
            <div key={`${job.id}-actions`} className="row-actions">
              <Link className="button" href={`/listings/${job.listingId}`}>Listing</Link>
              {job.liveUrl ? <a className="button" href={job.liveUrl} target="_blank" rel="noreferrer">Live</a> : null}
              {canSnooze ? <SnoozePostingJobButton jobId={job.id} /> : null}
            </div>
          ];
        })}
      />
    </div>
  );
}
