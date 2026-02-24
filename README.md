# 🍽️ Menu Collection

A full-stack meal planning platform for managing recipes, planning meals, and generating shopping lists. Built for you and your partner to collaborate on meal planning!

## ✨ Features

- 🔐 **Google OAuth** - Secure login with Google
- 🎨 **Dark/Light Mode** - Auto-detects system preference
- 📱 **Mobile-First** - Beautiful responsive design with bottom nav
- 📝 **Recipe Management** - Full recipes with ingredients, steps, and cooking details
- 📅 **Meal Planner** - Weekly calendar to plan all meals
- 🛒 **Shopping Lists** - Auto-generate from meal plans
- ⭐ **Ratings & Reviews** - Rate and review dishes
- ❤️ **Favorites** - Bookmark your favorite recipes
- 🔗 **Sharing** - Generate shareable links for recipes
- 🔍 **Search & Filter** - Find recipes easily

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Google OAuth credentials ([Get them here](https://console.cloud.google.com/))

### Setup (5 minutes)

1. **Get Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `http://localhost:3001/api/auth/google/callback`

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google OAuth credentials
   ```

3. **Launch**
   ```bash
   docker-compose up --build
   ```

4. **Access**
   - Open http://localhost:3001
   - Login with Google
   - Start adding recipes!

## 🛠️ Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Setup database
./setup-db.sh

# Start both frontend and backend
npm run dev:all

# Or start separately:
npm run dev          # Frontend only (port 5173)
npm run dev:server   # Backend only (port 3001)
```

### Docker Commands

```bash
# Start
docker-compose up

# Start in background
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up --build
```

## 🏗️ Tech Stack

**Frontend:** React 19, TypeScript, Material UI, Redux Toolkit, React Router  
**Backend:** Node.js, Express, PostgreSQL, Passport.js (OAuth)  
**DevOps:** Docker, Docker Compose

## 📊 Database

PostgreSQL database with 12 tables including:
- Users & authentication
- Menu items with recipes
- Ingredients & meal plans
- Shopping lists
- Ratings & reviews
- Shareable links

## 📁 Project Structure

```
├── server/          # Backend API
│   ├── index.js     # Express server
│   ├── db.js        # Database connection
│   ├── auth.js      # OAuth setup
│   ├── routes/      # API routes
│   └── schema.sql   # Database schema
├── src/             # Frontend React app
│   ├── components/  # UI components
│   ├── pages/       # Page views
│   ├── store/       # Redux state
│   ├── theme/       # Theme system
│   └── contexts/    # React contexts
└── docker-compose.yml
```

## 🔒 Security

- Google OAuth 2.0 authentication
- Session-based auth with secure cookies
- Environment-based secrets
- SQL injection prevention
- CORS protection

## 🌐 Environment Variables

Required in `.env`:

```env
# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Security (Generate with: openssl rand -hex 32)
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=menu_db
DB_PORT=5432

# Server
PORT=3001
CLIENT_URL=http://localhost:3001
```

## 📝 API Endpoints

- **Auth:** `/api/auth/google`, `/api/auth/me`, `/api/auth/logout`
- **Menu:** `/api/menu/items`, `/api/menu/items/:id`, `/api/menu/tags`
- **Meals:** `/api/meals/plans`, `/api/meals/plans/shopping-list`
- **Share:** `/api/share/:menuItemId/share`, `/api/share/shared/:token`

## 🐳 Deployment

Deploy to any cloud platform that supports Docker:
- AWS ECS/EC2
- DigitalOcean
- Google Cloud Run
- Heroku
- Any VPS with Docker

Update `CLIENT_URL` and Google OAuth redirect URIs for production.

## 🆘 Troubleshooting

**Can't login?**
- Check Google OAuth credentials in `.env`
- Verify redirect URI in Google Console

**Database connection error?**
```bash
docker-compose down
docker-compose up --build
```

**Port already in use?**
Change port in `docker-compose.yml` or `.env`

## 📄 License

Private project

---

Built with ❤️ for meal planning • Happy cooking! 👨‍🍳👩‍🍳
# idcyp
