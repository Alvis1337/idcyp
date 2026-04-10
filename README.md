# idcyp — Menu Collection

A full-stack meal planning app for managing recipes, planning meals, and generating shopping lists. Built to collaborate with your partner on meal planning.

**Live:** [menu.chrisalvis.me](https://menu.chrisalvis.me)

## Features

- Google OAuth login
- Recipe management — ingredients, steps, cooking details
- Weekly meal planner
- Auto-generated shopping lists from meal plans
- Ratings & reviews
- Favorites
- Shareable recipe links
- Search & filter
- Dark / light / system theme

## Tech Stack

**Frontend:** React 19, TypeScript, Material UI, Redux Toolkit  
**Backend:** Cloudflare Pages Functions (serverless)  
**Database:** Cloudflare D1 (SQLite)  
**Auth:** Google OAuth 2.0 (session-based, stored in D1)  
**Deploy:** GitHub Actions → Cloudflare Pages on push to `main`

## Local Development

```bash
npm install

# Build frontend first (required before running Pages dev)
npm run build

# Apply D1 schema locally (first time only)
npx wrangler d1 execute idcyp-db --local --file=schema.d1.sql

# Run Vite dev server + Wrangler Pages Functions concurrently
npm run dev:all
```

Vite runs on port 5173 and proxies `/api/*` to Wrangler on port 8788.

Create a `.dev.vars` file for local secrets:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=any-random-string
CLIENT_URL=http://localhost:8788
```

Add `http://localhost:8788/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console.

## Deployment

Push to `main` — GitHub Actions handles the rest.

To deploy manually:
```bash
npm run deploy
```

### First-time setup

```bash
npx wrangler d1 create idcyp-db
npx wrangler d1 execute idcyp-db --remote --file=schema.d1.sql
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name idcyp
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name idcyp
npx wrangler pages secret put SESSION_SECRET --project-name idcyp
npx wrangler pages secret put CLIENT_URL --project-name idcyp
```

## Project Structure

```
├── functions/           # Cloudflare Pages Functions (API)
│   ├── _middleware.js   # Session auth middleware
│   ├── _lib/            # Shared helpers (auth, cookies, normalize)
│   └── api/
│       ├── auth/        # Google OAuth, session, preferences
│       ├── menu/        # Menu items, tags, ingredients
│       ├── meals/       # Meal plans, shopping lists
│       ├── share/       # Shareable links
│       └── groups/      # Group management
├── src/                 # React frontend
│   ├── components/
│   ├── pages/
│   ├── store/           # Redux slices
│   ├── theme/
│   └── contexts/        # Auth context
├── schema.d1.sql        # D1 (SQLite) database schema
└── wrangler.toml        # Cloudflare configuration
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/google` | Start OAuth flow |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Logout |
| GET/POST | `/api/menu/items` | List / create items |
| GET/PUT/DELETE | `/api/menu/items/:id` | Single item |
| GET/POST | `/api/meals/plans` | Meal plans |
| GET/POST | `/api/groups` | Groups |
| POST | `/api/groups/join/:code` | Join via invite |
