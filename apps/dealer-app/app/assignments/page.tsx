import { LeadAssignmentForm, LeadStatusForm } from '../../components/actions';
import { Card, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listLeads } from '../../lib/api';
import { formatNumber } from '../../lib/format';

export default async function AssignmentsPage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No assignments yet" body="Finish setup before using rep assignments." />;
  }

  const leads = await listLeads({ rooftopId: context.activeRooftop.id });
  const assignments = leads.reduce<Record<string, number>>((groups, lead) => {
    const key = lead.assignedRepId ?? 'unassigned';
    groups[key] = (groups[key] ?? 0) + 1;
    return groups;
  }, {});

  return (
    <div className="stack page-stack">
      <PageHeader
        title="User / rep assignments"
        subtitle="This beta screen uses the current lead assignment model. There is no dedicated user directory yet."
      />
      <StatGrid
        stats={Object.entries(assignments).map(([repId, count], index) => ({
          label: repId,
          value: formatNumber(count),
          tone: index % 2 === 0 ? 'blue' : 'amber'
        }))}
      />
      <Card title="Lead assignment editor" accent="slate">
        <DataTable
          columns={['Lead', 'Assigned rep', 'Assign', 'Status', 'Update']}
          rows={leads.map((lead) => [
            lead.id,
            lead.assignedRepId ?? 'Unassigned',
            <LeadAssignmentForm key={`${lead.id}-assign`} leadId={lead.id} assignedRepId={lead.assignedRepId} />,
            lead.status.replace(/_/g, ' '),
            <LeadStatusForm key={`${lead.id}-status`} leadId={lead.id} currentStatus={lead.status} />
          ])}
        />
      </Card>
    </div>
  );
}
