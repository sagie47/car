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

test('setup from inventory URL infers dealer location and runs the first sync', async () => {
  const service = new LotPilotService({
    store: new InMemoryStore(),
    inventoryAdapter: {
      async importInventory() {
        return { vehicles: [vehicle()], raw: { detailPageCount: 1 } };
      }
    }
  });

  const result = await service.setupFromInventoryUrl({
    inventoryUrl: 'https://eliteautocentre.ca/used/RAM-3500.html'
  });

  assert.equal(result.dealer.name, 'Elite Auto Centre');
  assert.equal(result.rooftop.name, 'Elite Auto Centre');
  assert.equal(result.inventorySource.type, 'website_inventory_url');
  assert.equal(result.syncRun.rowsImported, 1);
  assert.equal((await service.listListings({ rooftopId: result.rooftop.id })).length, 1);
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

test('Firecrawl adapter discovers inventory pages from a dealer homepage', async () => {
  const calls = [];
  const adapter = createFirecrawlInventoryAdapter({
    apiKey: 'test_key',
    async fetchImpl(_endpoint, request) {
      const body = JSON.parse(request.body);
      calls.push(body.url);
      if (body.url === 'https://dealer.example/') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sourceUrl: body.url,
              html: '<html><title>Dealer Home</title></html>',
              links: ['https://dealer.example/used/search.html']
            }
          })
        };
      }
      if (body.url === 'https://dealer.example/used/search.html') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sourceUrl: body.url,
              links: [
                'https://dealer.example/used/2020-Honda-Accord-id123.html',
                'https://dealer.example/used/2020-Honda-Accord-id123.html?show_video=1'
              ]
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
            html: `
              <title>2020 Honda Accord Sport $23,995</title>
              <input type="hidden" name="vin" value="1HGCV1F30LA000001">
              <input type="hidden" name="year" value="2020">
              <input type="hidden" name="make" value="Honda">
              <input type="hidden" name="model" value="Accord">
              <input type="hidden" name="trim" value="Sport">
              <input type="hidden" name="price" value="23995">
              https://imagescdn.d2cmedia.ca/vehicle-one.jpg
            `
          }
        })
      };
    }
  });

  const result = await adapter.importInventory('https://dealer.example/');

  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].vin, '1HGCV1F30LA000001');
  assert.equal(result.raw.discoveredInventoryPageUrls[0], 'https://dealer.example/used/search.html');
  assert.deepEqual(calls, [
    'https://dealer.example/',
    'https://dealer.example/used/search.html',
    'https://dealer.example/used/2020-Honda-Accord-id123.html'
  ]);
});

test('Firecrawl adapter parses Hillz rendered vehicle detail pages', async () => {
  const calls = [];
  const adapter = createFirecrawlInventoryAdapter({
    apiKey: 'test_key',
    async fetchImpl(_endpoint, request) {
      const body = JSON.parse(request.body);
      calls.push(body.url);
      if (body.url === 'https://dealer.example/') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sourceUrl: body.url,
              links: ['https://dealer.example/cars']
            }
          })
        };
      }
      if (body.url === 'https://dealer.example/cars') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sourceUrl: body.url,
              links: ['https://dealer.example/cars/used/2016-chrysler-200-586523']
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
            html: `
              <span data-cg-vin="1C3CCCAB2GN158699" data-cg-price="12977"></span>
              <span class="DetaileProductCustomrWeb-title">2016 Chrysler</span>
              <span class="DetaileProductCustomrWeb-subtitle">&nbsp; 200 4dr Sdn Limited FWD</span>
              <div class="vehicle_single_detail_div__container"><span>Year</span><span>2016</span></div>
              <div class="vehicle_single_detail_div__container"><span>Make</span><span>Chrysler</span></div>
              <div class="vehicle_single_detail_div__container"><span>Model</span><span>200</span></div>
              <div class="vehicle_single_detail_div__container"><span>Body Style</span><span>Sedan</span></div>
              <div class="vehicle_single_detail_div__container"><span>Odometer</span><span>119,099 KM</span></div>
              <div class="vehicle_single_detail_div__container"><span>Transmission</span><span>Automatic</span></div>
              <div class="vehicle_single_detail_div__container"><span>Drivetrain</span><span>FWD</span></div>
              <div class="vehicle_single_detail_div__container"><span>VIN</span><span>1C3CCCAB2GN158699</span></div>
              <div class="vehicle_single_detail_div__container"><span>Stock</span><span>4542-1</span></div>
              <img src="https://image123.azureedge.net/dealer/2016-Chrysler-200-one.jpg">
              <img src="https://image123.azureedge.net/dealer/2017-GMC-Sierra3500HD-other.jpg">
            `
          }
        })
      };
    }
  });

  const result = await adapter.importInventory('https://dealer.example/');

  assert.deepEqual(calls, [
    'https://dealer.example/',
    'https://dealer.example/cars',
    'https://dealer.example/cars/used/2016-chrysler-200-586523'
  ]);
  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].vin, '1C3CCCAB2GN158699');
  assert.equal(result.vehicles[0].stockNumber, '4542-1');
  assert.equal(result.vehicles[0].mileage, 119099);
  assert.equal(result.vehicles[0].bodyStyle, 'Sedan');
  assert.deepEqual(result.vehicles[0].photoUrls, ['https://image123.azureedge.net/dealer/2016-Chrysler-200-one.jpg']);
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

