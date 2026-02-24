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
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Check if user exists
        let result = await client.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        
        let user;
        if (result.rows.length === 0) {
          // Create new user
          result = await client.query(
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

          // Auto-create default group
          const crypto = await import('crypto');
          const inviteCode = crypto.randomBytes(6).toString('base64url');
          const groupResult = await client.query(
            "INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING id",
            [`${profile.displayName}'s Menu`, inviteCode, user.id]
          );
          const groupId = groupResult.rows[0].id;

          await client.query(
            "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')",
            [groupId, user.id]
          );

          await client.query(
            'UPDATE users SET active_group_id = $1 WHERE id = $2',
            [groupId, user.id]
          );
          user.active_group_id = groupId;
        } else {
          // Update existing user
          result = await client.query(
            `UPDATE users 
             SET name = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE google_id = $3 
             RETURNING *`,
            [profile.displayName, profile.photos?.[0]?.value, profile.id]
          );
          user = result.rows[0];

          // Ensure user has a group (migration path for existing users)
          if (!user.active_group_id) {
            const memberCheck = await client.query(
              'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
              [user.id]
            );
            if (memberCheck.rows.length > 0) {
              await client.query(
                'UPDATE users SET active_group_id = $1 WHERE id = $2',
                [memberCheck.rows[0].group_id, user.id]
              );
              user.active_group_id = memberCheck.rows[0].group_id;
            } else {
              // Create a default group for existing users without one
              const crypto = await import('crypto');
              const inviteCode = crypto.randomBytes(6).toString('base64url');
              const groupResult = await client.query(
                "INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING id",
                [`${user.name}'s Menu`, inviteCode, user.id]
              );
              const groupId = groupResult.rows[0].id;
              await client.query(
                "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')",
                [groupId, user.id]
              );
              await client.query(
                'UPDATE users SET active_group_id = $1 WHERE id = $2',
                [groupId, user.id]
              );
              user.active_group_id = groupId;
            }
          }
        }
        
        await client.query('COMMIT');
        done(null, user);
      } catch (error) {
        await client.query('ROLLBACK');
        done(error, null);
      } finally {
        client.release();
      }
    }
  )
);

export default passport;
