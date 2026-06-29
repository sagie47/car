import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './env.js';

function createClient(url) {
  const schema = new URL(url).searchParams.get('schema') ?? 'public';
  const adapter = new PrismaPg({
    connectionString: url
  }, { schema });

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
