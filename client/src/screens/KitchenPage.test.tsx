// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KitchenPage from './KitchenPage';
import type { Order } from '../lib/api';

vi.mock('../lib/socket', () => ({ socket: null }));

const makeOrder = (status: Order['status'], id: string = status) => ({
  id, requestId: `123e4567-e89b-42d3-a456-${id.padEnd(12, '0').slice(0, 12)}`, tokenNumber: 12,
  serviceDay: '2026-11-24', studentName: 'Aditi Sharma', rollNumber: 'CS24-018', status,
  total: 40, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  items: [{ menuItemId: 1, itemName: 'Samosa', unitPrice: 20, quantity: 2, lineTotal: 40 }],
  ordersAhead: 0, isPreviousDay: false, readOnly: false,
} satisfies Order);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ orders: [] }) }) as Response)); });

describe('Kitchen Board', () => {
  it('shows three status columns, counts, item quantities, and empty states', async () => {
    const orders = [makeOrder('Placed', 'placed-1'), makeOrder('Preparing', 'prep-1'), makeOrder('Ready', 'ready-1')];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ orders }) }) as Response));
    render(<KitchenPage />);
    expect(await screen.findAllByText('#12')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'NEW' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'PREPARING' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'READY' })).toBeTruthy();
    expect(screen.getAllByText('× 2')).toHaveLength(3);
    expect(screen.queryAllByText('No orders yet')).toHaveLength(0);
  });

  it('shows the empty state independently in all three columns', async () => {
    render(<KitchenPage />);
    expect(await screen.findAllByText('No orders yet')).toHaveLength(3);
  });

  it('advances an order and refreshes the board from the returned current state', async () => {
    const user = userEvent.setup(); let current = [makeOrder('Placed', 'placed-1')];
    let postedBody = '';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/api/orders/placed-1/status')) { postedBody = String(init?.body); current = [makeOrder('Preparing', 'placed-1')]; }
      return { ok: true, status: 200, json: async () => String(input).endsWith('/api/kitchen') ? { orders: current } : { order: current[0] } } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<KitchenPage />);
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('button', { name: 'Ready' })).toBeTruthy();
    expect(JSON.parse(postedBody)).toEqual({ status: 'Preparing' });
  });

  it('shows a rejected transition error and reloads the board', async () => {
    const user = userEvent.setup(); const order = makeOrder('Placed', 'placed-1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/status')
      ? { ok: false, status: 409, json: async () => ({ error: 'This order changed in another window.', code: 'STATUS_CONFLICT' }) } as Response
      : { ok: true, status: 200, json: async () => ({ orders: [order] }) } as Response);
    vi.stubGlobal('fetch', fetchMock);
    render(<KitchenPage />);
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect((await screen.findByRole('alert')).textContent).toContain('This order changed in another window.');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/kitchen')).length).toBeGreaterThanOrEqual(2);
  });
});
