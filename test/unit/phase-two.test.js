import test from 'node:test';
import assert from 'node:assert/strict';
import { LotPilotService } from '../../src/service/lotpilot-service.js';
import { InMemoryStore } from '../../src/store/in-memory-store.js';

function vehicle(overrides = {}) {
  return {
    vin: '2HGFC2F59KH000001',
    stockNumber: 'L200',
    year: 2019,
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    mileage: 61000,
    price: 18995,
    photoUrls: [
      'https://dealer.example/civic-1.jpg',
      'https://dealer.example/civic-2.jpg',
      'https://dealer.example/civic-3.jpg',
      'https://dealer.example/civic-4.jpg',
      'https://dealer.example/civic-5.jpg'
    ],
    status: 'in_stock',
    ...overrides
  };
}

async function context(options = {}) {
  const service = new LotPilotService({ store: new InMemoryStore(), ...options });
  const dealer = await service.createDealer({ name: 'Beta Auto' });
  const rooftop = await service.createRooftop({ dealerId: dealer.id, name: 'Beta Main' });
  await service.ingestInventory({ rooftopId: rooftop.id, vehicles: [vehicle()] });
  const [storedVehicle] = await service.listVehicles({ rooftopId: rooftop.id });
  return { service, dealer, rooftop, vehicle: storedVehicle };
}

test('closed business-hours recipients only send fallback lead alerts', async () => {
  const calls = [];
  const { service, rooftop, vehicle: storedVehicle } = await context({
    notificationAdapter: {
      async send(message) {
        calls.push(message);
        return { providerId: `provider_${calls.length}` };
      }
    }
  });
  await service.createNotificationRecipient({
    rooftopId: rooftop.id,
    channel: 'email',
    destination: 'primary@example.com',
    rules: { sendWindow: 'business_hours', businessHours: { days: [], start: '09:00', end: '17:00' }, fallback: false }
  });
  await service.createNotificationRecipient({
    rooftopId: rooftop.id,
    channel: 'sms',
    destination: '+12505550100',
    rules: { sendWindow: 'business_hours', businessHours: { days: [], start: '09:00', end: '17:00' }, fallback: true }
  });

  const lead = await service.createLead({
    rooftopId: rooftop.id,
    vehicleId: storedVehicle.id,
    sourceChannel: 'facebook',
    sourceMessage: 'Is this still available?'
  });
  const deliveries = await service.listNotificationDeliveries({ leadId: lead.id });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].channel, 'sms');
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].status, 'sent');
});

test('failed lead alerts can be retried and update attempts in place', async () => {
  let attempt = 0;
  const { service, rooftop, vehicle: storedVehicle } = await context({
    notificationAdapter: {
      async send() {
        attempt += 1;
        if (attempt === 1) throw new Error('Provider unavailable');
        return { providerId: 'provider_retry' };
      }
    }
  });
  await service.createNotificationRecipient({ rooftopId: rooftop.id, channel: 'email', destination: 'manager@example.com' });
  const lead = await service.createLead({
    rooftopId: rooftop.id,
    vehicleId: storedVehicle.id,
    sourceChannel: 'manual'
  });

  let [delivery] = await service.listNotificationDeliveries({ leadId: lead.id });
  assert.equal(delivery.status, 'failed');
  assert.equal(delivery.attempts, 1);

  [delivery] = await service.retryFailedLeadNotifications(lead.id);
  assert.equal(delivery.status, 'sent');
  assert.equal(delivery.attempts, 2);
  assert.equal(delivery.providerId, 'provider_retry');
});

test('reply template copies are recorded as lead timeline events', async () => {
  const { service, rooftop, vehicle: storedVehicle } = await context();
  const lead = await service.createLead({
    rooftopId: rooftop.id,
    vehicleId: storedVehicle.id,
    sourceChannel: 'manual'
  });

  const updated = await service.recordLeadEvent(lead.id, 'reply_template_copied', {
    actor: 'dealer-app',
    templateKey: 'availability'
  });

  assert.equal(updated.events.at(-1).type, 'reply_template_copied');
  assert.equal(updated.events.at(-1).metadata.templateKey, 'availability');
});
