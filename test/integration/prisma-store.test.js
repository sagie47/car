import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVehicle,
  createPrismaService,
  createPrismaTestClient,
  resetDatabase,
  seedDealerContext
} from '../helpers/database.js';

test('persisted inventory survives service re-instantiation', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const service = createPrismaService(client);
  const { rooftop } = await seedDealerContext(service);

  await service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle()]
  });

  const secondClient = createPrismaTestClient();
  const secondService = createPrismaService(secondClient);

  const vehicles = await secondService.listVehicles({ rooftopId: rooftop.id });
  const listings = await secondService.listListings({ rooftopId: rooftop.id });

  assert.equal(vehicles.length, 1);
  assert.equal(listings.length, 1);
  assert.equal(vehicles[0].vin, '1HGBH41JXMN109186');

  await secondClient.$disconnect();
  await client.$disconnect();
});

test('vehicle snapshots and listing events are persisted in order', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const service = createPrismaService(client);
  const { rooftop } = await seedDealerContext(service);

  await service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle()]
  });

  const [listing] = await service.listListings({ rooftopId: rooftop.id });
  await service.transitionListing(listing.id, 'queued_for_publish', { actor: 'manager', reason: 'Ready to publish' });
  await service.transitionListing(listing.id, 'publish_in_progress', { actor: 'ops', reason: 'Publish started' });
  await service.transitionListing(listing.id, 'published', { actor: 'ops', reason: 'Publish completed' });

  await service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle({ price: 24995, daysInInventory: 50 })]
  });

  const [vehicle] = await service.listVehicles({ rooftopId: rooftop.id });
  const updatedListing = await service.getListing(listing.id);

  assert.equal(vehicle.snapshots.length, 2);
  assert.equal(updatedListing.events.length, 4);
  assert.equal(updatedListing.events[0].toState, 'draft_created');
  assert.equal(updatedListing.events.at(-1).toState, 'published');

  await client.$disconnect();
});

test('lead events and rooftop health are read from the persisted store', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const service = createPrismaService(client);
  const { rooftop } = await seedDealerContext(service);

  await service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle({ daysInInventory: 60 })]
  });

  const [vehicle] = await service.listVehicles({ rooftopId: rooftop.id });
  const lead = await service.createLead({
    rooftopId: rooftop.id,
    vehicleId: vehicle.id,
    sourceChannel: 'marketplace'
  });

  await service.assignLead(lead.id, 'rep_123', 'manager');
  await service.updateLeadStatus(lead.id, 'responded', { actor: 'rep_123' });

  const [persistedLead] = await service.listLeads({ rooftopId: rooftop.id, status: 'responded' });
  const health = await service.getRooftopHealth(rooftop.id);

  assert.equal(persistedLead.events.length, 3);
  assert.equal(persistedLead.events.at(-1).type, 'status_changed');
  assert.ok(health.score > 0);

  await client.$disconnect();
});
