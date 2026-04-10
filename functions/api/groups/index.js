import { requireAuth, json, generateInviteCode } from '../../_lib/auth.js';

export async function onRequestGet({ env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const userId = data.user.id;
    const result = await env.DB.prepare(`
      SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at
    `).bind(userId).all();

    return json(result.results);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return json({ error: 'Failed to fetch groups' }, 500);
  }
}

export async function onRequestPost({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { name } = await request.json();
    const userId = data.user.id;

    if (!name?.trim()) return json({ error: 'Group name is required' }, 400);

    const inviteCode = generateInviteCode();
    const group = await env.DB.prepare(
      'INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?) RETURNING *'
    ).bind(name.trim(), inviteCode, userId).first();

    await env.DB.batch([
      env.DB.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(group.id, userId),
      env.DB.prepare('UPDATE users SET active_group_id = ? WHERE id = ? AND active_group_id IS NULL').bind(group.id, userId),
    ]);

    return json(group, 201);
  } catch (error) {
    console.error('Error creating group:', error);
    return json({ error: 'Failed to create group' }, 500);
  }
}
