import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './env.js';

function createClient(url) {
  const adapter = new PrismaPg({
    connectionString: url
  });

  return new PrismaClient({
    adapter
  });
}

export function createPrismaClient({ url } = {}) {
  return createClient(url ?? resolveDatabaseUrl());
}

let defaultClient;

export function getPrismaClient() {
  if (!defaultClient) {
    defaultClient = createPrismaClient();
  }

  return defaultClient;
}
