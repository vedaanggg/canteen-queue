import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, '../../../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN,
  databasePath: process.env.DATABASE_PATH ?? './data/canteen.sqlite',
  canteenTimezone: process.env.CANTEEN_TIMEZONE ?? 'Asia/Kolkata',
  orderingStatusOverride: process.env.ORDERING_STATUS_OVERRIDE?.trim().toLowerCase() || undefined,
};

if (config.orderingStatusOverride && !['open', 'closed'].includes(config.orderingStatusOverride)) {
  throw new Error('ORDERING_STATUS_OVERRIDE must be "open" or "closed" when set.');
}
