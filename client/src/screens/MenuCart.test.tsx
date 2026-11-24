// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import type { MenuItem, OrderingStatus } from '../lib/api';

vi.mock('../lib/socket', () => ({ socket: null }));

const menuItems: MenuItem[] = [
  { id: 1, name: 'Samosa', category: 'Snacks', price: 20, description: 'Crisp potato pastry.', emoji: '🥟', isVegetarian: true, isAvailable: true },
  { id: 2, name: 'Masala Dosa', category: 'Meals', price: 70, description: 'Crisp dosa with potato masala.', emoji: '🥞', isVegetarian: true, isAvailable: true },
  { id: 3, name: 'Cold Coffee', category: 'Beverages', price: 50, description: 'Chilled coffee with milk.', emoji: '🥤', isVegetarian: true, isAvailable: true },
  { id: 4, name: 'Bottled Water', category: 'Beverages', price: 20, description: 'Chilled drinking water.', emoji: '💧', isVegetarian: true, isAvailable: false },
];

const openStatus: OrderingStatus = {
  isOpen: true, status: 'open', openingTime: '09:00', orderingCutoff: '16:45',
  canteenClosingTime: '17:00', currentTime: '12:00:00', timezone: 'Asia/Kolkata', override: null,
};

const closedStatus: OrderingStatus = { ...openStatus, isOpen: false, status: 'closed' };

function mockApi(status = openStatus) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.endsWith('/api/menu')
      ? { categories: ['Snacks', 'Meals', 'Beverages', 'Desserts'], items: menuItems }
      : url.endsWith('/api/status')
        ? status
        : url.endsWith('/api/orders')
          ? { order: { id: 'order-123', tokenNumber: 1, serviceDay: '2026-11-24', studentName: 'Aditi Sharma', rollNumber: 'CS24-018', status: 'Placed', total: 20, items: [{ menuItemId: 1, itemName: 'Samosa', unitPrice: 20, quantity: 1, lineTotal: 20 }], ordersAhead: 0, isPreviousDay: false, readOnly: false }, duplicate: false }
        : url.includes('/api/orders/')
          ? { order: { id: 'order-123', tokenNumber: 1, serviceDay: '2026-11-24', studentName: 'Aditi Sharma', rollNumber: 'CS24-018', status: 'Placed', total: 20, items: [{ menuItemId: 1, itemName: 'Samosa', unitPrice: 20, quantity: 1, lineTotal: 20 }], ordersAhead: 0, isPreviousDay: false, readOnly: false } }
        : { status: 'ok', service: 'canteen-queue-api' };
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path = '/') {
  window.history.replaceState({}, '', path);
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>);
}

