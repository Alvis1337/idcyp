import { requireAuth, json } from '../../../../_lib/auth.js';

export async function onRequestDelete({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id, memberId } = params;
    const userId = data.user.id;
    const targetId = parseInt(memberId);

    if (targetId !== userId) {
      const owner = await env.DB.prepare(
        "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'owner'"
      ).bind(id, userId).first();
      if (!owner) return json({ error: 'Only owners can remove members' }, 403);
    }

    await env.DB.prepare(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(id, targetId).run();

    await env.DB.prepare(
      'UPDATE users SET active_group_id = NULL WHERE id = ? AND active_group_id = ?'
    ).bind(targetId, id).run();

    return json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    return json({ error: 'Failed to remove member' }, 500);
  }
}
