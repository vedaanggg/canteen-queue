import { config } from '../config/env.js';

function timeParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getOrderingStatus({
  now = new Date(),
  timezone = config.canteenTimezone,
  override = config.orderingStatusOverride,
} = {}) {
  const parts = timeParts(now, timezone);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const openingMinutes = 9 * 60;
  const cutoffMinutes = 16 * 60 + 45;
  const scheduleIsOpen = minutes >= openingMinutes && minutes < cutoffMinutes;
  const isOpen = override === 'open' ? true : override === 'closed' ? false : scheduleIsOpen;

  return {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    openingTime: '09:00',
    orderingCutoff: '16:45',
    canteenClosingTime: '17:00',
    currentTime: `${parts.hour}:${parts.minute}:${parts.second}`,
    timezone,
    override: override ?? null,
  };
}
