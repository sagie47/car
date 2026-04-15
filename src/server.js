import { pathToFileURL } from 'node:url';
import { createHttpServer } from './create-server.js';

const port = Number(process.env.PORT ?? 3000);
const server = createHttpServer();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, () => {
    console.log(`LotPilot server listening on http://localhost:${port}`);
  });
}
