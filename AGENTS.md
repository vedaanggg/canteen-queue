# AGENTS.md — Salon Studio

Salon Studio is a web app scaffold for a salon. Step 1 provides infrastructure,
placeholder routes, and English/Gujarati navigation only; do not build salon
workflows or real screens until a later task requests them.

## Stack and structure
- Frontend: React, Vite, TypeScript, and Tailwind CSS in `client/`.
- Backend: Node.js, Express, SQLite, and Socket.IO in `server/`.
- Run both local development servers with the root `npm run dev` command.
- Keep routes, services, database access, and frontend utilities modular.
- Read the frontend API base URL from `VITE_API_URL`.
- Use `CLIENT_ORIGIN` for Express CORS and Socket.IO CORS.
- `SALON_TIMEZONE` and server-only `STAFF_PIN` are backend environment settings.
- Keep direct SPA routes working through the Vercel rewrite configuration.

## Product and implementation rules
- Step 1 contains placeholders only; do not add salon features, business rules,
  or app-specific database tables unless a later task asks for them.
- Use charcoal `#1F2937` and gold `#D4A017` as the visual theme.
- Support English and Gujarati, and remember the language choice in the browser.
- Build one requested screen or feature at a time; avoid unrelated redesigns.
- Keep secrets such as `STAFF_PIN` on the backend and out of client bundles.
- Add focused tests for new behavior and report the exact commands and results.
- Do not claim a feature works unless it has been tested.
- Do not deploy unless explicitly requested.
