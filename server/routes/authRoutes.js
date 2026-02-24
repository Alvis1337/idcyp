import express from 'express';
import passport from '../auth.js';
import pool from '../db.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    console.log('OAuth callback - User authenticated:', req.user);
    console.log('Session ID:', req.sessionID);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
    res.redirect(clientUrl);
  }
);

// Get current user
router.get('/me', (req, res) => {
  console.log('Auth check - isAuthenticated:', req.isAuthenticated());
  console.log('Session:', req.session);
  console.log('User:', req.user);
  
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Update user preferences
router.patch('/preferences', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { theme_preference } = req.body;
    const result = await pool.query(
      'UPDATE users SET theme_preference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [theme_preference, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
