// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./lib/socket', () => ({ socket: null }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

function renderAt(path: string) {
  window.history.replaceState({}, '', path);
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

describe('salon Step 1 placeholders', () => {
  it.each([
    ['/', 'Welcome'], ['/join', 'Join us'], ['/status/abc123', 'Booking status'],
    ['/reception', 'Reception'], ['/barber/Mira', 'Barber workspace'], ['/display', 'Salon display'], ['/admin', 'Salon admin'],
  ])('renders the placeholder for %s', async (path, title) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: 'ok', service: 'salon-api' }) }) as Response));
    renderAt(path);
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText(/No salon features are built/)).toBeTruthy();
  });

  it('switches to Gujarati and remembers that choice after remounting', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: 'ok', service: 'salon-api' }) }) as Response));
    const first = renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('heading', { name: 'સ્વાગત છે' })).toBeTruthy();
    expect(localStorage.getItem('salon-language')).toBe('gu');
    first.unmount();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'સ્વાગત છે' })).toBeTruthy();
  });
});
