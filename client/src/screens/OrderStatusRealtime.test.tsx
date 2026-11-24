// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderStatusPage from './OrderStatusPage';

const { socketMock } = vi.hoisted(() => ({ socketMock: { connected: true, on: vi.fn(), off: vi.fn() } }));
vi.mock('../lib/socket', () => ({ socket: socketMock }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); socketMock.on.mockClear(); socketMock.off.mockClear(); });

it('refetches Preparing, Ready, and Collected changes from Socket.IO', async () => {
  let status: 'Placed' | 'Preparing' | 'Ready' | 'Collected' = 'Placed';
  const order = () => ({ order: { id: 'order-5', requestId: 'request-5', tokenNumber: 5, serviceDay: '2026-11-24', studentName: 'Aditi Sharma', rollNumber: 'CS24-018', status, total: 20, createdAt: '2026-11-24T05:00:00.000Z', updatedAt: '2026-11-24T05:00:00.000Z', items: [{ menuItemId: 1, itemName: 'Samosa', unitPrice: 20, quantity: 1, lineTotal: 20 }], ordersAhead: 0, isPreviousDay: false, readOnly: false } });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => order() }) as Response));
  const vibrate = vi.fn(); Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  render(<MemoryRouter initialEntries={['/order/order-5']}><Routes><Route path="/order/:id" element={<OrderStatusPage />} /></Routes></MemoryRouter>);
  expect((await screen.findAllByText('Placed')).length).toBeGreaterThan(0);
  await waitFor(() => expect(socketMock.on).toHaveBeenCalled());
  const listener = socketMock.on.mock.calls.find(([event]) => event === 'order:updated')?.[1] as ((event: { id: string }) => void) | undefined;
  expect(listener).toBeDefined();

  status = 'Preparing'; listener?.({ id: 'order-5' });
  expect((await screen.findAllByText('Preparing')).length).toBeGreaterThan(0);
  status = 'Ready'; listener?.({ id: 'order-5' });
  expect(await screen.findByText('Collect your order!')).toBeTruthy();
  await waitFor(() => expect(vibrate).toHaveBeenCalled());
  status = 'Collected'; listener?.({ id: 'order-5' });
  expect(await screen.findByText('Your order has been collected. Enjoy!')).toBeTruthy();
});
