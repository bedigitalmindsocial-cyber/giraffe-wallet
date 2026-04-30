# Giraffe Wallet Setup

Click-by-click instructions for getting Giraffe Wallet running locally and deploying to Cloudflare Workers.

---

## 1. Local development (no Supabase needed)

The app ships with an in-memory mock store and seed data so you can run the full UI without setting up any backend.

```bash
cd giraffe-wallet
npm install
cp .env.example .env.local
# (optional) edit .env.local to change CATALOG_PASSWORD
npm run dev
```

Open http://localhost:3001.

Default credentials in mock mode:

- Catalog: password is whatever you set in `CATALOG_PASSWORD` (default `change-me`)
- Staff (ops): try `admin@giraffe.partners` / `wallet`, or `manager@giraffe.partners`, `executor@giraffe.partners`
- Client portal: engagement code `saraswati-industries-a3k7`, passcode `1234`

State persists only for the lifetime of the Node process. Restart the dev server to reset to seed data.

---

## 2. Supabase setup

### 2.1 Create the project

1. Sign in at https://supabase.com
2. New project. Name it `giraffe-wallet`. Region: `ap-south-1` (Mumbai).
3. Generate a strong DB password and save it.

### 2.2 Run the migration

1. In the Supabase dashboard, open SQL Editor.
2. Open `supabase/migrations/0001_init.sql` in this repo.
3. Paste the entire contents into the SQL editor and Run.
4. You should see all tables, the `engagement_balances` view, and seed data for roles, settings, packages, services.

### 2.3 Create the first super_admin user

1. Authentication → Users → Add user → enter your email and a password. (Skip email confirmation for now.)
2. Copy the user's UUID.
3. Back in SQL Editor, run:

```sql
insert into users (id, email, name, role, is_active)
values ('<paste UUID>', 'you@example.com', 'Your name', 'super_admin', true);
```

4. Repeat for any managers and executors.

### 2.4 Copy the env vars

In Supabase: Settings → API → copy `Project URL`, `anon public` key, and `service_role` key.

Set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SESSION_SECRET=<openssl rand -hex 32>
CATALOG_PASSWORD=<a strong password>
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Restart dev server. You should see `[wallet] Using Supabase store` in the console.

> Note: v1 ships with `src/lib/data/supabase.ts` delegating to the in-memory store as a placeholder. Wire each method to the real Supabase client incrementally. The schema is ready in `0001_init.sql` and the contract is fixed in `src/lib/data/store.ts`.

---

## 3. Cloudflare Workers deploy

### 3.1 One-time setup

1. Install Wrangler if you haven't: `npm i -g wrangler`
2. `wrangler login`

### 3.2 Build and deploy

```bash
npm run cf:build
npx wrangler deploy
```

You'll be assigned a `*.workers.dev` subdomain on first deploy. Map a custom domain (e.g. `wallet.giraffe.partners`) via Cloudflare DNS once verified.

### 3.3 Set environment vars in Cloudflare

In the Cloudflare dashboard → Workers & Pages → your `giraffe-wallet` worker → Settings → Variables:

- `CATALOG_PASSWORD` (Encrypted)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Encrypted)
- `SESSION_SECRET` (Encrypted, `openssl rand -hex 32`)
- `NEXT_PUBLIC_APP_URL=https://wallet.giraffe.partners`

Trigger another deploy after setting variables.

---

## 4. Domain map

| Surface | URL | Auth |
|---|---|---|
| Landing | `/` | Public |
| Catalog | `/catalog/*` | Single password (CATALOG_PASSWORD) |
| Staff ops | `/ops/*` (excluding `/ops/client/*`) | Email + password (Supabase Auth in prod, mock in dev) |
| Client portal | `/ops/client/[slug]` | Engagement slug + 4-digit passcode |

---

## 5. Common operations

### Reset local state
Restart `npm run dev`. Everything reseeds.

### Rotate the catalog password
Change `CATALOG_PASSWORD` in env and redeploy. All existing catalog cookies become invalid.

### Add a new staff user
1. Add via Supabase Authentication panel.
2. `insert into users(...)` mapping the auth UID to a role.

### Add a new package or service
Use the catalog UI at `/catalog`. No SQL needed.

---

## 6. Architecture cheat-sheet

- One Next.js 16 app, App Router, Tailwind v4
- `src/lib/data/store.ts` auto-switches between mock (no env) and Supabase (env set)
- `src/middleware.ts` enforces presence of session cookies on protected routes; HMAC verification happens in Node-runtime page/route handlers
- `src/lib/credits.ts` is the single source of truth for cost calculation
- `engagement_balances` view in Postgres (or `computeBalance` in mock) is the wallet single-source-of-truth
- Cancelled tasks are excluded from `used` totals. That is the refund mechanism.
