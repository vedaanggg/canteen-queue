import express from 'express';
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdminRouter } from './admin.js';
import { createStaffAuthService } from '../services/staffAuthService.js';

const service = {
  getSettings: () => ({}), saveService: () => ({}), setServiceEnabled: () => ({}),
  setBarberDuty: () => ({}), setQueueOpen: () => ({}), moveToAny: () => ({}),
};
const app = express(); app.use(express.json()); app.use('/api', createAdminRouter({ service, auth: createStaffAuthService({ staffPin: '1234' }) }));
const server = http.createServer(app);
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

describe('owner settings route authentication', () => {
  it.each([
    ['GET', '/api/admin'], ['POST', '/api/admin/services'], ['PATCH', '/api/admin/services/1'],
    ['PATCH', '/api/admin/services/1/state'], ['PATCH', '/api/admin/barbers/1/duty'],
    ['PATCH', '/api/admin/queue'], ['POST', '/api/admin/queue/1/move-to-any'],
  ])('rejects %s %s without a staff token', async (method, path) => {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'STAFF_AUTH_REQUIRED' });
  });
});
