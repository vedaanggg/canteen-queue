import { Router } from 'express';
import { CatalogError } from '../services/salonCatalogService.js';
import { createQueueRulesService } from '../services/queueRulesService.js';
import { staffAuth } from '../services/staffAuthService.js';

export const barberRouter = Router();
const rules = createQueueRulesService();

function sendError(error, response) {
  if (error instanceof CatalogError) return response.status(error.status).json({ error: error.message, code: error.code });
  console.error(error);
  return response.status(500).json({ error: 'Unable to complete the barber action.', code: 'INTERNAL_ERROR' });
}

barberRouter.get('/barbers/:name/view', staffAuth.requireStaff, (request, response) => {
  try { return response.json(rules.getBarberView(request.params.name)); }
  catch (error) { return sendError(error, response); }
});

barberRouter.post('/queue/:id/start', staffAuth.requireStaff, (request, response) => {
  try {
    const spot = rules.startService(request.params.id, request.body?.barberId);
    request.app.locals.io?.emit('queue:updated', { action: 'status', id: spot.id, token: spot.token, status: spot.status });
    return response.json({ spot });
  } catch (error) { return sendError(error, response); }
});

barberRouter.post('/queue/:id/done', staffAuth.requireStaff, (request, response) => {
  try {
    const spot = rules.finishService(request.params.id, request.body?.barberId);
    request.app.locals.io?.emit('queue:updated', { action: 'status', id: spot.id, token: spot.token, status: spot.status });
    return response.json({ spot });
  } catch (error) { return sendError(error, response); }
});

barberRouter.post('/barbers/:id/break', staffAuth.requireStaff, (request, response) => {
  try {
    const barber = rules.setBarberBreak(request.params.id, request.body?.onBreak);
    request.app.locals.io?.emit('queue:updated', { action: 'barber', barberId: barber.id, barberName: barber.name, status: barber.status });
    return response.json({ barber });
  } catch (error) { return sendError(error, response); }
});
