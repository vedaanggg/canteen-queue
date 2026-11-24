import { Router } from 'express';
import { getOnlineJoiningEnabled } from '../db/database.js';
import { CatalogError } from '../services/salonCatalogService.js';
import { createQueueRulesService } from '../services/queueRulesService.js';
import { createQueueService } from '../services/queueService.js';
import { staffAuth } from '../services/staffAuthService.js';

export const receptionRouter = Router();
const rules = createQueueRulesService({ joiningEnabled: getOnlineJoiningEnabled });
const queue = createQueueService({ rules });

function sendError(error, response) {
  if (error instanceof CatalogError) return response.status(error.status).json({ error: error.message, code: error.code });
  console.error(error);
  return response.status(500).json({ error: 'Unable to complete the reception action.', code: 'INTERNAL_ERROR' });
}

receptionRouter.post('/staff/login', (request, response) => {
  const result = staffAuth.login(request.body?.pin);
  if (result.error) return response.status(result.error.status).json({ error: result.error.message, code: result.error.code });
  return response.json({ token: result.token });
});

receptionRouter.post('/staff/logout', staffAuth.requireStaff, (request, response) => {
  staffAuth.logout(request.staffToken);
  return response.json({ loggedOut: true });
});

receptionRouter.get('/reception', staffAuth.requireStaff, (_request, response) => {
  try { return response.json(rules.getReceptionData()); }
  catch (error) { return sendError(error, response); }
});

receptionRouter.post('/reception/walk-in', staffAuth.requireStaff, (request, response) => {
  try {
    const result = queue.createSpot(request.body, (event, payload) => request.app.locals.io?.emit(event, payload), { walkIn: true });
    return response.status(result.existing ? 200 : 201).json(result);
  } catch (error) { return sendError(error, response); }
});

receptionRouter.post('/reception/call-next', staffAuth.requireStaff, (request, response) => {
  try {
    const spot = rules.callNext(request.body?.barberId);
    const payload = { action: 'status', id: spot.id, token: spot.token, status: spot.status };
    request.app.locals.io?.emit('queue:updated', payload);
    return response.json({ spot });
  } catch (error) { return sendError(error, response); }
});

receptionRouter.post('/reception/:id/cancel', staffAuth.requireStaff, (request, response) => {
  try {
    const spot = rules.cancelWaiting(request.params.id);
    request.app.locals.io?.emit('queue:updated', { action: 'cancelled', id: spot.id, token: spot.token, status: spot.status });
    return response.json({ spot });
  } catch (error) { return sendError(error, response); }
});

receptionRouter.post('/reception/:id/no-show', staffAuth.requireStaff, (request, response) => {
  try {
    const spot = rules.markNoShow(request.params.id);
    request.app.locals.io?.emit('queue:updated', { action: 'status', id: spot.id, token: spot.token, status: spot.status });
    return response.json({ spot });
  } catch (error) { return sendError(error, response); }
});
