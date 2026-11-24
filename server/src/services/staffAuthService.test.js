import { describe, expect, it, vi } from 'vitest';
import { createStaffAuthService } from './staffAuthService.js';

describe('staff PIN authentication', () => {
  it('rejects a wrong PIN and issues, validates and revokes a bearer token for the right PIN', () => {
    const auth = createStaffAuthService({ staffPin: '4829', tokenGenerator: () => 'staff-session-token' });
    expect(auth.login('0000').error).toMatchObject({ status: 401, code: 'INVALID_STAFF_PIN', message: 'That staff PIN is incorrect.' });
    const login = auth.login('4829');
    expect(login).toEqual({ token: 'staff-session-token' });
    expect(auth.isValid(login.token)).toBe(true);

    const next = vi.fn();
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    auth.requireStaff({ get: () => `Bearer ${login.token}` }, response, next);
    expect(next).toHaveBeenCalledOnce();

    auth.logout(login.token);
    expect(auth.isValid(login.token)).toBe(false);
  });

  it('rejects requests with no token and refuses login when STAFF_PIN is unset', () => {
    const auth = createStaffAuthService({ staffPin: '' });
    expect(auth.login('any').error).toMatchObject({ status: 503, code: 'STAFF_PIN_NOT_CONFIGURED', message: 'Staff PIN is not configured on the server.' });
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    auth.requireStaff({ get: () => '' }, response, vi.fn());
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STAFF_AUTH_REQUIRED' }));
  });
});
