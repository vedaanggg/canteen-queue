import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { salonRouter } from './routes/salon.js';
import { config } from './config/env.js';
import { receptionRouter } from './routes/reception.js';
import { barberRouter } from './routes/barber.js';

export function createApp() {
  if (!config.clientOrigin) throw new Error('CLIENT_ORIGIN must be set in the environment.');

  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api', salonRouter);
  app.use('/api', receptionRouter);
  app.use('/api', barberRouter);
  app.use('/api', (_request, response) => response.status(404).json({ error: 'API endpoint not found.' }));
  return app;
}
