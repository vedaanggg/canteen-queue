import { Router } from 'express';
import { getMenu } from '../services/menuService.js';

export const menuRouter = Router();

menuRouter.get('/menu', (_request, response) => {
  response.json(getMenu());
});
