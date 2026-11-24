import { Router } from 'express';
import { CatalogError } from '../services/salonCatalogService.js';
import { createSalonAdminService } from '../services/salonAdminService.js';
import { staffAuth } from '../services/staffAuthService.js';

export function createAdminRouter({ service = createSalonAdminService(), auth = staffAuth } = {}) {
  const router = Router();
  const sendError = (error, response) => {
    if (error instanceof CatalogError) return response.status(error.status).json({ error: error.message, code: error.code });
    console.error(error);
    return response.status(500).json({ error: 'Unable to update salon settings right now.', code: 'INTERNAL_ERROR' });
  };
  const emitSettings = (request, setting, extra = {}) => {
    const payload = { action: setting, ...extra };
    request.app.locals.io?.emit('salon:updated', payload);
    request.app.locals.io?.emit('queue:updated', { action: 'settings', setting, ...extra });
  };

  router.get('/admin', auth.requireStaff, (_request, response) => {
    try { return response.json(service.getSettings()); } catch (error) { return sendError(error, response); }
  });
  router.post('/admin/services', auth.requireStaff, (request, response) => {
    try { const item = service.saveService(request.body); emitSettings(request, 'service-created', { serviceId: item.id }); return response.status(201).json({ service: item }); }
    catch (error) { return sendError(error, response); }
  });
  router.patch('/admin/services/:id/state', auth.requireStaff, (request, response) => {
    try { const item = service.setServiceEnabled(request.params.id, request.body?.isOn); emitSettings(request, 'service-state', { serviceId: item.id }); return response.json({ service: item }); }
    catch (error) { return sendError(error, response); }
  });
  router.patch('/admin/services/:id', auth.requireStaff, (request, response) => {
    try { const item = service.saveService(request.body, request.params.id); emitSettings(request, 'service-updated', { serviceId: item.id }); return response.json({ service: item }); }
    catch (error) { return sendError(error, response); }
  });
  router.patch('/admin/barbers/:id/duty', auth.requireStaff, (request, response) => {
    try { const barber = service.setBarberDuty(request.params.id, request.body?.onDuty); emitSettings(request, 'barber-duty', { barberId: barber.id, barberName: barber.name }); return response.json({ barber }); }
    catch (error) { return sendError(error, response); }
  });
  router.patch('/admin/queue', auth.requireStaff, (request, response) => {
    try { const result = service.setQueueOpen(request.body?.open); emitSettings(request, 'queue', { queueOpen: result.queueOpen }); return response.json(result); }
    catch (error) { return sendError(error, response); }
  });
  router.post('/admin/queue/:id/move-to-any', auth.requireStaff, (request, response) => {
    try { const spot = service.moveToAny(request.params.id); emitSettings(request, 'move-to-any', { id: spot.id, token: spot.token, status: spot.status }); return response.json({ spot }); }
    catch (error) { return sendError(error, response); }
  });
  return router;
}

export const adminRouter = createAdminRouter();
