# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start both frontend (port 5173) and backend (port 3001) concurrently
npm run dev:all

# Start individually
npm run dev          # Frontend only (Vite, port 5173)
npm run dev:server   # Backend only (Express, port 3001)

# Build for production (TypeScript compile + Vite bundle → dist/)
npm run build

# Lint
npm run lint

# Initialize database (requires PostgreSQL running locally)
./setup-db.sh
```

There are no tests in this project.

## Architecture Overview

This is a **full-stack meal planning app** with a unified Express server that serves both the API and the built frontend in production.

### Frontend → Backend Communication
- During local dev: Vite's dev server proxies `/api/*` → `http://localhost:3001` (configured in `vite.config.ts`)
- In production: Express serves the `dist/` static files and also handles `/api/*` routes directly
- `VITE_API_URL` env var can override the API base URL (defaults to `/api`)

### Backend (`server/`)
- **`index.js`**: Express app entrypoint. Sets up middleware, mounts all route files under `/api/*`, and serves the `dist/` static bundle via catch-all for SPA routing.
- **`auth.js`**: Passport.js Google OAuth 2.0 strategy. On first login, auto-creates a default group for the user and sets it as their `active_group_id`.
- **`db.js`**: PostgreSQL connection pool (`pg`).
- **`schema.sql`**: Full database schema. Run this to initialize the database.
- **`middleware/auth.js`**: Exports `isAuthenticated` (blocks unauthenticated requests) and `optionalAuth` (no-op, used where auth is optional).
- **`routes/`**: One file per domain — `authRoutes.js`, `menuRoutes.js`, `mealPlanRoutes.js`, `shareRoutes.js`, `groupRoutes.js`.

Sessions are stored in PostgreSQL (`user_sessions` table, managed by `connect-pg-simple`). The server sets `trust proxy: 1` for secure cookie behavior behind a reverse proxy.

### Frontend (`src/`)
- **`App.tsx`**: Root component. Wraps everything in `ThemeProvider` → `AuthProvider` → `Router`. Defines all client-side routes.
- **`contexts/AuthContext.tsx`**: React Context for auth state (`user`, `loading`, `login`, `logout`, `refreshUser`). `login()` redirects to the Google OAuth flow. Always fetch with `credentials: 'include'`.
- **`store/`**: Redux Toolkit store with two slices:
  - `menuSlice.ts`: Manages `MenuItem[]`, `selectedItem`, `filters`, and async thunks for all menu CRUD + favorites + ratings. The `MenuItem` type has `price` typed as `number | string` because PostgreSQL returns `DECIMAL` as a string.
  - `mealPlanSlice.ts`: Manages `MealPlan[]` and async thunks for planning and shopping list generation.
  - Auth state is intentionally kept in React Context rather than Redux.
- **`theme/ThemeProvider.tsx`**: Wraps MUI's `ThemeProvider`. Supports `light` | `dark` | `system` modes, persisted to `localStorage`. Use `useThemeMode()` hook to read or toggle the theme.

### Data Scoping via Groups
A core pattern: every `menu_item` has both a `user_id` and a `group_id`. The backend's `GET /api/menu/items` scopes results by:
1. `req.user.active_group_id` → show all items in that group
2. Otherwise, `req.user.id` → show only the current user's items
3. No auth → no items returned

New users automatically get a personal default group on first OAuth login.

### Key Database Tables
- `users` — has `active_group_id` FK pointing to their currently-selected group
- `groups` + `group_members` — collaborative sharing; roles are `owner` or `member`; invite via `invite_code`
- `menu_items` — scoped by `group_id`; references `recipes`, `ingredients` (via `menu_item_ingredients`), and `tags` (via `menu_item_tags`)
- `meal_plans` — maps a `menu_item` to a date and meal type (`breakfast`, `lunch`, `dinner`, `snack`)
- `ratings` — one rating per `(menu_item_id, user_id)` pair (upserted)
- `shared_links` — token-based public sharing for individual menu items

### TypeScript / JavaScript Split
- All frontend code (`src/`) is TypeScript.
- All backend code (`server/`) is plain JavaScript (ES modules). There are `@types/*` packages for IDE support but the server files are `.js`.
