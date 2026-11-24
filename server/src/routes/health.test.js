import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { db, initializeDatabase } from '../db/database.js';

let server;
let baseUrl;

beforeAll(async () => {
  await initializeDatabase();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  db?.close();
});

describe('salon API scaffold', () => {
  it('serves the SQLite-backed health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'salon-api' });
  });

  it('returns 404 for unplanned API routes', async () => {
    const response = await fetch(`${baseUrl}/api/unplanned`);
    expect(response.status).toBe(404);
  });

  it('protects every reception endpoint and staff logout without a bearer token', async () => {
    const requests = [
      fetch(`${baseUrl}/api/reception`),
      fetch(`${baseUrl}/api/reception/walk-in`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      fetch(`${baseUrl}/api/reception/call-next`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      fetch(`${baseUrl}/api/reception/1/cancel`, { method: 'POST' }),
      fetch(`${baseUrl}/api/reception/1/no-show`, { method: 'POST' }),
      fetch(`${baseUrl}/api/staff/logout`, { method: 'POST' }),
    ];
    const responses = await Promise.all(requests);
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it('serves six bilingual services and only the on-duty barber roster', async () => {
    const servicesResponse = await fetch(`${baseUrl}/api/services`);
    const services = await servicesResponse.json();
    expect(services.services).toHaveLength(6);
    expect(services.services[0]).toMatchObject({ nameEn: 'Haircut', nameGu: 'વાળ કપાવવું', durationMinutes: 30, price: 150 });

    const barbersResponse = await fetch(`${baseUrl}/api/barbers`);
    const barbers = await barbersResponse.json();
    expect(barbers.barbers).toHaveLength(3);
    expect(barbers.barbers.find((barber) => barber.name === 'Imran')).toMatchObject({ status: 'on_break' });
  });

  it('returns salon opening and empty queue estimate data', async () => {
    const status = await (await fetch(`${baseUrl}/api/status`)).json();
    expect(status).toMatchObject({ openingTime: '10:00', closingTime: '21:00', timezone: 'Asia/Kolkata' });
    expect(status).toHaveProperty('onlineJoiningOpen');

    const estimate = await (await fetch(`${baseUrl}/api/queue/estimate?serviceIds=1,2&barber=any`)).json();
    expect(estimate).toMatchObject({ totalMinutes: 45, totalPrice: 230, waitingCount: 0, expectedWaitMinutes: 0 });
  });
});
