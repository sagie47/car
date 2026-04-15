import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from '../src/lib/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaCliPath = path.resolve(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');

const result = spawnSync(process.execPath, [prismaCliPath, 'db', 'push'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: resolveDatabaseUrl({ forTest: true })
  }
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
