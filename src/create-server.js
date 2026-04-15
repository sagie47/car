import http from 'node:http';
import { URL } from 'node:url';
import { createDefaultService } from './service/create-default-service.js';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function matchPath(pathname, pattern) {
  const actualParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (actualParts.length !== patternParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = actualParts[index];

    if (expected.startsWith(':')) {
      params[expected.slice(1)] = actual;
      continue;
    }

    if (expected !== actual) {
      return null;
    }
  }

  return params;
}

export function createHttpServer({ service = createDefaultService() } = {}) {
  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url, 'http://localhost');
    const { pathname, searchParams } = requestUrl;

    try {
      if (request.method === 'GET' && pathname === '/health') {
        return sendJson(response, 200, {
          ok: true,
          service: 'lotpilot',
          timestamp: new Date().toISOString()
        });
      }

      if (request.method === 'POST' && pathname === '/api/dealers') {
        return sendJson(response, 201, await service.createDealer(await readJson(request)));
      }

      if (request.method === 'POST' && pathname === '/api/rooftops') {
        return sendJson(response, 201, await service.createRooftop(await readJson(request)));
      }

      if (request.method === 'POST' && pathname === '/api/inventory-sources') {
        return sendJson(response, 201, await service.createInventorySource(await readJson(request)));
      }

      if (request.method === 'GET' && pathname === '/api/inventory-sources') {
        return sendJson(
          response,
          200,
          await service.listInventorySources({ rooftopId: searchParams.get('rooftopId') })
        );
      }

      if (request.method === 'POST' && pathname === '/api/ingest') {
        return sendJson(response, 200, await service.ingestInventory(await readJson(request)));
      }

      if (request.method === 'GET' && pathname === '/api/vehicles') {
        return sendJson(response, 200, await service.listVehicles({ rooftopId: searchParams.get('rooftopId') }));
      }

      const vehicleMatch = matchPath(pathname, '/api/vehicles/:vehicleId');
      if (request.method === 'GET' && vehicleMatch) {
        return sendJson(response, 200, await service.getVehicle(vehicleMatch.vehicleId));
      }

      const vehicleDraftMatch = matchPath(pathname, '/api/vehicles/:vehicleId/draft');
      if (request.method === 'POST' && vehicleDraftMatch) {
        return sendJson(
          response,
          200,
          await service.generateListingDraft(vehicleDraftMatch.vehicleId, await readJson(request))
        );
      }

      const rooftopHealthMatch = matchPath(pathname, '/api/rooftops/:rooftopId/health');
      if (request.method === 'GET' && rooftopHealthMatch) {
        return sendJson(response, 200, await service.getRooftopHealth(rooftopHealthMatch.rooftopId));
      }

      const staleVehicleMatch = matchPath(pathname, '/api/rooftops/:rooftopId/stale-vehicles');
      if (request.method === 'GET' && staleVehicleMatch) {
        return sendJson(response, 200, await service.listStaleVehicles(staleVehicleMatch.rooftopId));
      }

      if (request.method === 'GET' && pathname === '/api/listings') {
        return sendJson(response, 200, await service.listListings({ rooftopId: searchParams.get('rooftopId') }));
      }

      const listingMatch = matchPath(pathname, '/api/listings/:listingId');
      if (request.method === 'GET' && listingMatch) {
        return sendJson(response, 200, await service.getListing(listingMatch.listingId));
      }

      const listingTransitionMatch = matchPath(pathname, '/api/listings/:listingId/transitions');
      if (request.method === 'POST' && listingTransitionMatch) {
        const body = await readJson(request);
        return sendJson(
          response,
          200,
          await service.transitionListing(listingTransitionMatch.listingId, body.toState, {
            actor: body.actor,
            reason: body.reason,
            metadata: body.metadata
          })
        );
      }

      if (request.method === 'GET' && pathname === '/api/leads') {
        return sendJson(
          response,
          200,
          await service.listLeads({
            rooftopId: searchParams.get('rooftopId'),
            status: searchParams.get('status')
          })
        );
      }

      if (request.method === 'GET' && pathname === '/api/sync-runs') {
        return sendJson(
          response,
          200,
          await service.listSyncRuns({
            rooftopId: searchParams.get('rooftopId'),
            inventorySourceId: searchParams.get('inventorySourceId'),
            status: searchParams.get('status')
          })
        );
      }

      if (request.method === 'POST' && pathname === '/api/leads') {
        return sendJson(response, 201, await service.createLead(await readJson(request)));
      }

      const inventorySourceMatch = matchPath(pathname, '/api/inventory-sources/:inventorySourceId');
      if (request.method === 'GET' && inventorySourceMatch) {
        return sendJson(response, 200, await service.getInventorySource(inventorySourceMatch.inventorySourceId));
      }

      const inventorySourceSyncMatch = matchPath(pathname, '/api/inventory-sources/:inventorySourceId/sync');
      if (request.method === 'POST' && inventorySourceSyncMatch) {
        return sendJson(response, 200, await service.syncInventorySource(inventorySourceSyncMatch.inventorySourceId));
      }

      const syncRunMatch = matchPath(pathname, '/api/sync-runs/:syncRunId');
      if (request.method === 'GET' && syncRunMatch) {
        return sendJson(response, 200, await service.getSyncRun(syncRunMatch.syncRunId));
      }

      const leadAssignMatch = matchPath(pathname, '/api/leads/:leadId/assign');
      if (request.method === 'PATCH' && leadAssignMatch) {
        const body = await readJson(request);
        return sendJson(
          response,
          200,
          await service.assignLead(leadAssignMatch.leadId, body.assignedRepId, body.actor)
        );
      }

      const leadStatusMatch = matchPath(pathname, '/api/leads/:leadId/status');
      if (request.method === 'PATCH' && leadStatusMatch) {
        const body = await readJson(request);
        return sendJson(response, 200, await service.updateLeadStatus(leadStatusMatch.leadId, body.status, body));
      }

      return sendJson(response, 404, {
        error: 'Route not found'
      });
    } catch (error) {
      return sendJson(response, 400, {
        error: error.message,
        syncRunId: error.syncRunId ?? null
      });
    }
  }

  return http.createServer((request, response) => {
    handleRequest(request, response);
  });
}
