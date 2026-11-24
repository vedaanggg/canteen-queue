import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, '../../../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN,
  databasePath: process.env.DATABASE_PATH ?? './data/salon.sqlite',
  salonTimezone: process.env.SALON_TIMEZONE?.trim() || 'Asia/Kolkata',
  salonStatusOverride: process.env.SALON_STATUS_OVERRIDE?.trim().toLowerCase() || undefined,
  staffPin: process.env.STAFF_PIN?.trim() || undefined,
};

if (config.salonStatusOverride && !['open', 'closed'].includes(config.salonStatusOverride)) {
  throw new Error('SALON_STATUS_OVERRIDE must be "open" or "closed" when set.');
}
