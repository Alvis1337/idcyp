import { requireAuth, json } from '../../../../_lib/auth.js';
import { normalizeItem } from '../../../../_lib/normalize.js';

export async function onRequestPost({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const updated = await env.DB.prepare(
      'UPDATE menu_items SET is_favorite = 1 - is_favorite WHERE id = ? RETURNING *'
    ).bind(id).first();

    if (!updated) return json({ error: 'Menu item not found' }, 404);
    return json(normalizeItem(updated));
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return json({ error: 'Failed to toggle favorite' }, 500);
  }
}
