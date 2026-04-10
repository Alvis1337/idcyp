import { requireAuth, json } from '../../../_lib/auth.js';
import { normalizeBool } from '../../../_lib/normalize.js';

export async function onRequestGet({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const userId = data.user.id;

    const list = await env.DB.prepare(
      'SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!list) return json({ error: 'Shopping list not found' }, 404);

    const items = await env.DB.prepare(`
      SELECT sli.*, i.name as ingredient_name, i.category as ingredient_category
      FROM shopping_list_items sli
      JOIN ingredients i ON sli.ingredient_id = i.id
      WHERE sli.shopping_list_id = ?
      ORDER BY i.category, i.name
    `).bind(id).all();

    return json({
      ...list,
      items: items.results.map(r => normalizeBool(r, 'checked')),
    });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return json({ error: 'Failed to fetch shopping list' }, 500);
  }
}

export async function onRequestDelete({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const userId = data.user.id;

    const deleted = await env.DB.prepare(
      'DELETE FROM shopping_lists WHERE id = ? AND user_id = ? RETURNING *'
    ).bind(id, userId).first();

    if (!deleted) return json({ error: 'Shopping list not found' }, 404);
    return json({ message: 'Shopping list deleted' });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    return json({ error: 'Failed to delete shopping list' }, 500);
  }
}
