import { ListingTransitionForm } from '../../../components/actions';
import { Badge, Card, DataTable, EmptyState, PageHeader } from '../../../components/cards';
import { getListing, getVehicle } from '../../../lib/api';
import { formatDateTime, vehicleLabel } from '../../../lib/format';

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;

  let listing;
  try {
    listing = await getListing(listingId);
  } catch {
    return <EmptyState title="Listing not found" body="The requested listing could not be loaded." />;
  }

  const vehicle = await getVehicle(listing.vehicleId);

  return (
    <div className="stack page-stack">
      <PageHeader
        title={listing.draft.title || vehicleLabel(vehicle)}
        subtitle={`Listing ${listing.id} • vehicle ${vehicle.stockNumber || vehicle.vin}`}
      />

      <div className="content-grid">
        <Card title="Current state" accent="blue">
          <div className="stack">
            <Badge tone={listing.state === 'published' ? 'green' : listing.state.includes('failed') || listing.state === 'needs_manual_review' ? 'amber' : 'blue'}>
              {listing.state.replace(/_/g, ' ')}
            </Badge>
            <p className="muted">Updated {formatDateTime(listing.updatedAt)}</p>
            <ListingTransitionForm listingId={listing.id} currentState={listing.state} />
          </div>
        </Card>

        <Card title="Draft summary" accent="green">
          <div className="stack">
            <p><strong>Short description</strong></p>
            <p className="muted">{listing.draft.shortDescription}</p>
            <p><strong>CTA</strong></p>
            <p className="muted">{listing.draft.ctaBlock}</p>
          </div>
        </Card>
      </div>

      <Card title="Event history" accent="slate">
        <DataTable
          columns={['When', 'From', 'To', 'Actor', 'Reason']}
          rows={listing.events.map((event) => [
            formatDateTime(event.createdAt),
            event.fromState ?? 'start',
            event.toState,
            event.actor,
            event.reason ?? 'No reason'
          ])}
        />
      </Card>

      {listing.draft.marketplacePost ? (
        <Card title="Facebook Marketplace post" subtitle="Copy-and-approve output for the assisted posting workflow." accent="blue">
          <div className="stack">
            <DataTable
              columns={['Field', 'Copy-ready value']}
              rows={[
                ['Title', listing.draft.marketplacePost.copyBlocks.title],
                ['Price', listing.draft.marketplacePost.copyBlocks.price || 'No price'],
                ['Channel', listing.draft.marketplacePost.channel.replace(/_/g, ' ')],
                ['Workflow', listing.draft.marketplacePost.workflow.replace(/_/g, ' ')]
              ]}
            />
            <div>
              <p><strong>Description</strong></p>
              <pre className="mono-copy">{listing.draft.marketplacePost.copyBlocks.description}</pre>
            </div>
            <div>
              <p><strong>Posting checklist</strong></p>
              <ul className="check-list">
                {listing.draft.marketplacePost.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Draft body" accent="amber">
        <pre className="mono-copy">{listing.draft.longDescription}</pre>
      </Card>
    </div>
  );
}
