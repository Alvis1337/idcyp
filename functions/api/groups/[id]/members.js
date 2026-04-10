import { requireAuth, json } from '../../../_lib/auth.js';

export async function onRequestGet({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const userId = data.user.id;

    const member = await env.DB.prepare(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!member) return json({ error: 'You are not a member of this group' }, 403);

    const result = await env.DB.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role DESC, gm.joined_at
    `).bind(id).all();

    return json(result.results);
  } catch (error) {
    console.error('Error fetching members:', error);
    return json({ error: 'Failed to fetch members' }, 500);
  }
}
