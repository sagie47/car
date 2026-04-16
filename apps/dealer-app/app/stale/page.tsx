import Link from 'next/link';
import { Badge, DataTable, EmptyState, PageHeader, StatGrid } from '../../components/cards';
import { getAppContext } from '../../lib/app-context';
import { listStaleVehicles } from '../../lib/api';
import { formatCurrency, formatNumber, vehicleLabel } from '../../lib/format';

export default async function StalePage() {
  const context = await getAppContext();

  if (!context.activeRooftop) {
    return <EmptyState title="No rooftop yet" body="Finish setup before reviewing stale inventory." />;
  }

  const vehicles = await listStaleVehicles(context.activeRooftop.id);

  return (
    <div className="stack page-stack">
      <PageHeader
        title="Stale inventory queue"
        subtitle="This beta surface derives stale units from the current backend rules. It is not a true booster workflow yet."
      />
      <StatGrid
        stats={[
          { label: 'Stale units', value: formatNumber(vehicles.length), tone: 'amber' },
          { label: 'Eligible stale', value: formatNumber(vehicles.filter((vehicle) => vehicle.eligibility.status !== 'blocked').length), tone: 'green' },
          { label: 'Blocked stale', value: formatNumber(vehicles.filter((vehicle) => vehicle.eligibility.status === 'blocked').length), tone: 'slate' }
        ]}
      />
      <DataTable
        columns={['Vehicle', 'Days in inventory', 'Price', 'Eligibility', 'Actions']}
        rows={vehicles.map((vehicle) => [
          vehicleLabel(vehicle),
          formatNumber(vehicle.daysInInventory),
          formatCurrency(vehicle.price),
          <Badge key={`${vehicle.id}-eligibility`} tone={vehicle.eligibility.status === 'blocked' ? 'amber' : 'blue'}>
            {vehicle.eligibility.status.replace(/_/g, ' ')}
          </Badge>,
          <Link key={`${vehicle.id}-action`} className="button" href={`/vehicles/${vehicle.id}`}>Vehicle</Link>
        ])}
      />
    </div>
  );
}
