import { requireAuth, json } from '../../_lib/auth.js';

export async function onRequestGet({ env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const userId = data.user.id;
    const result = await env.DB.prepare(`
      SELECT sl.*,
        (SELECT COUNT(*) FROM shopping_list_items sli WHERE sli.shopping_list_id = sl.id) as item_count,
        (SELECT COUNT(*) FROM shopping_list_items sli WHERE sli.shopping_list_id = sl.id AND sli.checked = 1) as checked_count
      FROM shopping_lists sl
      WHERE sl.user_id = ?
      ORDER BY sl.created_at DESC
    `).bind(userId).all();

    return json(result.results);
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    return json({ error: 'Failed to fetch shopping lists' }, 500);
  }
}
