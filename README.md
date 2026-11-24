link for site
https://canteen-queue-five.vercel.app/


# Salon Studio

Salon Studio is currently a development scaffold with placeholder routes for
the salon app. No booking, reception, barber, display, or admin features are
implemented yet.
**Staff PIN (reception, barber, admin):** 1234
## Local development

1. Copy `.env.example` to `.env` and set backend configuration.
2. Copy `client/.env.example` to `client/.env.local` and set `VITE_API_URL`.
3. Run `npm run dev` from the project root.

The frontend runs on port 5173 and the API on port 3001 by default. The
frontend SPA is configured for Vercel rewrites. The backend exposes
`GET /api/health` and uses the configured SQLite file for its persistence
scaffold; no salon data tables are created in Step 1.

## Checks

- `npm run build`
- `npm test --prefix client`
- `npm test --prefix server`
