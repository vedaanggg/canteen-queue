import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { menuRouter } from './routes/menu.js';
import { statusRouter } from './routes/status.js';
import { config } from './config/env.js';

export function createApp() {
  if (!config.clientOrigin) throw new Error('CLIENT_ORIGIN must be set in the environment.');

  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api', menuRouter);
  app.use('/api', statusRouter);
  return app;
}
