import { Router } from 'express';
import { db } from '../db/database.js';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  db.exec('SELECT 1');
  response.json({ status: 'ok', service: 'salon-api' });
});
