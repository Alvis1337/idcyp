import express from 'express';
import pool from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Create shareable link
router.post('/:menuItemId/share', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { expiresInDays } = req.body;
    const userId = req.user?.id;

    const shareToken = nanoid(16);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO shared_links (menu_item_id, share_token, created_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [menuItemId, shareToken, userId, expiresAt]
    );

    const shareUrl = `${process.env.CLIENT_URL}/shared/${shareToken}`;
    res.status(201).json({ ...result.rows[0], shareUrl });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get shared menu item
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Check if link exists and is valid
    const linkCheck = await pool.query(
      `SELECT * FROM shared_links 
       WHERE share_token = $1 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [token]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }

    // Increment view count
    await pool.query(
      'UPDATE shared_links SET view_count = view_count + 1 WHERE share_token = $1',
      [token]
    );

    // Get menu item with full details
    const query = `
      SELECT 
        mi.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', r.id,
          'instructions', r.instructions,
          'step_number', r.step_number
        )) FILTER (WHERE r.id IS NOT NULL), '[]') as recipes,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'quantity', mii.quantity,
          'unit', mii.unit,
          'notes', mii.notes
        )) FILTER (WHERE i.id IS NOT NULL), '[]') as ingredients,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', t.id,
          'name', t.name
        )) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count
      FROM menu_items mi
      LEFT JOIN recipes r ON mi.id = r.menu_item_id
      LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
      LEFT JOIN ingredients i ON mii.ingredient_id = i.id
      LEFT JOIN menu_item_tags mit ON mi.id = mit.menu_item_id
      LEFT JOIN tags t ON mit.tag_id = t.id
      LEFT JOIN ratings rat ON mi.id = rat.menu_item_id
      WHERE mi.id = $1
      GROUP BY mi.id
    `;

    const result = await pool.query(query, [linkCheck.rows[0].menu_item_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching shared item:', error);
    res.status(500).json({ error: 'Failed to fetch shared item' });
  }
});

// Get all shares for a menu item
router.get('/:menuItemId/shares', async (req, res) => {
  try {
    const { menuItemId } = req.params;

    const result = await pool.query(
      `SELECT id, share_token, created_at, expires_at, view_count
       FROM shared_links
       WHERE menu_item_id = $1
       ORDER BY created_at DESC`,
      [menuItemId]
    );

    const shares = result.rows.map(share => ({
      ...share,
      shareUrl: `${process.env.CLIENT_URL}/shared/${share.share_token}`,
    }));

    res.json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// Delete share link
router.delete('/shares/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user?.id;

    const result = await pool.query(
      'DELETE FROM shared_links WHERE id = $1 AND (created_by = $2 OR $2 IS NULL) RETURNING *',
      [shareId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    res.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('Error deleting share link:', error);
    res.status(500).json({ error: 'Failed to delete share link' });
  }
});

export default router;
