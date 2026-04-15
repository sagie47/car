import { spawnSync } from 'node:child_process';

const pushResult = spawnSync(process.execPath, ['scripts/prisma-push-test.mjs'], {
  stdio: 'inherit',
  env: process.env
});

if (pushResult.status !== 0) {
  process.exit(pushResult.status ?? 1);
}

const testResult = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'test/integration/*.test.js'], {
  stdio: 'inherit',
  env: process.env
});

process.exit(testResult.status ?? 1);
