import { requireAuth, json } from '../../_lib/auth.js';

export async function onRequestPatch({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { theme_preference } = await request.json();
    const user = await env.DB.prepare(
      'UPDATE users SET theme_preference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *'
    ).bind(theme_preference, data.user.id).first();
    return json(user);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return json({ error: 'Failed to update preferences' }, 500);
  }
}
