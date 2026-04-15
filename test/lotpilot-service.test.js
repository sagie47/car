import test from 'node:test';
import assert from 'node:assert/strict';
import { LotPilotService } from '../src/service/lotpilot-service.js';

function createServiceContext() {
  const service = new LotPilotService();
  const dealer = service.createDealer({ name: 'Northside Auto' });
  const rooftop = service.createRooftop({
    dealerId: dealer.id,
    name: 'Northside Main',
    rules: {
      minimumPhotos: 5,
      staleThresholdDays: 45
    }
  });

  return { service, dealer, rooftop };
}

function buildVehicle(overrides = {}) {
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
    photoUrls: [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
      'https://example.com/4.jpg',
      'https://example.com/5.jpg',
      'https://example.com/6.jpg'
    ],
    status: 'in_stock',
    daysInInventory: 12,
    ...overrides
  };
}

test('inventory ingest upserts by VIN and creates a listing draft', () => {
  const { service, rooftop } = createServiceContext();

  const firstIngest = service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle()]
  });

  const [vehicle] = service.listVehicles({ rooftopId: rooftop.id });
  const [listing] = service.listListings({ rooftopId: rooftop.id });

  assert.equal(firstIngest.summary.createdVehicles, 1);
  assert.equal(firstIngest.summary.createdListings, 1);
  assert.equal(vehicle.eligibility.status, 'eligible');
  assert.equal(listing.state, 'draft_created');
  assert.equal(listing.draft.title, '2021 Toyota Camry SE');

  service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle({ price: 24995 })]
  });

  const [updatedVehicle] = service.listVehicles({ rooftopId: rooftop.id });
  assert.equal(service.listVehicles({ rooftopId: rooftop.id }).length, 1);
  assert.equal(updatedVehicle.price, 24995);
});

test('duplicate VINs are flagged and not imported twice in the same batch', () => {
  const { service, rooftop } = createServiceContext();

  const result = service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'csv',
    vehicles: [buildVehicle(), buildVehicle({ stockNumber: 'A101' })]
  });

  assert.equal(result.syncRun.rowsImported, 1);
  assert.equal(result.syncRun.rowsSkipped, 1);
  assert.deepEqual(result.syncRun.duplicateVins, ['1HGBH41JXMN109186']);
  assert.equal(service.listVehicles({ rooftopId: rooftop.id }).length, 1);
});

test('sold inventory queues an existing published listing for removal', () => {
  const { service, rooftop } = createServiceContext();

  service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle()]
  });

  const [listing] = service.listListings({ rooftopId: rooftop.id });

  service.transitionListing(listing.id, 'queued_for_publish', { actor: 'manager', reason: 'Ready to publish' });
  service.transitionListing(listing.id, 'publish_in_progress', { actor: 'ops', reason: 'Publish started' });
  service.transitionListing(listing.id, 'published', { actor: 'ops', reason: 'Publish completed' });

  service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle({ status: 'sold' })]
  });

  const updatedListing = service.getListing(listing.id);
  assert.equal(updatedListing.state, 'queued_for_remove');
  assert.equal(updatedListing.events.at(-1).reason, 'Vehicle became ineligible');
});

test('lead assignment and status updates are tracked', () => {
  const { service, rooftop } = createServiceContext();

  service.ingestInventory({
    rooftopId: rooftop.id,
    sourceType: 'feed',
    vehicles: [buildVehicle({ daysInInventory: 52 })]
  });

  const [vehicle] = service.listVehicles({ rooftopId: rooftop.id });
  const [listing] = service.listListings({ rooftopId: rooftop.id });
  const health = service.getRooftopHealth(rooftop.id);
  const staleVehicles = service.listStaleVehicles(rooftop.id);

  assert.ok(health.score > 0);
  assert.equal(staleVehicles.length, 1);
  assert.equal(listing.draft.assets.some((asset) => asset.type === 'stale_unit_video'), true);

  const lead = service.createLead({
    rooftopId: rooftop.id,
    vehicleId: vehicle.id,
    sourceChannel: 'marketplace',
    sourceSubchannel: 'messenger'
  });

  const assignedLead = service.assignLead(lead.id, 'rep_123', 'manager');
  const respondedLead = service.updateLeadStatus(lead.id, 'responded', { actor: 'rep_123' });

  assert.equal(assignedLead.assignedRepId, 'rep_123');
  assert.equal(respondedLead.status, 'responded');
  assert.ok(respondedLead.firstResponseAt);
});
