1) npm install
2) Copy `.env.example` to `.env` and set secrets (see variables below).
3) `node index.js` — app listens on `PORT` or **8000** locally.
4) Backend is deployed on Railway (see `railway.json`).

## Supabase keep-alive (avoid free-tier pause)

On boot and **three times per day** at **5:30am, 2:30pm, and 9:30pm** server local time (cron `30 5,14,21 * * *`), the server pings each configured Supabase project so the org stays “active.” The URL that matches `SUPABASE_URL` is pinged with the existing **service-role** client (same as the rest of the app); other URLs use the anon key or `/auth/v1/health`. Logs look like:

- `[keep-alive] main (liftinfluence): ok (select users)`
- `[keep-alive] crm-saas: ok (select …)` or `ok (health …)`

**Railway:** add the same variables as in `.env` for the second project:

| Variable | Required for CRM ping |
|----------|------------------------|
| `SUPABASE_URL_CRM` | Yes (e.g. `https://ocazbfmddzvkmsqtbojj.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY_CRM` |
| `SUPABASE_KEEPALIVE_TABLE_CRM` | Optional — if unset, the job uses `GET /auth/v1/health` |

After deploy, open Railway logs and confirm the `[keep-alive]` lines on startup.

