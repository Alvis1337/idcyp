import { requireAuth, json } from '../../../../../_lib/auth.js';
import { normalizeBool } from '../../../../../_lib/normalize.js';

export async function onRequestPatch({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id: listId, itemId } = params;
    const userId = data.user.id;

    const list = await env.DB.prepare(
      'SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?'
    ).bind(listId, userId).first();

    if (!list) return json({ error: 'Shopping list not found' }, 404);

    const result = await env.DB.prepare(
      'UPDATE shopping_list_items SET checked = 1 - checked WHERE id = ? AND shopping_list_id = ? RETURNING *'
    ).bind(itemId, listId).first();

    if (!result) return json({ error: 'Item not found' }, 404);
    return json(normalizeBool(result, 'checked'));
  } catch (error) {
    console.error('Error toggling item:', error);
    return json({ error: 'Failed to toggle item' }, 500);
  }
}
