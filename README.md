# Gandalf Dashboard

A personal assistant dashboard (email, calendar, wheel trading positions) as a
standalone site, so it works from any browser — laptop, iPad, phone — not just
inside Claude Desktop.

- **Wheel positions & account snapshot** — read from the same Supabase project
  as your existing wheel trading tracker.
- **Gmail** — view unread inbox, delete (trash) threads.
- **Google Calendar** — view/add/edit/delete events for the next 7 days, plus a
  "Sync expirations to calendar" button that pushes open option expiries onto
  your calendar.
- **Password-gated** — a single shared password protects the whole site.

Gmail and Calendar access happens through your own Google OAuth app (not
Claude's connectors), so this needs a one-time setup in Google Cloud Console.

---

## 1. Deploy to Netlify

Push this folder to a new GitHub repo and connect it in Netlify ("Add new site
→ Import an existing project"), or deploy directly with the Netlify CLI:

```
npm install
netlify deploy --prod
```

Netlify will detect `netlify.toml` and build the `netlify/functions` folder
automatically. Note the site URL it gives you (e.g.
`https://gandalf-kurt.netlify.app`) — you'll need it below.

## 2. Set environment variables

In Netlify: **Site configuration → Environment variables**. Add:

| Variable | Value |
|---|---|
| `DASHBOARD_PASSWORD` | A password you choose. |
| `SESSION_SECRET` | Random string. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SITE_URL` | Your Netlify site URL from step 1, no trailing slash. |
| `SUPABASE_URL` | `https://yntxzqevqxiekcopvhju.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase dashboard → Settings → API → `service_role` secret key. **Never share this key or put it in a repo.** |
| `GOOGLE_CLIENT_ID` | From step 3 below. |
| `GOOGLE_CLIENT_SECRET` | From step 3 below. |

After adding them, trigger a redeploy so the functions pick up the new values.

## 3. Set up Google OAuth (Gmail + Calendar access)

This is the part that requires your Google login — I can't do it for you.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (e.g. "Gandalf Dashboard").
2. **APIs & Services → Library**: enable the **Gmail API** and the
   **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**.
   - Add yourself (kage14@gmail.com) as a **test user**. In "Testing" mode
     Google limits access to test users only — that's fine, you're the only
     user.
   - Add scopes: `gmail.modify`, `calendar.events`, `calendar.readonly`.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI: `https://YOUR-SITE.netlify.app/auth/google/callback`
     (use the real site URL from step 1).
   - Copy the **Client ID** and **Client secret** into the Netlify environment
     variables above, then redeploy.

Because this app stays in "Testing" mode, the first time you connect Google
will show an "unverified app" warning. That's expected for a personal app —
click **Advanced → Go to Gandalf Dashboard (unsafe)** to proceed. Nothing is
actually unsafe; Google just hasn't reviewed apps that aren't public.

## 4. Connect your Google account

1. Open your deployed site, enter the dashboard password.
2. The Calendar and Inbox cards will show a **"Connect Google Account"**
   button (since Google isn't linked yet) — click it, sign in, and approve
   the requested scopes.
3. You're redirected back to the dashboard, now pulling live Gmail/Calendar
   data. The refresh token is stored server-side in the `gandalf_tokens`
   table in Supabase — you won't need to reconnect unless you revoke access
   at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

---

## How it's protected

- The whole site sits behind a password (`DASHBOARD_PASSWORD`), checked by
  `/api/login`, which sets a signed, `HttpOnly` session cookie. Every data
  function checks this cookie before returning anything.
- The Google refresh token and Supabase service-role key never reach the
  browser — they're only used inside Netlify Functions.
- The Supabase anon/publishable key isn't used at all here; every read goes
  through a server function using the service-role key, gated by the same
  session check.

## Project structure

```
public/index.html             – the dashboard UI (static, no build step)
netlify/functions/
  lib/auth.mts                 – session cookie signing/verification
  lib/google.mts                – Google token refresh + storage helpers
  lib/supabase.mts               – Supabase service-role client
  login.mts / logout.mts / session-check.mts
  oauth-start.mts / oauth-callback.mts   – Google consent flow (paths: /auth/google/start, /auth/google/callback)
  gmail-list.mts / gmail-trash.mts
  calendar-list.mts / calendar-create.mts / calendar-update.mts / calendar-delete.mts
  wheel-data.mts                – reads the `positions` table
  sync-expirations.mts          – pushes open option expiries to your calendar
```

Each function declares its own route via an in-code `config.path` export (Netlify's
modern function format), so all data endpoints live under `/api/...` and the OAuth
ones under `/auth/google/...` — no redirect rules needed in `netlify.toml`.

Note: if you're reusing files from an earlier draft of this project, delete any
leftover `.js` files in `netlify/functions/` (and `netlify/functions/lib/`) —
only the `.mts` versions should remain.

## Local testing

```
npm install -g netlify-cli
npm install
netlify dev
```

`netlify dev` runs the functions locally, but Google OAuth still needs a
public HTTPS redirect URI, so the Google-connected features only work once
deployed (or via a tunnel like ngrok pointed at `netlify dev`).
