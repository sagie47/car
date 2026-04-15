import test from 'node:test';
import assert from 'node:assert/strict';
import { LotPilotService } from '../../src/service/lotpilot-service.js';
import { InMemoryStore } from '../../src/store/in-memory-store.js';

function createService({ feedAdapter } = {}) {
  return new LotPilotService({
    store: new InMemoryStore(),
    feedAdapter
  });
}

async function createDealerContext(service) {
  const dealer = await service.createDealer({ name: 'Northside Auto' });
  const rooftop = await service.createRooftop({
    dealerId: dealer.id,
    name: 'Northside Main'
  });

  return { dealer, rooftop };
}

test('createInventorySource validates type, format, and URL', async () => {
  const service = createService();
  const { rooftop } = await createDealerContext(service);

  await assert.rejects(
    service.createInventorySource({
      rooftopId: rooftop.id,
      name: 'Invalid feed',
      type: 'csv_url',
      format: 'generic_xml_v1',
      sourceUrl: 'https://example.com/feed.xml'
    }),
    { message: "Unsupported inventory source type 'csv_url'" }
  );

  await assert.rejects(
    service.createInventorySource({
      rooftopId: rooftop.id,
      name: 'Invalid feed',
      type: 'xml_feed_url',
      format: 'generic_xml_v1',
      sourceUrl: 'notaurl'
    }),
    { message: 'sourceUrl must be a valid http or https URL' }
  );
});

test('syncInventorySource persists a failed sync run when the feed adapter fails', async () => {
  const service = createService({
    feedAdapter: {
      async fetchXmlFeed() {
        throw new Error('Feed request failed with status 500');
      },
      parseGenericXmlFeed() {
        throw new Error('should not be called');
      }
    }
  });
  const { rooftop } = await createDealerContext(service);
  const source = await service.createInventorySource({
    rooftopId: rooftop.id,
    name: 'Primary XML Feed',
    type: 'xml_feed_url',
    format: 'generic_xml_v1',
    sourceUrl: 'https://example.com/feed.xml'
  });

  await assert.rejects(service.syncInventorySource(source.id), {
    message: 'Feed request failed with status 500'
  });

  const syncRuns = await service.listSyncRuns({ inventorySourceId: source.id });
  const updatedSource = await service.getInventorySource(source.id);

  assert.equal(syncRuns.length, 1);
  assert.equal(syncRuns[0].status, 'failed');
  assert.equal(updatedSource.lastSyncStatus, 'failed');
});
