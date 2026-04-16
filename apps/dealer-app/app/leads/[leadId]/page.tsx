import { LeadAssignmentForm, LeadStatusForm } from '../../../components/actions';
import { Card, DataTable, EmptyState, PageHeader } from '../../../components/cards';
import { getLead, getVehicle } from '../../../lib/api';
import { formatDateTime, leadLabel, vehicleLabel } from '../../../lib/format';

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;

  let lead;
  try {
    lead = await getLead(leadId);
  } catch {
    return <EmptyState title="Lead not found" body="The requested lead could not be loaded." />;
  }

  const vehicle = await getVehicle(lead.vehicleId);

  return (
    <div className="stack page-stack">
      <PageHeader title={leadLabel(lead)} subtitle={`${vehicleLabel(vehicle)} • created ${formatDateTime(lead.createdAt)}`} />

      <div className="content-grid">
        <Card title="Lead controls" accent="blue">
          <div className="stack">
            <LeadAssignmentForm leadId={lead.id} assignedRepId={lead.assignedRepId} />
            <LeadStatusForm leadId={lead.id} currentStatus={lead.status} />
          </div>
        </Card>

        <Card title="Suggested response" accent="green">
          <p className="muted">{lead.suggestedResponse}</p>
        </Card>
      </div>

      <Card title="Lead events" accent="slate">
        <DataTable
          columns={['When', 'Type', 'Actor']}
          rows={lead.events.map((event) => [formatDateTime(event.createdAt), event.type, event.actor])}
        />
      </Card>
    </div>
  );
}
