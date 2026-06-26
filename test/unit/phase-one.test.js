import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvInventory } from '../../src/adapters/csv-inventory.js';
import { createFirecrawlInventoryAdapter } from '../../src/adapters/firecrawl-inventory.js';
import { LotPilotService } from '../../src/service/lotpilot-service.js';
import { InMemoryStore } from '../../src/store/in-memory-store.js';

function vehicle(overrides = {}) {
  return {
    vin: '1HGCM82633A123456',
    stockNumber: 'B200',
    year: 2020,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    mileage: 22000,
    price: 23995,
    photoUrls: [
      'https://dealer.example/one.jpg',
      'https://dealer.example/two.jpg',
      'https://dealer.example/three.jpg',
      'https://dealer.example/four.jpg',
      'https://dealer.example/five.jpg'
    ],
    status: 'in_stock',
    ...overrides
  };
}

async function context(options = {}) {
  const service = new LotPilotService({ store: new InMemoryStore(), ...options });
  const dealer = await service.createDealer({ name: 'Northside Auto' });
  const rooftop = await service.createRooftop({ dealerId: dealer.id, name: 'Northside Main' });
  return { service, dealer, rooftop };
}

test('CSV import accepts vehicle rows and keeps source row metadata', () => {
  const [parsed] = parseCsvInventory(
    'Year,Make,Model,Price,Photo URLs\n2020,Honda,Accord,"$23,995",https://dealer.example/one.jpg|https://dealer.example/two.jpg'
  );

  assert.equal(parsed.year, 2020);
  assert.equal(parsed.price, 23995);
  assert.equal(parsed.photoUrls.length, 2);
  assert.equal(parsed.rawSource.row, 2);
});

test('website inventory source uses the Firecrawl adapter and persists a sync result', async () => {
  const { service, rooftop } = await context({
    inventoryAdapter: {
      async importInventory() {
        return { vehicles: [vehicle()], raw: { detailPageCount: 1 } };
      }
    }
  });
  const source = await service.createInventorySource({
    rooftopId: rooftop.id,
    name: 'Dealer website',
    type: 'website_inventory_url',
    format: 'firecrawl_structured_v1',
    sourceUrl: 'https://dealer.example/inventory'
  });

  const result = await service.syncInventorySource(source.id);
  assert.equal(result.syncRun.rowsImported, 1);
  assert.equal((await service.listVehicles({ rooftopId: rooftop.id })).length, 1);
  assert.equal(result.inventorySource.sourceConfig.lastExtraction.detailPageCount, 1);
});

test('Firecrawl adapter follows detail pages when inventory cards are partial', async () => {
  const calls = [];
  const adapter = createFirecrawlInventoryAdapter({
    apiKey: 'test_key',
    async fetchImpl(_endpoint, request) {
      const body = JSON.parse(request.body);
      calls.push(body.url);
      if (body.url.endsWith('/inventory')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sourceUrl: body.url,
              links: ['https://dealer.example/inventory/2021-toyota-camry'],
              json: {
                vehicles: [
                  {
                    year: 2021,
                    make: 'Toyota',
                    model: 'Camry',
                    url: 'https://dealer.example/inventory/2021-toyota-camry'
                  }
                ]
              }
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            sourceUrl: body.url,
            json: {
              '@type': 'Vehicle',
              name: '2021 Toyota Camry SE',
              vin: '4T1G11AK1MU000001',
              stockNumber: 'C400',
              price: '$24,995',
              mileage: '31,000',
              image: ['https://dealer.example/camry-1.jpg'],
              url: body.url
            }
          }
        })
      };
    }
  });

  const result = await adapter.importInventory('https://dealer.example/inventory');

  assert.deepEqual(calls, ['https://dealer.example/inventory', 'https://dealer.example/inventory/2021-toyota-camry']);
  assert.equal(result.raw.detailPageCount, 1);
  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].vin, '4T1G11AK1MU000001');
  assert.equal(result.vehicles[0].price, 24995);
});

test('Firecrawl adapter can authenticate to a secured self-hosted proxy with Basic Auth', async () => {
  let authorization;
  const adapter = createFirecrawlInventoryAdapter({
    basicAuth: 'lotpilot_firecrawl:test_password',
    async fetchImpl(_endpoint, request) {
      authorization = request.headers.Authorization;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            sourceUrl: 'https://dealer.example/inventory',
            json: {
              '@type': 'Vehicle',
              name: '2022 Ford F-150 XLT',
              vin: '1FTFW1E50NFA00001',
              price: 38995,
              image: ['https://dealer.example/f150.jpg']
            }
          }
        })
      };
    }
  });

  const result = await adapter.importInventory('https://dealer.example/inventory');

  assert.equal(authorization, `Basic ${Buffer.from('lotpilot_firecrawl:test_password').toString('base64')}`);
  assert.equal(result.vehicles[0].vin, '1FTFW1E50NFA00001');
});

test('CSV fallback uploads then imports inventory', async () => {
  const { service, rooftop } = await context();
  const source = await service.createInventorySource({
    rooftopId: rooftop.id,
    name: 'Fallback CSV',
    type: 'csv_upload',
    format: 'generic_csv_v1'
  });
  await service.uploadCsvInventorySource(source.id, 'Year,Make,Model,Stock Number\n2021,Toyota,Camry,C301');

  const result = await service.syncInventorySource(source.id);
  assert.equal(result.syncRun.rowsImported, 1);
  assert.equal((await service.listVehicles({ rooftopId: rooftop.id }))[0].stockNumber, 'C301');
});

test('listing overrides survive inventory refresh and copied activity is recorded', async () => {
  const { service, rooftop } = await context();
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  const [listing] = await service.listListings({ rooftopId: rooftop.id });
  await service.updateListingDraft(
    listing.id,
    { title: '2020 Honda Accord - Local Value', price: 22995, description: 'Dealer approved copy.', photoUrls: ['https://dealer.example/two.jpg'] },
    { actor: 'manager_1' }
  );
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle({ mileage: 23000 })] });
  await service.recordListingActivity(listing.id, 'copied', { block: 'full_post' }, { actor: 'manager_1' });

  const updated = await service.getListing(listing.id);
  assert.equal(updated.draft.marketplacePost.title, '2020 Honda Accord - Local Value');
  assert.equal(updated.draft.marketplacePost.price, 22995);
  assert.deepEqual(updated.draft.marketplacePost.photoUrls, ['https://dealer.example/two.jpg']);
  assert.equal(updated.events.at(-1).eventType, 'copied');
});

test('new leads create notification delivery records for active recipients', async () => {
  const calls = [];
  const { service, rooftop } = await context({
    notificationAdapter: {
      async send(message) {
        calls.push(message);
        return { providerId: 'provider_123' };
      }
    }
  });
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  const [storedVehicle] = await service.listVehicles({ rooftopId: rooftop.id });
  await service.createNotificationRecipient({ rooftopId: rooftop.id, channel: 'email', destination: 'manager@example.com' });
  const lead = await service.createLead({
    rooftopId: rooftop.id,
    vehicleId: storedVehicle.id,
    sourceChannel: 'email',
    contactEmail: 'buyer@example.com'
  });

  const deliveries = await service.store.listNotificationDeliveries({ leadId: lead.id });
  assert.equal(calls.length, 1);
  assert.equal(deliveries[0].status, 'sent');
  assert.equal(deliveries[0].providerId, 'provider_123');
});
