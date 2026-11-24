# AGENTS.md — Canteen Order Queue

Web app for our college canteen: students order from their phone and get a token,
kitchen staff move orders on a board, and a TV shows "Now Serving".

## Read first
- docs/01-brief.md -> features + what NOT to build
- docs/02-screens.md -> every screen's layout and behaviour
- docs/03-flows-rules.md -> flows, rules, test checklist

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (all orders and menu items are stored here)
- Realtime: Socket.IO (every screen updates without refresh)
- Run everything locally with `npm run dev` (frontend and backend together)
- Frontend: http://localhost:5173 | Backend: http://localhost:3001

## Architecture rules
- All business rules (totals, token numbers, status transitions, quantity limits,
  sold-out checks, closing time) are enforced on the BACKEND. The frontend
  validation is only for friendly messages.
- Never trust prices or totals sent from the browser. Recalculate on the server.
- Read API and socket URLs from environment variables. No hard-coded localhost
  URLs in the code (needed later for deployment).
- Keep a clean modular structure: client/ and server/ folders, with routes,
  services, and database code separated.

## How to work
- Build one screen or one feature per task. Do not touch other screens.
- Mobile-first (390px wide), then make it look good on a laptop.
- /display is designed for a 1920x1080 TV. /kitchen is for a tablet/laptop.
- Orange accent (#F97316), rounded cards, large tap targets.
- Use realistic Indian canteen dummy data with prices in rupees.
- Never add features from the "Don't build" list in docs/01-brief.md.
- Do not redesign or change working screens unless asked.
- Add useful error messages and friendly empty states.
- Add automated tests for critical business logic (tokens, transitions, totals).
- Do not claim a feature works unless you have actually tested it.
## Deployment
- Frontend deploys to Vercel; backend (Express + Socket.IO + SQLite) deploys to Render.
- Never hard-code localhost URLs. Use env vars: VITE_API_URL (frontend) and
  CLIENT_ORIGIN (backend CORS and Socket.IO).
- Include vercel.json so refreshing /kitchen, /display, /admin and /order/:id
  does not 404.
- Seed the menu automatically on backend startup if the database is empty.
- Live link must be the first line after the title in README.md.
- After each task: list the changed files and the exact commands to test.

Use Asia/Kolkata for all time rules (CANTEEN_TIMEZONE env var)