# Authentication Setup Guide

## Current Status
The authentication system has been updated to fix session/cookie issues. Here's what was changed:

## Changes Made

### 1. Fixed API URL Configuration
- Changed all API base URLs from `http://localhost:3001/api` to `/api` (relative URLs)
- This ensures cookies work properly in production since everything is served from the same origin
- Files updated:
  - `src/contexts/AuthContext.tsx`
  - `src/store/menuSlice.ts`
  - `src/store/mealPlanSlice.ts`
  - `src/pages/SharedMenuItem.tsx`

### 2. Fixed Session Configuration
- Changed `secure: false` for cookies (since we're not using HTTPS locally)
- Added `sameSite: 'lax'` to support OAuth flows
- File: `server/index.js`

### 3. Fixed OAuth Callback URL
- Changed from relative `/api/auth/google/callback` to absolute URL
- Now uses: `http://localhost:3001/api/auth/google/callback`
- File: `server/auth.js`

### 4. Added Debug Logging
- Added logging to `/api/auth/me` endpoint
- Added logging to OAuth callback
- File: `server/routes/authRoutes.js`

## Google OAuth Configuration Required

**IMPORTANT:** You need to configure the following redirect URI in your Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID: `494200746129-2iqk9etfaj3tq2p4egacacgkt2fd5ujc`
3. Add this **Authorized redirect URI**:
   ```
   http://localhost:3001/api/auth/google/callback
   ```

### Current Google OAuth Settings
- **Client ID**: `494200746129-2iqk9etfaj3tq2p4egacacgkt2fd5ujc`
- **Client Secret**: `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`

## Testing the Fix

1. Open your browser to: http://localhost:3001
2. Click "Sign in with Google"
3. Complete the Google OAuth flow
4. Check the Docker logs for authentication info:
   ```bash
   docker-compose logs -f app
   ```

## Troubleshooting

### If login still doesn't work:

1. **Check Google Cloud Console**
   - Verify the redirect URI is exactly: `http://localhost:3001/api/auth/google/callback`
   - Make sure the OAuth consent screen is configured
   - Ensure your email is added as a test user (if the app is in testing mode)

2. **Check Docker logs**
   ```bash
   docker-compose logs -f app
   ```
   Look for:
   - "OAuth callback - User authenticated: ..."
   - "Auth check - isAuthenticated: true"

3. **Check browser console**
   - Open DevTools (F12)
   - Look for errors in the Console tab
   - Check the Network tab for failed requests

4. **Clear browser data**
   - Clear cookies for localhost:3001
   - Try in an incognito window

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - The redirect URI in Google Console doesn't match
   - Make sure it's: `http://localhost:3001/api/auth/google/callback`

2. **401 Unauthorized on /api/auth/me**
   - Session cookie not being set/sent
   - Check Docker logs for session information
   - Verify cookies are enabled in browser

3. **App redirects to wrong port**
   - Fixed! Was redirecting to 5173, now stays on 3001

## Next Steps

After confirming authentication works:
1. Set up proper session store (Redis/PostgreSQL) for production
2. Generate secure SESSION_SECRET and JWT_SECRET values
3. Configure HTTPS for production deployment
4. Add environment variables for production CLIENT_URL
