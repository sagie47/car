import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpServer } from '../../src/create-server.js';
import {
  createPrismaService,
  createPrismaTestClient,
  resetDatabase
} from '../helpers/database.js';
import { buildVehicle } from '../helpers/database.js';
import { buildInventoryXml, createXmlFeedServer } from '../helpers/xml-feed.js';

test('http server smoke covers dealer creation and ingest over the Prisma-backed service', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const server = createHttpServer({
    service: createPrismaService(client)
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const dealerResponse = await fetch(`${baseUrl}/api/dealers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Northside Auto' })
  });
  const dealer = await dealerResponse.json();

  const rooftopResponse = await fetch(`${baseUrl}/api/rooftops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dealerId: dealer.id,
      name: 'Northside Main',
      rules: {
        minimumPhotos: 5,
        staleThresholdDays: 45
      }
    })
  });
  const rooftop = await rooftopResponse.json();

  const ingestResponse = await fetch(`${baseUrl}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rooftopId: rooftop.id,
      sourceType: 'feed',
      vehicles: [buildVehicle()]
    })
  });
  const ingestResult = await ingestResponse.json();

  assert.equal(dealerResponse.status, 201);
  assert.equal(rooftopResponse.status, 201);
  assert.equal(ingestResponse.status, 200);
  assert.equal(ingestResult.summary.createdVehicles, 1);
  assert.equal(ingestResult.health.totalVehicles, 1);

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await client.$disconnect();
});

test('http server exposes inventory-source creation and sync endpoints', async () => {
  const client = createPrismaTestClient();
  await resetDatabase(client);

  const feedServer = await createXmlFeedServer({
    body: buildInventoryXml([buildVehicle()])
  });

  const server = createHttpServer({
    service: createPrismaService(client)
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const dealerResponse = await fetch(`${baseUrl}/api/dealers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Northside Auto' })
  });
  const dealer = await dealerResponse.json();

  const rooftopResponse = await fetch(`${baseUrl}/api/rooftops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dealerId: dealer.id,
      name: 'Northside Main',
      rules: {
        minimumPhotos: 5,
        staleThresholdDays: 45
      }
    })
  });
  const rooftop = await rooftopResponse.json();

  const sourceResponse = await fetch(`${baseUrl}/api/inventory-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rooftopId: rooftop.id,
      name: 'Primary XML Feed',
      type: 'xml_feed_url',
      format: 'generic_xml_v1',
      sourceUrl: feedServer.url
    })
  });
  const source = await sourceResponse.json();

  const syncResponse = await fetch(`${baseUrl}/api/inventory-sources/${source.id}/sync`, {
    method: 'POST'
  });
  const syncResult = await syncResponse.json();

  const listSourceResponse = await fetch(`${baseUrl}/api/inventory-sources?rooftopId=${rooftop.id}`);
  const listSourceResult = await listSourceResponse.json();
  const syncRunResponse = await fetch(`${baseUrl}/api/sync-runs/${syncResult.syncRun.id}`);
  const syncRun = await syncRunResponse.json();

  assert.equal(sourceResponse.status, 201);
  assert.equal(syncResponse.status, 200);
  assert.equal(syncResult.summary.createdVehicles, 1);
  assert.equal(listSourceResult.length, 1);
  assert.equal(syncRun.status, 'completed');

  await feedServer.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await client.$disconnect();
});
