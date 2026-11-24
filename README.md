# Canteen Menu & Order Queue System

**Live demo:** [https://your-app.vercel.app](https://canteen-queue-five.vercel.app/)
**Hosted on:** Vercel (frontend) + Render (backend)

## Known limitations
- Render's free tier wipes the SQLite database on restart or redeploy. The menu is re-seeded automatically, but old orders are lost.
- The first request after 15 minutes idle takes 30-60 seconds.
