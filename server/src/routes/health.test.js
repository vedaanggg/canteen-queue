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
});
