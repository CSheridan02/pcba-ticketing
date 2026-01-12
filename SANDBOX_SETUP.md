# Supabase Sandbox (Staging) Setup

This repo is designed to point at Supabase via environment variables:

- **Backend** uses `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`
- **Frontend** uses `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Because you use **Supabase Auth** + **JWT validation**, the safest “sandbox DB” is **a separate Supabase project** (not a new schema in the same project).

## Why a separate Supabase project (recommended)

- **Auth is project-scoped**: a “schema-only” sandbox would still share the same auth users/JWT issuer with prod.
- **Storage is project-scoped**: your image uploads create buckets/policies in the project’s `storage` schema.
- **Less risk**: no chance of accidentally running tests against prod tables.
- **Cleaner env switching**: just swap URLs/keys.

## Step 1: Create a new Supabase project

In Supabase dashboard:

- Create a new project, e.g. `pcba-ticketing-sandbox`
- Pick a **separate** database password (store it securely)
- Wait for provisioning to complete

## Step 2: Apply schema + migrations to sandbox

In the sandbox project, open **SQL Editor → New query**.

1) Run the full baseline schema:

- Copy/paste and run `supabase-schema.sql`

2) Then run these migration files (in this order):

- `supabase-migration-add-boards.sql`
- `supabase-migration-add-board-alerts.sql`
- `supabase-migration-add-board-reference-image.sql`
- `supabase-migration-add-serial-numbers.sql`
- `supabase-migration-update-serial-ranges.sql`
- `supabase-migration-add-extra-labels-range.sql`
- `supabase-migration-add-ticket-status-comments-impact.sql`
- `supabase-migration-add-images.sql` (creates the `ticket-images` Storage bucket + policies)
- `supabase-migration-add-access-granted.sql`

Notes:
- If the SQL editor reports something already exists, that’s usually fine (most migrations use `IF NOT EXISTS`).
- `supabase-schema.sql` appears to be a “baseline”; newer features are added by the migration files above.

## Step 3: Get sandbox keys/secrets

In the sandbox project: **Settings → API**

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_KEY` (backend only; keep secret)
- **JWT Secret** (JWT Settings) → `JWT_SECRET` (backend)

## Step 4: Create sandbox env files

### Frontend: `frontend/.env.sandbox`

```env
VITE_SUPABASE_URL=https://your-sandbox-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-sandbox-anon-key
VITE_API_URL=http://localhost:3000
```

### Backend: `backend/.env.sandbox`

```env
SUPABASE_URL=https://your-sandbox-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-sandbox-service-role-key
JWT_SECRET=your-sandbox-jwt-secret
PORT=3000
```

Tip: If you ever want to run prod + sandbox locally side-by-side, set `PORT=3001` in the sandbox backend env and adjust `VITE_API_URL` accordingly.

## Step 5: Run the app against sandbox

From repo root:

```bash
npm run dev:sandbox
```

This uses:
- `frontend`: `vite --mode sandbox` (loads `frontend/.env.sandbox`)
- `backend`: `NODE_ENV=sandbox` (loads `backend/.env.sandbox` via Nest Config)

## Optional: Copy/seed data

If you need representative data in sandbox:

- Prefer generating seed data in sandbox (safe), or
- Use a SQL dump/restore from prod **only after stripping sensitive data**.

## If you *really* want a “schema-only” sandbox

You can create a separate Postgres schema (e.g. `sandbox`) in the same Supabase project, but you’d need to:

- Change all queries to target that schema (Supabase client supports a `schema` option, but you’d need it everywhere),
- Duplicate/adjust RLS policies, functions, triggers,
- Deal with Auth/Storage still being shared with prod.

For this app, a **separate Supabase project** is strongly recommended.


