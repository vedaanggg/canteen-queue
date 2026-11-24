# AGENTS.md — Salon Queue Management

Queue app for a salon: customers join from their phone, see their wait time and
get called; reception and barbers manage the queue; a TV shows who is with whom.

## Read first
- docs/01-brief.md -> features + what NOT to build
- docs/02-screens.md -> every screen's layout and behaviour
- docs/03-flows-rules.md -> flows, queue rules, test checklist

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite
- Realtime: Socket.IO (every screen updates without refresh)
- Run everything locally with `npm run dev` (frontend and backend together)
- Frontend: http://localhost:5173 | Backend: http://localhost:3001
- Tests: Vitest

## Architecture rules
- All queue rules (call next, barber preference, status transitions, wait time,
  one spot per phone, closing times) live in ONE backend module and are reused
  everywhere. The frontend only displays what the backend returns.
- Never trust prices, totals or wait times sent from the browser.
- Read API and socket URLs from environment variables. No hard-coded localhost
  URLs in the code.
- Keep a clean modular structure: client/ and server/, with routes, services and
  database code separated.
- Use Asia/Kolkata for all time rules (CANTEEN_TIMEZONE is renamed
  SALON_TIMEZONE). Time must be injectable in tests.

## How to work
- One screen or one feature per task. Do not touch other screens.
- Mobile-first (390px), then tablet for /reception, and 1920x1080 for /display.
- Theme: charcoal (#1F2937) + gold (#D4A017), rounded cards, tap targets at
  least 44px.
- All labels come from the English/Gujarati language file. No hard-coded text.
- Use realistic Indian salon dummy data with prices in rupees.
- Never add features from the "Don't build" list in docs/01-brief.md.
- Do not redesign or change working screens unless asked.
- Add useful error messages and friendly empty states.
- Add automated tests for critical queue logic.
- Do not claim a feature works unless you have actually tested it.
- After each task: list the changed files and the exact commands to test.

## Deployment
- Frontend deploys to Vercel; backend (Express + Socket.IO + SQLite) to Render.
- Env vars: VITE_API_URL (frontend); CLIENT_ORIGIN, SALON_TIMEZONE and STAFF_PIN
  (backend).
- Keep client/vercel.json so refreshing any route does not 404.
- Seed services and barbers on backend startup if the database is empty.
- Live link must be the first line after the title in README.md, with the test
  staff PIN right below it.
