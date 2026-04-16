import Link from 'next/link';
import { LeadAssignmentForm, LeadStatusForm } from '../../components/actions';
import { DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listLeads } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

export default async function LeadsPage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No rooftop yet" body="Finish setup before reviewing leads." />;
  }

  const leads = await listLeads({ rooftopId: context.activeRooftop.id });

  return (
    <div className="stack page-stack">
      <PageHeader title="Lead log" subtitle="Lead assignment and status changes over the current persisted workflow." />
      <StatGrid
        stats={[
          { label: 'Leads', value: formatNumber(leads.length), tone: 'blue' },
          { label: 'Unassigned', value: formatNumber(leads.filter((lead) => !lead.assignedRepId).length), tone: 'amber' },
          { label: 'Responded', value: formatNumber(leads.filter((lead) => lead.status === 'responded').length), tone: 'green' },
          { label: 'Appointments', value: formatNumber(leads.filter((lead) => lead.status === 'appointment_set').length), tone: 'slate' }
        ]}
      />
      <DataTable
        columns={['Lead', 'Created', 'Assigned rep', 'Assign', 'Status', 'Update', 'Actions']}
        rows={leads.map((lead) => [
          `${lead.sourceChannel}${lead.sourceSubchannel ? ` / ${lead.sourceSubchannel}` : ''}`,
          formatDateTime(lead.createdAt),
          lead.assignedRepId ?? 'Unassigned',
          <LeadAssignmentForm key={`${lead.id}-assign`} leadId={lead.id} assignedRepId={lead.assignedRepId} />,
          lead.status.replace(/_/g, ' '),
          <LeadStatusForm key={`${lead.id}-status`} leadId={lead.id} currentStatus={lead.status} />,
          <Link key={`${lead.id}-action`} className="button" href={`/leads/${lead.id}`}>Details</Link>
        ])}
      />
    </div>
  );
}
