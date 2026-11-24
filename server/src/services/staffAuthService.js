import { randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config/env.js';

export function createStaffAuthService({ staffPin = config.staffPin, tokenGenerator = randomUUID } = {}) {
  const tokens = new Set();

  function login(pin) {
    if (!staffPin) return { error: { status: 503, code: 'STAFF_PIN_NOT_CONFIGURED', message: 'Staff PIN is not configured on the server.' } };
    const supplied = typeof pin === 'string' ? pin : '';
    const expectedBuffer = Buffer.from(staffPin);
    const suppliedBuffer = Buffer.from(supplied);
    const valid = expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
    if (!valid) return { error: { status: 401, code: 'INVALID_STAFF_PIN', message: 'That staff PIN is incorrect.' } };
    const token = tokenGenerator();
    tokens.add(token);
    return { token };
  }

  function isValid(token) { return typeof token === 'string' && tokens.has(token); }

  function requireStaff(request, response, next) {
    const authorization = request.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!isValid(token)) return response.status(401).json({ error: 'Staff access is required. Enter the staff PIN.', code: 'STAFF_AUTH_REQUIRED' });
    request.staffToken = token;
    return next();
  }

  function logout(token) { return tokens.delete(token); }
  return { login, isValid, requireStaff, logout };
}

export const staffAuth = createStaffAuthService();
