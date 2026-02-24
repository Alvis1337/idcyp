import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

function generateInviteCode() {
  return crypto.randomBytes(6).toString('base64url');
}

// Create a new group
router.post('/', isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const inviteCode = generateInviteCode();
    const groupResult = await client.query(
      'INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), inviteCode, userId]
    );
    const group = groupResult.rows[0];

    // Add creator as owner
    await client.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [group.id, userId, 'owner']
    );

    // Set as active group if user doesn't have one
    await client.query(
      'UPDATE users SET active_group_id = $1 WHERE id = $2 AND active_group_id IS NULL',
      [group.id, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    client.release();
  }
});

// Get all groups the user belongs to
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get the user's active group info
router.get('/active', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT g.*, gm.role
       FROM users u
       JOIN groups g ON u.active_group_id = g.id
       JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active group:', error);
    res.status(500).json({ error: 'Failed to fetch active group' });
  }
});

// Switch active group
router.put('/active', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;

    // Verify membership
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    await pool.query(
      'UPDATE users SET active_group_id = $1 WHERE id = $2',
      [groupId, userId]
    );
    res.json({ message: 'Active group updated' });
  } catch (error) {
    console.error('Error switching group:', error);
    res.status(500).json({ error: 'Failed to switch group' });
  }
});

// Get members of a group
router.get('/:id/members', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify membership
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, gm.joined_at`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Regenerate invite code
router.post('/:id/invite', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const ownerCheck = await pool.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'owner'",
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only group owners can generate invite codes' });
    }

    const inviteCode = generateInviteCode();
    const result = await pool.query(
      'UPDATE groups SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
      [inviteCode, id]
    );
    res.json({ invite_code: result.rows[0].invite_code });
  } catch (error) {
    console.error('Error generating invite:', error);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Join a group via invite code
router.post('/join/:code', isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { code } = req.params;
    const userId = req.user.id;

    const groupResult = await client.query(
      'SELECT * FROM groups WHERE invite_code = $1',
      [code]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const group = groupResult.rows[0];

    // Check if already a member
    const existing = await client.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group.id, userId]
    );
    if (existing.rows.length > 0) {
      return res.json({ message: 'Already a member', group });
    }

    await client.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [group.id, userId, 'member']
    );

    // Set as active group if user doesn't have one
    await client.query(
      'UPDATE users SET active_group_id = $1 WHERE id = $2 AND active_group_id IS NULL',
      [group.id, userId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Joined group', group });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  } finally {
    client.release();
  }
});

// Remove a member (owner only) or leave group
router.delete('/:id/members/:memberId', isAuthenticated, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    const targetId = parseInt(memberId);

    if (targetId !== userId) {
      // Removing someone else — must be owner
      const ownerCheck = await pool.query(
        "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'owner'",
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only owners can remove members' });
      }
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, targetId]
    );

    // If they had this as active group, clear it
    await pool.query(
      'UPDATE users SET active_group_id = NULL WHERE id = $1 AND active_group_id = $2',
      [targetId, id]
    );

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
