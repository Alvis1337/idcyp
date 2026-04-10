import { json } from '../../../_lib/auth.js';
import { normalizeItem } from '../../../_lib/normalize.js';

export async function onRequestGet({ params, env }) {
  try {
    const { token } = params;

    const link = await env.DB.prepare(
      "SELECT * FROM shared_links WHERE share_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
    ).bind(token).first();

    if (!link) return json({ error: 'Share link not found or expired' }, 404);

    await env.DB.prepare(
      'UPDATE shared_links SET view_count = view_count + 1 WHERE share_token = ?'
    ).bind(token).run();

    const item = await env.DB.prepare(`
      SELECT
        mi.*,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count,
        IFNULL(
          (SELECT json_group_array(json_object('id', r.id, 'instructions', r.instructions, 'step_number', r.step_number))
           FROM recipes r WHERE r.menu_item_id = mi.id ORDER BY r.step_number),
          '[]'
        ) as recipes,
        IFNULL(
          (SELECT json_group_array(json_object('id', i.id, 'name', i.name, 'quantity', mii.quantity, 'unit', mii.unit, 'notes', mii.notes))
           FROM menu_item_ingredients mii JOIN ingredients i ON mii.ingredient_id = i.id WHERE mii.menu_item_id = mi.id),
          '[]'
        ) as ingredients,
        IFNULL(
          (SELECT json_group_array(json_object('id', t.id, 'name', t.name))
           FROM menu_item_tags mit2 JOIN tags t ON mit2.tag_id = t.id WHERE mit2.menu_item_id = mi.id),
          '[]'
        ) as tags
      FROM menu_items mi
      LEFT JOIN ratings rat ON mi.id = rat.menu_item_id
      WHERE mi.id = ?
      GROUP BY mi.id
    `).bind(link.menu_item_id).first();

    if (!item) return json({ error: 'Menu item not found' }, 404);
    return json(normalizeItem(item));
  } catch (error) {
    console.error('Error fetching shared item:', error);
    return json({ error: 'Failed to fetch shared item' }, 500);
  }
}
