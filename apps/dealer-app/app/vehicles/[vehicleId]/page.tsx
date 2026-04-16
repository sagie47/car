import Link from 'next/link';
import { Badge, Card, DataTable, EmptyState, PageHeader } from '../../../components/cards';
import { getListing, getVehicle, listListings } from '../../../lib/api';
import { formatCurrency, formatDateTime, formatNumber, vehicleLabel } from '../../../lib/format';

export default async function VehicleDetailPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;

  let vehicle;
  try {
    vehicle = await getVehicle(vehicleId);
  } catch {
    return <EmptyState title="Vehicle not found" body="The requested vehicle could not be loaded." />;
  }

  const listings = await listListings(vehicle.rooftopId);
  const listing = listings.find((candidate) => candidate.vehicleId === vehicle.id) ?? null;

  return (
    <div className="stack page-stack">
      <PageHeader
        title={vehicleLabel(vehicle)}
        subtitle={`${vehicle.stockNumber || 'No stock'} • ${vehicle.vin || 'No VIN'} • synced ${formatDateTime(vehicle.updatedAt)}`}
        actions={listing ? <Link className="button" href={`/listings/${listing.id}`}>Open listing</Link> : null}
      />

      <div className="content-grid">
        <Card title="Vehicle facts" accent="blue">
          <DataTable
            columns={['Field', 'Value']}
            rows={[
              ['Price', formatCurrency(vehicle.price)],
              ['Mileage', formatNumber(vehicle.mileage)],
              ['Status', vehicle.status || 'unknown'],
              ['Body style', vehicle.bodyStyle || 'Unknown'],
              ['Exterior', vehicle.exteriorColor || 'Unknown'],
              ['Interior', vehicle.interiorColor || 'Unknown'],
              ['Photos', formatNumber(vehicle.photoUrls.length)],
              ['Snapshots', formatNumber(vehicle.snapshots.length)]
            ]}
          />
        </Card>

        <Card title="Eligibility" accent={vehicle.eligibility.status === 'blocked' ? 'amber' : 'green'}>
          <div className="stack">
            <Badge tone={vehicle.eligibility.status === 'blocked' ? 'amber' : vehicle.eligibility.status === 'eligible_with_warning' ? 'blue' : 'green'}>
              {vehicle.eligibility.status.replace(/_/g, ' ')}
            </Badge>
            {vehicle.eligibility.reasons.length ? (
              <ul>
                {vehicle.eligibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
            {vehicle.eligibility.warnings.length ? (
              <ul>
                {vehicle.eligibility.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Photo URLs" accent="slate">
        <DataTable
          columns={['Position', 'URL']}
          rows={vehicle.photoUrls.map((photoUrl, index) => [String(index + 1), <span key={photoUrl} className="mono-copy">{photoUrl}</span>])}
        />
      </Card>
    </div>
  );
}
