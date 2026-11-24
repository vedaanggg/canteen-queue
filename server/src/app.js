import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { config } from './config/env.js';

export function createApp() {
  if (!config.clientOrigin) throw new Error('CLIENT_ORIGIN must be set in the environment.');

  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());
  app.use('/api', healthRouter);
  return app;
}
