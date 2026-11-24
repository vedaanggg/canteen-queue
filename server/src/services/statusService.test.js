import { describe, expect, it } from 'vitest';
import { getOrderingStatus } from './statusService.js';

describe('getOrderingStatus', () => {
  it('is closed before the 9:00 AM opening time in IST', () => {
    const result = getOrderingStatus({
      now: new Date('2026-11-24T03:29:59.000Z'),
      timezone: 'Asia/Kolkata',
      override: null,
    });

    expect(result.isOpen).toBe(false);
    expect(result.currentTime).toBe('08:59:59');
  });

  it('opens at 9:00 AM IST and stays open immediately before cutoff', () => {
    const opensAtNine = getOrderingStatus({
      now: new Date('2026-11-24T03:30:00.000Z'),
      timezone: 'Asia/Kolkata',
      override: null,
    });
    const justBeforeCutoff = getOrderingStatus({
      now: new Date('2026-11-24T11:14:59.000Z'),
      timezone: 'Asia/Kolkata',
      override: null,
    });

    expect(opensAtNine.isOpen).toBe(true);
    expect(justBeforeCutoff.isOpen).toBe(true);
    expect(justBeforeCutoff.currentTime).toBe('16:44:59');
  });

  it('closes at 4:45 PM IST', () => {
    const result = getOrderingStatus({
      now: new Date('2026-11-24T11:15:00.000Z'),
      timezone: 'Asia/Kolkata',
      override: null,
    });

    expect(result.isOpen).toBe(false);
    expect(result.status).toBe('closed');
    expect(result.currentTime).toBe('16:45:00');
  });

  it('honors explicit open and closed test overrides', () => {
    const closedBySchedule = new Date('2026-11-24T02:00:00.000Z');

    expect(getOrderingStatus({ now: closedBySchedule, timezone: 'Asia/Kolkata', override: 'open' }).isOpen).toBe(true);
    expect(getOrderingStatus({ now: closedBySchedule, timezone: 'Asia/Kolkata', override: 'closed' }).isOpen).toBe(false);
  });
});
