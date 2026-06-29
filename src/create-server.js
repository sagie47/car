import http from 'node:http';
import { URL } from 'node:url';
import { createDefaultService } from './service/create-default-service.js';
import { createSupabaseAuth } from './auth/supabase-auth.js';
import { authorizeDealerAccess, authorizeRooftopAccess } from './auth/access-control.js';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.APP_ORIGIN ?? 'http://127.0.0.1:3001',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readText(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return '';
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(request) {
  const body = await readText(request);
  return body ? JSON.parse(body) : {};
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

export function createHttpServer({ service = createDefaultService(), auth = createSupabaseAuth() } = {}) {
  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url, 'http://localhost');
    const { pathname, searchParams } = requestUrl;

    let actorPromise;
    const getActor = async () => {
      if (!actorPromise) {
        actorPromise = auth.authenticate(request.headers.authorization).then(async (identity) => {
          if (!identity.bypass) {
            const profile = await service.upsertUserProfile(identity);
            await service.acceptPendingInvitations(profile);
          }
          return identity;
        });
      }
      return actorPromise;
    };
    const requireDealer = async (dealerId, minimumRole) =>
      authorizeDealerAccess({ service, actor: await getActor(), dealerId, minimumRole });
    const requireRooftop = async (rooftopId, minimumRole) =>
      authorizeRooftopAccess({ service, actor: await getActor(), rooftopId, minimumRole });

    try {
      if (request.method === 'OPTIONS') return sendJson(response, 204, {});
      if (request.method === 'GET' && pathname === '/health') {
        return sendJson(response, 200, {
          ok: true,
          service: 'lotpilot',
          timestamp: new Date().toISOString()
        });
      }

      if (request.method === 'POST' && pathname === '/api/webhooks/resend/inbound') {
        const rawBody = await readText(request);
        auth.verifyResendWebhook(rawBody, request.headers);
        const event = JSON.parse(rawBody);
        const data = event.data ?? event;
        const recipient = Array.isArray(data.to) ? data.to[0] : data.to;
        const rooftopId = String(recipient ?? '').match(/lead\+([^@]+)@/i)?.[1];
        if (!rooftopId) throw new Error('Inbound email must be addressed to a rooftop lead alias');
        const messageText = [data.subject, data.text, data.text_body, data.html].filter(Boolean).join('\n');
        const vehicle = data.vehicleId
          ? await service.getVehicle(data.vehicleId)
          : await service.findInboundLeadVehicle(rooftopId, messageText);
        if (!vehicle || vehicle.rooftopId !== rooftopId) {
          throw new Error('Could not match the inbound email to a vehicle; create the lead manually');
        }
        const externalId = data.email_id ?? data.id ?? event.id;
        if (!externalId) throw new Error('Inbound email is missing a provider event identifier');
        return sendJson(
          response,
          201,
          await service.ingestInboundLead({
            rooftopId,
            vehicleId: vehicle.id,
            externalId,
            payload: {
              contactName: data.from_name ?? null,
              contactEmail: data.from ?? null,
              contactPhone: data.phone ?? null,
              text: messageText
            }
          })
        );
      }

      if (request.method === 'GET' && pathname === '/api/me') {
        const actor = await getActor();
        const memberships = actor.bypass ? [] : await service.store.listMemberships({ userId: actor.id });
        return sendJson(response, 200, { actor, memberships });
      }

      if (request.method === 'POST' && pathname === '/api/dealers') {
        const actor = await getActor();
        const dealer = await service.createDealer(await readJson(request));
        if (!actor.bypass) {
          await service.saveMembership({ dealerId: dealer.id, userId: actor.id, role: 'owner' });
        }
        return sendJson(response, 201, dealer);
      }

      if (request.method === 'POST' && pathname === '/api/setup/inventory-url') {
        const actor = await getActor();
        const result = await service.setupFromInventoryUrl(await readJson(request));
        if (!actor.bypass) {
          await service.saveMembership({ dealerId: result.dealer.id, userId: actor.id, role: 'owner' });
          await service.grantRooftopAccess({ rooftopId: result.rooftop.id, userId: actor.id });
        }
        return sendJson(response, 201, result);
      }

      const dealerInviteMatch = matchPath(pathname, '/api/dealers/:dealerId/invitations');
      if (dealerInviteMatch && request.method === 'POST') {
        const actor = await getActor();
        await requireDealer(dealerInviteMatch.dealerId, 'owner');
        const body = await readJson(request);
        const invitation = await service.createInvitation({
          dealerId: dealerInviteMatch.dealerId,
          email: body.email,
          role: body.role,
          rooftopIds: body.rooftopIds ?? [],
          invitedById: actor.id
        });
        await auth.invite(body.email, `${process.env.APP_ORIGIN ?? 'http://127.0.0.1:3001'}/auth/callback`);
        return sendJson(response, 201, invitation);
      }

      if (request.method === 'GET' && pathname === '/api/dealers') {
        const actor = await getActor();
        const dealers = await service.listDealers();
        if (actor.bypass) return sendJson(response, 200, dealers);
        const memberships = await service.store.listMemberships({ userId: actor.id });
        const dealerIds = new Set(memberships.map((membership) => membership.dealerId));
        return sendJson(response, 200, dealers.filter((dealer) => dealerIds.has(dealer.id)));
      }

      if (request.method === 'POST' && pathname === '/api/rooftops') {
        const body = await readJson(request);
        await requireDealer(body.dealerId, 'manager');
        return sendJson(response, 201, await service.createRooftop(body));
      }

      const rooftopRecipientMatch = matchPath(pathname, '/api/rooftops/:rooftopId/notification-recipients');
      if (rooftopRecipientMatch && request.method === 'GET') {
        await requireRooftop(rooftopRecipientMatch.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.store.listNotificationRecipients({ rooftopId: rooftopRecipientMatch.rooftopId })
        );
      }
      if (rooftopRecipientMatch && request.method === 'POST') {
        const actor = await getActor();
        await requireRooftop(rooftopRecipientMatch.rooftopId, 'manager');
        const body = await readJson(request);
        return sendJson(
          response,
          201,
          await service.createNotificationRecipient({ ...body, rooftopId: rooftopRecipientMatch.rooftopId, userId: body.userId ?? actor.id })
        );
      }

      const recipientMatch = matchPath(pathname, '/api/notification-recipients/:recipientId');
      if (recipientMatch && request.method === 'PATCH') {
        const recipient = await service.store.getNotificationRecipient(recipientMatch.recipientId);
        if (!recipient) throw new Error(`Notification recipient ${recipientMatch.recipientId} was not found`);
        await requireRooftop(recipient.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.updateNotificationRecipient(recipient.id, await readJson(request))
        );
      }

      if (request.method === 'GET' && pathname === '/api/rooftops') {
        if (searchParams.get('dealerId')) await requireDealer(searchParams.get('dealerId'));
        return sendJson(response, 200, await service.listRooftops({ dealerId: searchParams.get('dealerId') }));
      }

      if (request.method === 'POST' && pathname === '/api/inventory-sources') {
        const body = await readJson(request);
        await requireRooftop(body.rooftopId, 'manager');
        return sendJson(response, 201, await service.createInventorySource(body));
      }

      if (request.method === 'GET' && pathname === '/api/inventory-sources') {
        if (searchParams.get('rooftopId')) await requireRooftop(searchParams.get('rooftopId'));
        return sendJson(
          response,
          200,
          await service.listInventorySources({ rooftopId: searchParams.get('rooftopId') })
        );
      }

      if (request.method === 'POST' && pathname === '/api/ingest') {
        const body = await readJson(request);
        await requireRooftop(body.rooftopId, 'manager');
        return sendJson(response, 200, await service.ingestInventory(body));
      }

      if (request.method === 'GET' && pathname === '/api/vehicles') {
        if (searchParams.get('rooftopId')) await requireRooftop(searchParams.get('rooftopId'));
        return sendJson(response, 200, await service.listVehicles({ rooftopId: searchParams.get('rooftopId') }));
      }

      const vehicleMatch = matchPath(pathname, '/api/vehicles/:vehicleId');
      if (request.method === 'GET' && vehicleMatch) {
        const vehicle = await service.getVehicle(vehicleMatch.vehicleId);
        await requireRooftop(vehicle.rooftopId);
        return sendJson(response, 200, vehicle);
      }

      const vehicleDraftMatch = matchPath(pathname, '/api/vehicles/:vehicleId/draft');
      if (request.method === 'POST' && vehicleDraftMatch) {
        const vehicle = await service.getVehicle(vehicleDraftMatch.vehicleId);
        await requireRooftop(vehicle.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.generateListingDraft(vehicleDraftMatch.vehicleId, await readJson(request))
        );
      }

      const rooftopHealthMatch = matchPath(pathname, '/api/rooftops/:rooftopId/health');
      if (request.method === 'GET' && rooftopHealthMatch) {
        await requireRooftop(rooftopHealthMatch.rooftopId);
        return sendJson(response, 200, await service.getRooftopHealth(rooftopHealthMatch.rooftopId));
      }

      const rooftopMatch = matchPath(pathname, '/api/rooftops/:rooftopId');
      if (request.method === 'GET' && rooftopMatch) {
        await requireRooftop(rooftopMatch.rooftopId);
        return sendJson(response, 200, await service.getRooftop(rooftopMatch.rooftopId));
      }

      const rooftopDashboardMatch = matchPath(pathname, '/api/rooftops/:rooftopId/dashboard');
      if (request.method === 'GET' && rooftopDashboardMatch) {
        await requireRooftop(rooftopDashboardMatch.rooftopId);
        return sendJson(response, 200, await service.getRooftopDashboard(rooftopDashboardMatch.rooftopId));
      }

      const staleVehicleMatch = matchPath(pathname, '/api/rooftops/:rooftopId/stale-vehicles');
      if (request.method === 'GET' && staleVehicleMatch) {
        await requireRooftop(staleVehicleMatch.rooftopId);
        return sendJson(response, 200, await service.listStaleVehicles(staleVehicleMatch.rooftopId));
      }

      const rooftopPostingRebuildMatch = matchPath(pathname, '/api/rooftops/:rooftopId/posting-jobs/rebuild');
      if (request.method === 'POST' && rooftopPostingRebuildMatch) {
        const body = await readJson(request);
        await requireRooftop(rooftopPostingRebuildMatch.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.rebuildPostingQueue(rooftopPostingRebuildMatch.rooftopId, {
            actor: body.actor ?? 'dealer-app'
          })
        );
      }

      if (request.method === 'GET' && pathname === '/api/listings') {
        if (searchParams.get('rooftopId')) await requireRooftop(searchParams.get('rooftopId'));
        return sendJson(response, 200, await service.listListings({ rooftopId: searchParams.get('rooftopId') }));
      }

      const listingMatch = matchPath(pathname, '/api/listings/:listingId');
      if (request.method === 'GET' && listingMatch) {
        const listing = await service.getListing(listingMatch.listingId);
        await requireRooftop(listing.rooftopId);
        return sendJson(response, 200, listing);
      }

      const listingTransitionMatch = matchPath(pathname, '/api/listings/:listingId/transitions');
      if (request.method === 'POST' && listingTransitionMatch) {
        const body = await readJson(request);
        const listing = await service.getListing(listingTransitionMatch.listingId);
        await requireRooftop(listing.rooftopId, 'manager');
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

      const listingDraftMatch = matchPath(pathname, '/api/listings/:listingId/draft');
      if (request.method === 'PATCH' && listingDraftMatch) {
        const listing = await service.getListing(listingDraftMatch.listingId);
        const actor = await getActor();
        await requireRooftop(listing.rooftopId, 'manager');
        return sendJson(response, 200, await service.updateListingDraft(listing.id, await readJson(request), { actor: actor.id }));
      }

      const listingActivityMatch = matchPath(pathname, '/api/listings/:listingId/activities');
      if (request.method === 'POST' && listingActivityMatch) {
        const listing = await service.getListing(listingActivityMatch.listingId);
        const actor = await getActor();
        await requireRooftop(listing.rooftopId);
        const body = await readJson(request);
        return sendJson(response, 201, await service.recordListingActivity(listing.id, body.type, body.metadata, { actor: actor.id }));
      }

      if (request.method === 'GET' && pathname === '/api/posting-jobs') {
        const rooftopId = searchParams.get('rooftopId');
        if (rooftopId) await requireRooftop(rooftopId);
        return sendJson(
          response,
          200,
          await service.listPostingJobs({
            rooftopId,
            status: searchParams.get('status'),
            active: searchParams.get('active') === 'true' ? true : undefined
          })
        );
      }

      if (request.method === 'POST' && pathname === '/api/posting-jobs/claim-next') {
        const body = await readJson(request);
        if (body.rooftopId) await requireRooftop(body.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.claimNextPostingJob({
            rooftopId: body.rooftopId ?? null,
            actor: body.actor ?? 'chrome_extension'
          })
        );
      }

      const postingJobClaimMatch = matchPath(pathname, '/api/posting-jobs/:jobId/claim');
      if (request.method === 'POST' && postingJobClaimMatch) {
        const body = await readJson(request);
        const job = await service.getPostingJob(postingJobClaimMatch.jobId);
        await requireRooftop(job.rooftopId, 'manager');
        return sendJson(response, 200, await service.claimPostingJob(job.id, { actor: body.actor ?? 'chrome_extension' }));
      }

      const postingJobCompleteMatch = matchPath(pathname, '/api/posting-jobs/:jobId/complete');
      if (request.method === 'POST' && postingJobCompleteMatch) {
        const body = await readJson(request);
        const job = await service.getPostingJob(postingJobCompleteMatch.jobId);
        await requireRooftop(job.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.completePostingJob(job.id, body, { actor: body.actor ?? 'chrome_extension' })
        );
      }

      const postingJobFailMatch = matchPath(pathname, '/api/posting-jobs/:jobId/fail');
      if (request.method === 'POST' && postingJobFailMatch) {
        const body = await readJson(request);
        const job = await service.getPostingJob(postingJobFailMatch.jobId);
        await requireRooftop(job.rooftopId, 'manager');
        return sendJson(response, 200, await service.failPostingJob(job.id, body, { actor: body.actor ?? 'chrome_extension' }));
      }

      const postingJobSnoozeMatch = matchPath(pathname, '/api/posting-jobs/:jobId/snooze');
      if (request.method === 'POST' && postingJobSnoozeMatch) {
        const body = await readJson(request);
        const job = await service.getPostingJob(postingJobSnoozeMatch.jobId);
        await requireRooftop(job.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.snoozePostingJob(job.id, {
            minutes: body.minutes,
            actor: body.actor ?? 'dealer-app'
          })
        );
      }

      if (request.method === 'GET' && pathname === '/api/leads') {
        if (searchParams.get('rooftopId')) await requireRooftop(searchParams.get('rooftopId'));
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
        if (searchParams.get('rooftopId')) await requireRooftop(searchParams.get('rooftopId'));
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
        const body = await readJson(request);
        await requireRooftop(body.rooftopId, 'manager');
        return sendJson(response, 201, await service.createLead(body));
      }

      const dealerMatch = matchPath(pathname, '/api/dealers/:dealerId');
      if (request.method === 'GET' && dealerMatch) {
        await requireDealer(dealerMatch.dealerId);
        return sendJson(response, 200, await service.getDealer(dealerMatch.dealerId));
      }

      const inventorySourceMatch = matchPath(pathname, '/api/inventory-sources/:inventorySourceId');
      if (request.method === 'GET' && inventorySourceMatch) {
        const source = await service.getInventorySource(inventorySourceMatch.inventorySourceId);
        await requireRooftop(source.rooftopId);
        return sendJson(response, 200, source);
      }

      const inventorySourceSyncMatch = matchPath(pathname, '/api/inventory-sources/:inventorySourceId/sync');
      if (request.method === 'POST' && inventorySourceSyncMatch) {
        const source = await service.getInventorySource(inventorySourceSyncMatch.inventorySourceId);
        await requireRooftop(source.rooftopId, 'manager');
        return sendJson(response, 200, await service.syncInventorySource(source.id));
      }

      const inventorySourceCsvMatch = matchPath(pathname, '/api/inventory-sources/:inventorySourceId/csv');
      if (request.method === 'POST' && inventorySourceCsvMatch) {
        const source = await service.getInventorySource(inventorySourceCsvMatch.inventorySourceId);
        await requireRooftop(source.rooftopId, 'manager');
        const body = await readJson(request);
        return sendJson(
          response,
          200,
          await service.uploadCsvInventorySource(source.id, body.csvText, { fileName: body.fileName })
        );
      }

      const syncRunMatch = matchPath(pathname, '/api/sync-runs/:syncRunId');
      if (request.method === 'GET' && syncRunMatch) {
        const syncRun = await service.getSyncRun(syncRunMatch.syncRunId);
        await requireRooftop(syncRun.rooftopId);
        return sendJson(response, 200, syncRun);
      }

      const leadMatch = matchPath(pathname, '/api/leads/:leadId');
      if (request.method === 'GET' && leadMatch) {
        const lead = await service.getLead(leadMatch.leadId);
        await requireRooftop(lead.rooftopId);
        return sendJson(response, 200, lead);
      }

      const leadDeliveryMatch = matchPath(pathname, '/api/leads/:leadId/notification-deliveries');
      if (request.method === 'GET' && leadDeliveryMatch) {
        const lead = await service.getLead(leadDeliveryMatch.leadId);
        await requireRooftop(lead.rooftopId);
        return sendJson(response, 200, await service.listNotificationDeliveries({ leadId: lead.id }));
      }

      const leadRetryMatch = matchPath(pathname, '/api/leads/:leadId/notifications/retry');
      if (request.method === 'POST' && leadRetryMatch) {
        const lead = await service.getLead(leadRetryMatch.leadId);
        await requireRooftop(lead.rooftopId, 'manager');
        return sendJson(response, 200, await service.retryFailedLeadNotifications(lead.id));
      }

      const leadEventMatch = matchPath(pathname, '/api/leads/:leadId/events');
      if (request.method === 'POST' && leadEventMatch) {
        const actor = await getActor();
        const lead = await service.getLead(leadEventMatch.leadId);
        await requireRooftop(lead.rooftopId);
        const body = await readJson(request);
        return sendJson(
          response,
          201,
          await service.recordLeadEvent(lead.id, body.type, { ...(body.metadata ?? {}), actor: actor.id })
        );
      }

      const leadAssignMatch = matchPath(pathname, '/api/leads/:leadId/assign');
      if (request.method === 'PATCH' && leadAssignMatch) {
        const body = await readJson(request);
        const lead = await service.getLead(leadAssignMatch.leadId);
        await requireRooftop(lead.rooftopId, 'manager');
        return sendJson(
          response,
          200,
          await service.assignLead(leadAssignMatch.leadId, body.assignedRepId, body.actor)
        );
      }

      const leadStatusMatch = matchPath(pathname, '/api/leads/:leadId/status');
      if (request.method === 'PATCH' && leadStatusMatch) {
        const body = await readJson(request);
        const lead = await service.getLead(leadStatusMatch.leadId);
        await requireRooftop(lead.rooftopId);
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
