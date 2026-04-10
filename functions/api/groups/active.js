import { requireAuth, json } from '../../_lib/auth.js';

export async function onRequestGet({ env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const userId = data.user.id;
    const result = await env.DB.prepare(`
      SELECT g.*, gm.role
      FROM users u
      JOIN groups g ON u.active_group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = u.id
      WHERE u.id = ?
    `).bind(userId).first();

    return json(result ?? null);
  } catch (error) {
    console.error('Error fetching active group:', error);
    return json({ error: 'Failed to fetch active group' }, 500);
  }
}

export async function onRequestPut({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { groupId } = await request.json();
    const userId = data.user.id;

    const member = await env.DB.prepare(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(groupId, userId).first();

    if (!member) return json({ error: 'You are not a member of this group' }, 403);

    await env.DB.prepare(
      'UPDATE users SET active_group_id = ? WHERE id = ?'
    ).bind(groupId, userId).run();

    return json({ message: 'Active group updated' });
  } catch (error) {
    console.error('Error switching group:', error);
    return json({ error: 'Failed to switch group' }, 500);
  }
}
