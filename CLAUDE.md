# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Local development (run both in separate terminals)
npm run build          # Build frontend first (required before dev:pages)
npm run dev:all        # Vite (port 5173) + Wrangler Pages dev (port 8788) concurrently

# Or separately:
npm run dev            # Frontend only (Vite, port 5173)
npm run dev:pages      # Pages Functions + D1 local (port 8788)

# Build for production
npm run build

# Deploy to Cloudflare Pages (also runs automatically via GitHub Actions on push to main)
npm run deploy

# Lint
npm run lint

# Apply D1 schema (first time or after schema changes)
npx wrangler d1 execute idcyp-db --local --file=schema.d1.sql   # local
npx wrangler d1 execute idcyp-db --remote --file=schema.d1.sql  # production
```

There are no tests in this project.

## Architecture Overview

This is a **full-stack meal planning app** deployed entirely on Cloudflare — frontend on Pages, backend as Pages Functions, database as D1 (SQLite).

### Frontend → Backend Communication
- During local dev: Vite's dev server proxies `/api/*` → `http://localhost:8788` (Wrangler's local port)
- In production: Cloudflare Pages serves the `dist/` static files and handles `/api/*` via Functions
- `VITE_API_URL` env var can override the API base URL (defaults to `/api`)

### Backend (`functions/`)
- **`functions/_middleware.js`**: Runs on every request. Reads the `session` cookie, looks up the session in D1, hydrates `context.data.user`.
- **`functions/_lib/auth.js`**: `requireAuth()`, `json()` helpers, and `generateInviteCode()`.
- **`functions/_lib/cookie.js`**: Cookie header parser.
- **`functions/_lib/normalize.js`**: Converts D1 integer booleans (0/1) to JS booleans, parses JSON aggregate fields.
- **`functions/api/`**: One file per route. Exports `onRequestGet`, `onRequestPost`, etc.

### Authentication
Google OAuth 2.0 implemented manually (no Passport.js — doesn't run in Workers):
1. `GET /api/auth/google` → redirects to Google
2. `GET /api/auth/google/callback` → exchanges code for tokens, upserts user in D1, creates session
3. Sessions stored in D1 `sessions` table. Cookie: `session=<sid>`

### Frontend (`src/`)
- **`App.tsx`**: Root component. Wraps everything in `ThemeProvider` → `AuthProvider` → `Router`.
- **`contexts/AuthContext.tsx`**: React Context for auth state. Always fetch with `credentials: 'include'`.
- **`store/`**: Redux Toolkit store with two slices:
  - `menuSlice.ts`: Manages `MenuItem[]`, filters, async thunks for menu CRUD + favorites + ratings.
  - `mealPlanSlice.ts`: Manages `MealPlan[]` and async thunks for planning and shopping list generation.

### Data Scoping via Groups
Every `menu_item` has both a `user_id` and a `group_id`. `GET /api/menu/items` scopes by:
1. `user.active_group_id` → show all items in that group
2. Otherwise `user.id` → show only the user's own items
3. No auth → empty array

### Key Database Tables (D1/SQLite)
- `users` — `active_group_id` FK to groups
- `groups` + `group_members` — collaborative sharing; roles: `owner` or `member`; invite via `invite_code`
- `menu_items` — scoped by `group_id`; related to `recipes`, `ingredients`, `tags`
- `meal_plans` — maps a `menu_item` to a date and meal type
- `ratings` — one per `(menu_item_id, user_id)` pair (upserted)
- `shared_links` — token-based public sharing
- `sessions` — server-side session storage (sid, sess JSON, expire)

### D1 Query Patterns
- Use `?` placeholders (not `$1`, `$2`)
- `.all()` → `{ results: [...] }`
- `.first()` → single row or null
- `.run()` → for INSERT/UPDATE/DELETE without RETURNING
- No `json_agg` / `jsonb_build_object` — use `json_group_array(json_object(...))` correlated subqueries
- No `ILIKE` — use `LOWER(col) LIKE LOWER(?)`
- Booleans stored as `INTEGER` (0/1) — use `normalizeBool()` or `normalizeItem()` before returning to client
- `INSERT OR IGNORE` for upsert-like patterns on unique constraints

### Deployment
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — deploys on every push to `main`
- **Config**: `wrangler.toml` — D1 binding `DB`, Pages project `idcyp`
- **Secrets in Cloudflare**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CLIENT_URL`
- **D1 database**: `idcyp-db` (ID: `b52398e9-15dc-4913-a43c-d3182b3a853e`)
- **Live URL**: https://idcyp.pages.dev
