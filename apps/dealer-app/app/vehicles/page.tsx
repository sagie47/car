import Link from 'next/link';
import { Badge, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { formatCurrency, formatNumber, vehicleLabel } from '../../lib/format';
import { listVehicles } from '../../lib/api';

export default async function VehiclesPage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No rooftop yet" body="Finish setup before reviewing vehicles." />;
  }

  const vehicles = await listVehicles(context.activeRooftop.id);

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Vehicles"
        subtitle="Normalized inventory records, eligibility outcomes, and stale-unit visibility."
      />

      <StatGrid
        stats={[
          { label: 'Vehicles', value: formatNumber(vehicles.length), tone: 'blue' },
          { label: 'Eligible', value: formatNumber(vehicles.filter((vehicle) => vehicle.eligibility.status !== 'blocked').length), tone: 'green' },
          { label: 'Blocked', value: formatNumber(vehicles.filter((vehicle) => vehicle.eligibility.status === 'blocked').length), tone: 'amber' },
          { label: 'Stale', value: formatNumber(vehicles.filter((vehicle) => vehicle.isStale).length), tone: 'slate' }
        ]}
      />

      <DataTable
        columns={['Vehicle', 'Stock / VIN', 'Price', 'Status', 'Eligibility', 'Stale', 'Actions']}
        rows={vehicles.map((vehicle) => [
          <div key={`${vehicle.id}-vehicle`}>
            <strong>{vehicleLabel(vehicle)}</strong>
            <div className="muted">{vehicle.bodyStyle || 'Unknown body style'} • {vehicle.exteriorColor || 'No color'}</div>
          </div>,
          <div key={`${vehicle.id}-stock`}>
            <div>{vehicle.stockNumber || 'No stock'}</div>
            <div className="mono-copy">{vehicle.vin || 'No VIN'}</div>
          </div>,
          formatCurrency(vehicle.price),
          vehicle.status || 'unknown',
          <Badge key={`${vehicle.id}-eligibility`} tone={vehicle.eligibility.status === 'blocked' ? 'amber' : vehicle.eligibility.status === 'eligible_with_warning' ? 'blue' : 'green'}>
            {vehicle.eligibility.status.replace(/_/g, ' ')}
          </Badge>,
          vehicle.isStale ? <Badge key={`${vehicle.id}-stale`} tone="amber">stale</Badge> : <Badge key={`${vehicle.id}-fresh`} tone="green">fresh</Badge>,
          <Link key={`${vehicle.id}-action`} className="button" href={`/vehicles/${vehicle.id}`}>Details</Link>
        ])}
      />
    </div>
  );
}
