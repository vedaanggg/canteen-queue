import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { db, initializeDatabase, persistDatabase } from './db/database.js';

await initializeDatabase();
const app = createApp();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.emit('connection:ready', { connected: true });
});

httpServer.listen(config.port, () => {
  console.log(`Canteen Queue API listening on port ${config.port}`);
});

function shutdown() {
  io.close(() => {
    persistDatabase();
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
