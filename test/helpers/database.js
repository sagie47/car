import { createPrismaClient } from '../../src/lib/prisma.js';
import { resolveDatabaseUrl } from '../../src/lib/env.js';
import { PrismaStore } from '../../src/store/prisma-store.js';
import { LotPilotService } from '../../src/service/lotpilot-service.js';

export function createPrismaTestClient() {
  return createPrismaClient({
    url: resolveDatabaseUrl({ forTest: true })
  });
}

export async function resetDatabase(client) {
  await client.$executeRawUnsafe(`
    TRUNCATE TABLE
      "LeadEvent",
      "Lead",
      "ListingEvent",
      "Listing",
      "VehicleSnapshot",
      "InventorySyncRun",
      "Vehicle",
      "Rooftop",
      "Dealer"
    CASCADE;
  `);
}

export function createPrismaService(client) {
  return new LotPilotService({
    store: new PrismaStore({ client })
  });
}

export async function seedDealerContext(service) {
  const dealer = await service.createDealer({ name: 'Northside Auto' });
  const rooftop = await service.createRooftop({
    dealerId: dealer.id,
    name: 'Northside Main',
    rules: {
      minimumPhotos: 5,
      staleThresholdDays: 45
    }
  });

  return { dealer, rooftop };
}

export function buildVehicle(overrides = {}) {
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
