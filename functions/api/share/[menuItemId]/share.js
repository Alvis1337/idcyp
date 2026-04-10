import { json } from '../../../_lib/auth.js';

export async function onRequestPost({ request, params, env, data }) {
  try {
    const { menuItemId } = params;
    const { expiresInDays } = await request.json();
    const userId = data.user?.id ?? null;

    const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          .toISOString().replace('T', ' ').split('.')[0]
      : null;

    const result = await env.DB.prepare(
      'INSERT INTO shared_links (menu_item_id, share_token, created_by, expires_at) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(menuItemId, shareToken, userId, expiresAt).first();

    const shareUrl = `${env.CLIENT_URL}/shared/${shareToken}`;
    return json({ ...result, shareUrl }, 201);
  } catch (error) {
    console.error('Error creating share link:', error);
    return json({ error: 'Failed to create share link' }, 500);
  }
}
