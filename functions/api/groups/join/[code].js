import { requireAuth, json } from '../../../_lib/auth.js';

export async function onRequestPost({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { code } = params;
    const userId = data.user.id;

    const group = await env.DB.prepare(
      'SELECT * FROM groups WHERE invite_code = ?'
    ).bind(code).first();

    if (!group) return json({ error: 'Invalid invite code' }, 404);

    const existing = await env.DB.prepare(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(group.id, userId).first();

    if (existing) return json({ message: 'Already a member', group });

    await env.DB.batch([
      env.DB.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')").bind(group.id, userId),
      env.DB.prepare('UPDATE users SET active_group_id = ? WHERE id = ? AND active_group_id IS NULL').bind(group.id, userId),
    ]);

    return json({ message: 'Joined group', group });
  } catch (error) {
    console.error('Error joining group:', error);
    return json({ error: 'Failed to join group' }, 500);
  }
}
