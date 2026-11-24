import { Router } from 'express';
import { getOnlineJoiningEnabled } from '../db/database.js';
import { createSalonCatalogService, CatalogError } from '../services/salonCatalogService.js';
import { createQueueRulesService } from '../services/queueRulesService.js';

export const salonRouter = Router();
const catalog = createSalonCatalogService();
const queueRules = createQueueRulesService({ joiningEnabled: getOnlineJoiningEnabled });

function sendError(error, response) {
  if (error instanceof CatalogError) return response.status(error.status).json({ error: error.message, code: error.code });
  console.error(error);
  return response.status(500).json({ error: 'Unable to load salon information right now.', code: 'INTERNAL_ERROR' });
}

salonRouter.get('/services', (_request, response) => {
  try { response.json({ services: catalog.getServices() }); }
  catch (error) { sendError(error, response); }
});

salonRouter.get('/barbers', (_request, response) => {
  try { response.json({ barbers: catalog.getBarbers() }); }
  catch (error) { sendError(error, response); }
});

salonRouter.get('/status', (_request, response) => {
  try { response.json(queueRules.getStatus()); }
  catch (error) { sendError(error, response); }
});

salonRouter.get('/queue/estimate', (request, response) => {
  try {
    const serviceIds = typeof request.query.serviceIds === 'string' ? request.query.serviceIds.split(',') : [];
    response.json(queueRules.estimate(serviceIds, request.query.barber));
  } catch (error) { sendError(error, response); }
});
