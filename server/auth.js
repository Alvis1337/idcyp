import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.js';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3001'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        
        let user;
        if (result.rows.length === 0) {
          // Create new user
          result = await pool.query(
            `INSERT INTO users (google_id, email, name, avatar_url) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [
              profile.id,
              profile.emails[0].value,
              profile.displayName,
              profile.photos?.[0]?.value,
            ]
          );
          user = result.rows[0];
        } else {
          // Update existing user
          result = await pool.query(
            `UPDATE users 
             SET name = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE google_id = $3 
             RETURNING *`,
            [profile.displayName, profile.photos?.[0]?.value, profile.id]
          );
          user = result.rows[0];
        }
        
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
