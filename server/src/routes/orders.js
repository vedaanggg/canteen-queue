import { Router } from 'express';
import { createOrderService, OrderError } from '../services/orderService.js';

export const ordersRouter = Router();
const service = createOrderService();
const eventSummary = ({ id, status, tokenNumber, serviceDay }) => ({ id, status, tokenNumber, serviceDay });
function handleError(error, response) {
  if (error instanceof OrderError) return response.status(error.status).json({ error: error.message, code: error.code });
  console.error(error); return response.status(500).json({ error: 'Unable to process the order right now.', code: 'INTERNAL_ERROR' });
}
ordersRouter.post('/orders', (request, response) => {
  try {
    const result = service.createOrder(request.body);
    if (!result.duplicate) request.app.locals.io?.emit('order:created', eventSummary(result.order));
    response.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) { handleError(error, response); }
});
ordersRouter.get('/orders/:id', (request, response) => {
  try { response.json({ order: service.getOrder(request.params.id) }); }
  catch (error) { handleError(error, response); }
});
ordersRouter.post('/orders/:id/cancel', (request, response) => {
  try {
    const order = service.cancelOrder(request.params.id);
    request.app.locals.io?.emit('order:cancelled', eventSummary(order));
    response.json({ order });
  } catch (error) { handleError(error, response); }
});
