const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/lotpilot?schema=public';
const LOCAL_TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/lotpilot?schema=test';

export function resolveDatabaseUrl({ forTest = false } = {}) {
  if (forTest) {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || LOCAL_TEST_DATABASE_URL;
  }

  return process.env.DATABASE_URL || LOCAL_DATABASE_URL;
}
