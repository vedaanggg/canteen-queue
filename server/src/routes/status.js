import { Router } from 'express';
import { getOrderingStatus } from '../services/statusService.js';

export const statusRouter = Router();

statusRouter.get('/status', (_request, response) => {
  response.json(getOrderingStatus());
});
