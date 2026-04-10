import { requireAuth, json, generateInviteCode } from '../../../_lib/auth.js';

export async function onRequestPost({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const userId = data.user.id;

    const owner = await env.DB.prepare(
      "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'owner'"
    ).bind(id, userId).first();

    if (!owner) return json({ error: 'Only group owners can generate invite codes' }, 403);

    const inviteCode = generateInviteCode();
    const result = await env.DB.prepare(
      'UPDATE groups SET invite_code = ? WHERE id = ? RETURNING invite_code'
    ).bind(inviteCode, id).first();

    return json({ invite_code: result.invite_code });
  } catch (error) {
    console.error('Error generating invite:', error);
    return json({ error: 'Failed to generate invite code' }, 500);
  }
}
