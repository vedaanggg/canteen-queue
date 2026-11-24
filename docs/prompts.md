1st prompt
Read AGENTS.md and everything in docs/. Do not write any code yet.

1. Tell me in your own words the rules you will follow while working on this project.
2. Summarise the app in 8 bullet points.
3. List anything that is unclear, missing, or contradictory in the docs.

I've updated AGENTS.md and docs/03-flows-rules.md to resolve the gaps you listed.
Re-read all docs. In 3 bullets, tell me whether anything is still unclear or
contradictory. Do not write any code yet.


Implement Step 1 only. Set up React + Vite + TypeScript + Tailwind for the
frontend, and an Express backend with SQLite and Socket.IO. Create a clean
modular folder structure (client/ and server/), configure one root script so
`npm run dev` runs frontend and backend together, and add a backend health-check
endpoint at /api/health. Read the API URL from an environment variable
(VITE_API_URL) and allow the frontend origin from CLIENT_ORIGIN on the backend
(CORS and Socket.IO). Add a vercel.json so direct visits to /kitchen, /display,
/admin and /order/:id do not 404. Add a simple placeholder page for each of the
6 routes with a temporary nav bar. Do not build any real screens yet.

Also create docs/api.md describing the endpoints, database tables and Socket.IO
events you plan to use, and keep it updated in later steps.

Verify that frontend and backend both run on localhost and the frontend can
reach the health check. List the changed files and the exact test commands.
Do not deploy anything.

Build only Screen 1 (Menu) and Screen 2 (Cart) from docs/02-screens.md.
Do not touch other screens.

Backend:
- Create the menu_items table in SQLite and seed 15-20 realistic Indian canteen
  items on startup if the table is empty, with categories (Snacks, Meals,
  Beverages, Desserts), rupee prices, veg/non-veg flag, a short description and
  an emoji. Make 2-3 items sold out.
- Add GET /api/menu and GET /api/status (open/closed, decided by the backend
  using CANTEEN_TIMEZONE; ordering is open 9:00 AM to 4:45 PM IST).

Frontend:
- Search plus category tabs working together, sticky tabs, add/remove items,
  quantity controls with max 10, sticky cart bar, cart totals.
- Cart page with student name and roll number validation, and an empty-cart state.
- Sold-out items greyed out and disabled. "Ordering closed" banner when closed.
- Loading, error and empty states. Keep the cart if the page is refreshed.
- Mobile-first at 390px, then responsive on laptop. Orange accent #F97316.
- Place Order only validates the form for now. Real order placement comes in the
  next step, so do not create orders yet.

Update docs/api.md. Test all interactions, including the 10-item limit and the
closed state. List the changed files and test commands.
