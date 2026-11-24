// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./lib/socket', () => ({ socket: null }));

const services = [
  { id: 1, nameEn: 'Haircut', nameGu: 'વાળ કપાવવું', durationMinutes: 30, price: 150 },
  { id: 2, nameEn: 'Beard trim', nameGu: 'દાઢી ટ્રીમ', durationMinutes: 15, price: 80 },
  { id: 3, nameEn: 'Hair spa', nameGu: 'હેર સ્પા', durationMinutes: 45, price: 400 },
  { id: 4, nameEn: 'Facial', nameGu: 'ફેશિયલ', durationMinutes: 40, price: 350 },
  { id: 5, nameEn: 'Hair color', nameGu: 'વાળમાં રંગ', durationMinutes: 90, price: 1200 },
  { id: 6, nameEn: 'Head massage', nameGu: 'માથાની મસાજ', durationMinutes: 20, price: 120 },
];
const barbers = [
  { id: 1, name: 'Ravi', avatar: '👨🏽‍🦱', status: 'free' },
  { id: 2, name: 'Amit', avatar: '👨🏻‍🦱', status: 'busy' },
  { id: 3, name: 'Imran', avatar: '🧔🏽', status: 'on_break' },
];
const salonStatus = (onlineJoiningOpen = true) => ({ isOpen: true, status: 'open', openingTime: '10:00', closingTime: '21:00', onlineJoiningOpen, onlineJoiningEnabled: true, waitingCount: 0, estimatedWaitMinutes: 0, currentTime: '12:00:00', timezone: 'Asia/Kolkata', override: null });

function mockApi({ joiningOpen = true, onEstimate }: { joiningOpen?: boolean; onEstimate?: (ids: number[], barber: string) => object } = {}) {
  const methods: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    methods.push(init?.method ?? 'GET');
    const url = new URL(String(input), 'http://test');
    let body: unknown = { status: 'ok', service: 'salon-api' };
    if (url.pathname === '/api/services') body = { services };
    if (url.pathname === '/api/barbers') body = { barbers };
    if (url.pathname === '/api/status') body = salonStatus(joiningOpen);
    if (url.pathname === '/api/queue/estimate') {
      const ids = (url.searchParams.get('serviceIds') ?? '').split(',').map(Number);
      const barber = url.searchParams.get('barber') ?? 'any';
      body = onEstimate?.(ids, barber) ?? { serviceIds: ids, barber, totalMinutes: ids.reduce((sum, id) => sum + (services.find((service) => service.id === id)?.durationMinutes ?? 0), 0), totalPrice: ids.reduce((sum, id) => sum + (services.find((service) => service.id === id)?.price ?? 0), 0), waitingCount: 0, expectedWaitMinutes: 0 };
    }
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, methods };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

function renderAt(path: string) { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); }

describe('salon screens', () => {
  it('shows the home status, live queue card, barber availability, and Join Queue action', async () => {
    mockApi(); renderAt('/');
    expect(await screen.findByRole('heading', { name: 'A little time for yourself' })).toBeTruthy();
    expect(screen.getByText('Live queue')).toBeTruthy();
    expect(screen.getByText('People waiting')).toBeTruthy();
    expect(screen.getByText('Imran')).toBeTruthy();
    expect(screen.getByText('On break')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Join Queue' }).some((link) => link.getAttribute('href') === '/join')).toBe(true);
  });

  it('keeps Join Queue closed when the salon is closed or the owner switch is off', async () => {
    mockApi({ joiningOpen: false }); renderAt('/');
    expect(await screen.findByText('Online joining is closed right now. Please check back during salon hours.')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Join Queue' }).find((link) => link.getAttribute('aria-disabled') === 'true')).toBeTruthy();
  });

  it('updates service totals live, caps selection at three, and shows the on-break barber as disabled', async () => {
    const user = userEvent.setup(); mockApi(); renderAt('/join');
    const haircut = await screen.findByRole('button', { name: /Haircut/ });
    await user.click(haircut);
    await user.click(screen.getByRole('button', { name: /Beard trim/ }));
    await waitFor(() => expect(screen.getByText('Total service time').parentElement?.textContent).toContain('45 min'));
    expect(screen.getByText('₹230')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Hair spa/ }));
    const facial = screen.getByRole('button', { name: /Facial/ });
    await user.click(facial);
    expect(facial.getAttribute('aria-pressed')).toBe('false');
    expect((await screen.findByText('You can select up to 3 services.')).textContent).toContain('You can select up to 3 services.');
    expect(screen.getByText('3 / 3')).toBeTruthy();
    const imran = screen.getByRole('button', { name: /Imran/ });
    expect(imran).toHaveProperty('disabled', true);
  });

  it('validates the 10-digit phone and does not create a queue spot on confirm', async () => {
    const { methods } = mockApi(); const user = userEvent.setup(); renderAt('/join');
    await user.click(await screen.findByRole('button', { name: /Haircut/ }));
    await user.type(screen.getByLabelText('Your name'), 'Mira Patel');
    await user.type(screen.getByLabelText('10-digit phone number'), '12345');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter a valid 10-digit phone number.');
    await user.clear(screen.getByLabelText('10-digit phone number'));
    await user.type(screen.getByLabelText('10-digit phone number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect((await screen.findByText('Joining the queue will be available in a later step.')).textContent).toContain('Joining the queue will be available in a later step.');
    expect(methods).not.toContain('POST');
  });

  it('switches the Home labels to Gujarati and remembers the language', async () => {
    const user = userEvent.setup(); mockApi(); renderAt('/');
    await screen.findByRole('heading', { name: 'A little time for yourself' });
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(await screen.findByRole('heading', { name: 'તમારા માટે થોડો સમય' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('gu');
    expect(localStorage.getItem('salon-language')).toBe('gu');
  });

  it('keeps the unrequested reception, barber, display, admin and status screens as placeholders', async () => {
    mockApi();
    const cases: [string, string][] = [['/status/abc', 'Queue status'], ['/reception', 'Reception'], ['/barber/Mira', 'Barber workspace'], ['/display', 'Salon display'], ['/admin', 'Salon admin']];
    for (const [path, title] of cases) {
      cleanup(); renderAt(path);
      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
      expect(screen.getByText('This is a placeholder page. Salon features will be added in a later step.')).toBeTruthy();
    }
  });
});
