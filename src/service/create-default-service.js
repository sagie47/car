import { getPrismaClient } from '../lib/prisma.js';
import { PrismaStore } from '../store/prisma-store.js';
import { LotPilotService } from './lotpilot-service.js';

export function createDefaultService() {
  return new LotPilotService({
    store: new PrismaStore({
      client: getPrismaClient()
    })
  });
}
