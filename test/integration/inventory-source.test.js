import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrismaService,
  createPrismaTestClient,
  resetDatabase,
  seedDealerContext,
  seedInventorySource
} from '../helpers/database.js';
import { buildInventoryXml, createXmlFeedServer } from '../helpers/xml-feed.js';

function buildXmlVehicle(overrides = {}) {
  return {
    vin: '1HGBH41JXMN109186',
    stockNumber: 'A100',
    year: 2021,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 18250,
    price: 25995,
    bodyStyle: 'Sedan',
    exteriorColor: 'Blue',
    status: 'in_stock',
    daysInInventory: 12,
    photoUrls: [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
      'https://example.com/4.jpg',
      'https://example.com/5.jpg',
      'https://example.com/6.jpg'
    ],
    ...overrides
  };
}

test('manual XML source sync persists vehicles, listings, source metadata, and sync runs', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const feedServer = await createXmlFeedServer({
    body: buildInventoryXml([buildXmlVehicle()])
  });

  const service = createPrismaService(client);
  const { rooftop } = await seedDealerContext(service);
  const inventorySource = await seedInventorySource(service, rooftop, feedServer.url);

  const result = await service.syncInventorySource(inventorySource.id);

  const sources = await service.listInventorySources({ rooftopId: rooftop.id });
  const syncRuns = await service.listSyncRuns({ inventorySourceId: inventorySource.id });
  const vehicles = await service.listVehicles({ rooftopId: rooftop.id });
  const listings = await service.listListings({ rooftopId: rooftop.id });

  assert.equal(result.summary.createdVehicles, 1);
  assert.equal(sources[0].lastSyncStatus, 'completed');
  assert.ok(sources[0].lastSyncedAt);
  assert.equal(syncRuns.length, 1);
  assert.equal(syncRuns[0].status, 'completed');
  assert.equal(syncRuns[0].inventorySourceId, inventorySource.id);
  assert.equal(vehicles.length, 1);
  assert.equal(listings.length, 1);

  await feedServer.close();
  await client.$disconnect();
});

test('repeated XML source sync updates an existing vehicle by natural key instead of duplicating it', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  let feedBody = buildInventoryXml([buildXmlVehicle()]);
  const feedServer = await createXmlFeedServer({
    getBody: () => feedBody
  });

  const service = createPrismaService(client);
  const { rooftop } = await seedDealerContext(service);
  const inventorySource = await seedInventorySource(service, rooftop, feedServer.url);

  await service.syncInventorySource(inventorySource.id);

  feedBody = buildInventoryXml([buildXmlVehicle({ price: 24995, daysInInventory: 52 })]);
  await service.syncInventorySource(inventorySource.id);

  const vehicles = await service.listVehicles({ rooftopId: rooftop.id });
  const syncRuns = await service.listSyncRuns({ inventorySourceId: inventorySource.id });

  assert.equal(vehicles.length, 1);
  assert.equal(vehicles[0].price, 24995);
  assert.equal(vehicles[0].snapshots.length, 2);
  assert.equal(syncRuns.length, 2);

  await feedServer.close();
  await client.$disconnect();
});
