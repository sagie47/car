import { CopyReplyTemplateButton, LeadAssignmentForm, LeadStatusForm, RetryLeadNotificationsButton } from '../../../components/actions';
import { Card, DataTable, EmptyState, PageHeader } from '../../../components/cards';
import { getLead, getVehicle, listLeadNotificationDeliveries } from '../../../lib/api';
import { formatDateTime, leadLabel, vehicleLabel } from '../../../lib/format';
import type { Lead, Vehicle } from '../../../lib/types';

function replyTemplates(lead: Lead, vehicle: Vehicle | null) {
  const title = vehicle ? vehicleLabel(vehicle) : 'this vehicle';
  const name = lead.contactName ? `${lead.contactName}, ` : '';
  return [
    {
      key: 'availability',
      label: 'Availability',
      text: `${name}thanks for reaching out about the ${title}. It is available as of now. Want me to set up a time today for you to see it?`
    },
    {
      key: 'appointment',
      label: 'Appointment',
      text: `${name}we can show the ${title} today. What time works best for a quick appointment?`
    },
    {
      key: 'best_price',
      label: 'Best price',
      text: `${name}the current asking price is based on condition and market value. If you can come in today, we can review the best available deal in person.`
    },
    {
      key: 'financing',
      label: 'Financing',
      text: `${name}we can talk through financing options for the ${title}. If you share your preferred down payment and monthly budget, I can point you in the right direction.`
    },
    {
      key: 'location',
      label: 'Location',
      text: `${name}we are at the dealership and can help you with the ${title}. Send me the time you want to come by and I will confirm availability.`
    }
  ];
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;

  let lead;
  try {
    lead = await getLead(leadId);
  } catch {
    return <EmptyState title="Lead not found" body="The requested lead could not be loaded." />;
  }

  const vehicle = await getVehicle(lead.vehicleId).catch(() => null);
  const deliveries = await listLeadNotificationDeliveries(lead.id).catch(() => []);
  const templates = replyTemplates(lead, vehicle);

  return (
    <div className="stack page-stack">
      <PageHeader title={leadLabel(lead)} subtitle={`${vehicle ? vehicleLabel(vehicle) : lead.vehicleId} • created ${formatDateTime(lead.createdAt)}`} />

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

      <Card title="Buyer message" accent="amber">
        <DataTable
          columns={['Field', 'Value']}
          rows={[
            ['Name', lead.contactName ?? 'Not captured'],
            ['Email', lead.contactEmail ?? 'Not captured'],
            ['Phone', lead.contactPhone ?? 'Not captured'],
            ['Message', lead.sourceMessage ?? 'No message captured']
          ]}
        />
      </Card>

      <Card title="Reply templates" subtitle="Copying a template records usage on the lead timeline." accent="green">
        <DataTable
          columns={['Template', 'Text', 'Action']}
          rows={templates.map((template) => [
            template.label,
            template.text,
            <CopyReplyTemplateButton key={template.key} leadId={lead.id} templateKey={template.key} text={template.text} />
          ])}
        />
      </Card>

      <Card title="Alert delivery history" accent="blue">
        <div className="stack">
          <RetryLeadNotificationsButton leadId={lead.id} />
          <DataTable
            columns={['When', 'Channel', 'Status', 'Attempts', 'Provider', 'Last error']}
            rows={deliveries.map((delivery) => [
              formatDateTime(delivery.updatedAt),
              delivery.channel.toUpperCase(),
              delivery.status,
              String(delivery.attempts),
              delivery.providerId ?? 'None',
              delivery.lastError ?? 'None'
            ])}
          />
        </div>
      </Card>

      <Card title="Lead events" accent="slate">
        <DataTable
          columns={['When', 'Type', 'Actor']}
          rows={lead.events.map((event) => [formatDateTime(event.createdAt), event.type, event.actor])}
        />
      </Card>
    </div>
  );
}