function savedCart(quantity = 1) {
  localStorage.setItem('canteen-queue-cart-v1', JSON.stringify([{ item: menuItems[0], quantity }]));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

beforeEach(() => {
  mockApi();
});

describe('Menu and Cart screens', () => {
  it('combines category tabs and search and shows an empty result state', async () => {
    const user = userEvent.setup();
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Samosa' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Meals' }));
    expect(screen.getByRole('heading', { name: 'Masala Dosa' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Samosa' })).toBeNull();

    await user.type(screen.getByRole('searchbox', { name: 'Search menu' }), 'coffee');
    expect(screen.getByText('No items found')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByRole('heading', { name: 'Cold Coffee' })).toBeTruthy();
  });

  it('disables sold-out items and caps a menu item at ten', async () => {
    const user = userEvent.setup();
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Samosa' })).toBeTruthy();
    const samosaCard = screen.getByRole('heading', { name: 'Samosa' }).closest('article')!;
    const waterCard = screen.getByRole('heading', { name: 'Bottled Water' }).closest('article')!;
    expect(within(waterCard).getByRole('button', { name: 'Sold out' })).toHaveProperty('disabled', true);

    await user.click(within(samosaCard).getByRole('button', { name: '+ Add' }));
    for (let quantity = 1; quantity < 10; quantity += 1) {
      await user.click(within(samosaCard).getByRole('button', { name: 'Add one Samosa' }));
    }
    expect(within(samosaCard).getByText('10')).toBeTruthy();
    expect(within(samosaCard).getByRole('button', { name: 'Add one Samosa' })).toHaveProperty('disabled', true);
    expect(screen.getByText('10 items · ₹200')).toBeTruthy();
  });

  it('keeps cart items after a page reload and calculates editable line totals', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Samosa' })).toBeTruthy();
    const card = screen.getByRole('heading', { name: 'Samosa' }).closest('article')!;
    await user.click(within(card).getByRole('button', { name: '+ Add' }));
    await waitFor(() => expect(localStorage.getItem('canteen-queue-cart-v1')).toContain('Samosa'));

    cleanup();
    renderAt('/cart');
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeTruthy();
    expect(screen.getByText('₹20 each')).toBeTruthy();
    expect(screen.getByText('Subtotal · ₹20')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add one Samosa' }));
    const cartCard = screen.getByRole('heading', { name: 'Samosa' }).closest('article')!;
    expect(within(cartCard).getByText('₹40')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove Samosa' }));
    expect(screen.getByText('Your cart is empty')).toBeTruthy();
  });

  it('shows the empty-cart state and validates required student details', async () => {
    const user = userEvent.setup();
    renderAt('/cart');
    expect(await screen.findByText('Your cart is empty')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse the menu' })).toBeTruthy();

    cleanup();
    savedCart();
    renderAt('/cart');
    expect(await screen.findByRole('heading', { name: 'Your details' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    expect(screen.getByText('Please enter your name.')).toBeTruthy();
    expect(screen.getByText('Please enter your roll number.')).toBeTruthy();

    await user.type(screen.getByLabelText('Student name'), 'Aditi Sharma');
    await user.type(screen.getByLabelText('Roll number'), 'CS24-018');
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' });
    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    await waitFor(() => expect(localStorage.getItem('canteen-queue-last-order-id')).toBe('order-123'));
    expect(localStorage.getItem('canteen-queue-cart-v1')).toBe('[]');
    expect(await screen.findByText('Aditi Sharma')).toBeTruthy();
    expect(screen.getByText("You're next")).toBeTruthy();
  });

  it('keeps the cart quantity capped at ten', async () => {
    savedCart(10);
    renderAt('/cart');

    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeTruthy();
    expect(screen.getByText('10 items')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add one Samosa' })).toHaveProperty('disabled', true);
  });

  it('removes an item that became sold out after it was added', async () => {
    localStorage.setItem('canteen-queue-cart-v1', JSON.stringify([{
      item: { ...menuItems[3], isAvailable: true },
      quantity: 1,
    }]));
    renderAt('/cart');

    expect(await screen.findByText('Your cart is empty')).toBeTruthy();
    expect(screen.getByText(/Bottled Water is no longer available and was removed/)).toBeTruthy();
  });

  it('shows the closed banner and disables menu and cart order actions', async () => {
    mockApi(closedStatus);
    renderAt('/');

    expect(await screen.findByText('Ordering closed')).toBeTruthy();
    const samosaCard = screen.getByRole('heading', { name: 'Samosa' }).closest('article')!;
    expect(within(samosaCard).getByRole('button', { name: '+ Add' })).toHaveProperty('disabled', true);

    cleanup();
    savedCart();
    renderAt('/cart');
    expect(await screen.findByRole('button', { name: 'Place Order' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Ordering closed')).toBeTruthy();
  });

  it('shows previous-day orders read-only after loading the same order on refresh', async () => {
    const oldOrder = { id: 'old-123', tokenNumber: 7, serviceDay: '2026-11-23', studentName: 'Aditi Sharma', rollNumber: 'CS24-018', status: 'Preparing', total: 20, items: [{ menuItemId: 1, itemName: 'Samosa', unitPrice: 20, quantity: 1, lineTotal: 20 }], ordersAhead: null, isPreviousDay: true, readOnly: true };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({ ok: true, status: 200, json: async () => String(input).includes('/api/orders/') ? { order: oldOrder } : String(input).endsWith('/api/menu') ? { categories: [], items: menuItems } : openStatus } as Response));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/order/old-123');
    expect(await screen.findByText('This order is from a previous day.')).toBeTruthy();
    expect(screen.getByLabelText('Token 7')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
    expect(screen.queryByText(/Estimated wait/)).toBeNull();
    cleanup();
    renderAt('/order/old-123');
    expect(await screen.findByText('This order is from a previous day.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/orders/old-123'))).toBe(true);
  });

  it('displays a clear backend error when order placement fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/orders')) return { ok: false, status: 409, json: async () => ({ error: 'Ordering is closed right now.' }) } as Response;
      return { ok: true, status: 200, json: async () => String(input).endsWith('/api/menu') ? { categories: ['Snacks'], items: menuItems } : openStatus } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    savedCart(); renderAt('/cart');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Student name'), 'Aditi');
    await user.type(screen.getByLabelText('Roll number'), 'CS24');
    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    expect(await screen.findByText('Ordering is closed right now.')).toBeTruthy();
  });
});
