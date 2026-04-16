import Link from 'next/link';
import { Badge, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listListings, listVehicles } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

export default async function ListingsPage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No rooftop yet" body="Finish setup before reviewing listings." />;
  }

  const [listings, vehicles] = await Promise.all([
    listListings(context.activeRooftop.id),
    listVehicles(context.activeRooftop.id)
  ]);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return (
    <div className="stack page-stack">
      <PageHeader title="Listings" subtitle="Listing state machine activity and draft coverage." />
      <StatGrid
        stats={[
          { label: 'Listings', value: formatNumber(listings.length), tone: 'blue' },
          { label: 'Published', value: formatNumber(listings.filter((listing) => listing.state === 'published').length), tone: 'green' },
          { label: 'Needs attention', value: formatNumber(listings.filter((listing) => ['publish_failed', 'removal_failed', 'needs_manual_review'].includes(listing.state)).length), tone: 'amber' },
          { label: 'Queued remove', value: formatNumber(listings.filter((listing) => listing.state === 'queued_for_remove').length), tone: 'slate' }
        ]}
      />
      <DataTable
        columns={['Listing', 'Vehicle', 'State', 'Last updated', 'Events', 'Actions']}
        rows={listings.map((listing) => [
          listing.id,
          vehicleById.get(listing.vehicleId)
            ? `${vehicleById.get(listing.vehicleId)?.year ?? ''} ${vehicleById.get(listing.vehicleId)?.make ?? ''} ${vehicleById.get(listing.vehicleId)?.model ?? ''}`.trim()
            : listing.vehicleId,
          <Badge key={`${listing.id}-state`} tone={listing.state === 'published' ? 'green' : listing.state.includes('failed') || listing.state === 'needs_manual_review' ? 'amber' : 'blue'}>
            {listing.state.replace(/_/g, ' ')}
          </Badge>,
          formatDateTime(listing.updatedAt),
          formatNumber(listing.events.length),
          <Link key={`${listing.id}-action`} className="button" href={`/listings/${listing.id}`}>Details</Link>
        ])}
      />
    </div>
  );
}
