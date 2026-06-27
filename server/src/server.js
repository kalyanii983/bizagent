import { createApp } from './app.js';
import { connectDatabase } from './db/connect.js';
import { env } from './config/env.js';
import http from 'node:http';
import { attachSocket } from './socket.js';
import { initQueue } from './services/queue.js';

const app = createApp();
const server = http.createServer(app);

const db = await connectDatabase();
if (!db) {
  console.log('Seeding in-memory store for fallback mode...');
  await import('./seed.js');
}
await initQueue();
attachSocket(server);

let currentPort = env.port;

function startServer(port) {
  currentPort = port;
  server.listen(port, () => {
    console.log(`NxtBiz server listening on port ${port}`);
  });
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    const fallbackPort = currentPort + 1;
    console.warn(`Port ${currentPort} is in use; retrying on ${fallbackPort}.`);
    startServer(fallbackPort);
    return;
  }
  throw error;
});

startServer(env.port);