test('posting queue rebuild creates a pending publish job for ready listings', async () => {
  const { service, rooftop } = await context();
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });

  const result = await service.rebuildPostingQueue(rooftop.id, { actor: 'test' });
  const [job] = result.createdJobs;
  const [listing] = await service.listListings({ rooftopId: rooftop.id });

  assert.equal(result.account.platform, 'facebook_marketplace');
  assert.equal(result.account.dailyCapacity, 25);
  assert.equal(result.account.autoSubmitEnabled, true);
  assert.equal(job.action, 'publish');
  assert.equal(job.status, 'pending');
  assert.equal(listing.state, 'queued_for_publish');
});

test('posting queue blocks jobs that fail Marketplace readiness checks', async () => {
  const { service, rooftop } = await context();
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  const [listing] = await service.listListings({ rooftopId: rooftop.id });
  const storedVehicle = await service.getVehicle(listing.vehicleId);
  await service.store.saveVehicle({ ...storedVehicle, price: null, photoUrls: [], updatedAt: new Date().toISOString() });

  const result = await service.rebuildPostingQueue(rooftop.id, { actor: 'test' });
  const [job] = result.blockedJobs;

  assert.equal(result.createdJobs.length, 0);
  assert.equal(job.status, 'blocked');
  assert.equal(job.complianceChecks.some((check) => check.key === 'has_price' && !check.ok), true);
});

test('posting job claim and completion records an attempt and publishes listing', async () => {
  const { service, rooftop } = await context();
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  const result = await service.rebuildPostingQueue(rooftop.id, { actor: 'test' });
  const claimed = await service.claimPostingJob(result.createdJobs[0].id, { actor: 'extension_test' });

  assert.equal(claimed.job.status, 'claimed');
  assert.equal(claimed.listing.state, 'publish_in_progress');

  const completed = await service.completePostingJob(
    claimed.job.id,
    { liveUrl: 'https://www.facebook.com/marketplace/item/123', result: { submitted: true } },
    { actor: 'extension_test' }
  );
  const attempts = await service.store.listPostingAttempts({ jobId: claimed.job.id });

  assert.equal(completed.job.status, 'completed');
  assert.equal(completed.job.liveUrl, 'https://www.facebook.com/marketplace/item/123');
  assert.equal(completed.listing.state, 'published');
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, 'completed');
});

test('posting queue creates remove jobs when live inventory becomes unavailable', async () => {
  const { service, rooftop } = await context();
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  await service.rebuildPostingQueue(rooftop.id, { actor: 'test' });
  const [listing] = await service.listListings({ rooftopId: rooftop.id });
  await service.transitionListing(listing.id, 'publish_in_progress', { actor: 'test' });
  await service.transitionListing(listing.id, 'published', { actor: 'test' });

  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle({ status: 'sold' })] });
  const result = await service.rebuildPostingQueue(rooftop.id, { actor: 'test' });
  const removeJob = result.createdJobs.find((job) => job.action === 'remove');

  assert.ok(removeJob);
  assert.equal(removeJob.status, 'pending');
});
