import { json } from '../../../_lib/auth.js';

export async function onRequestGet({ params, env }) {
  try {
    const { menuItemId } = params;

    const result = await env.DB.prepare(
      `SELECT id, share_token, created_at, expires_at, view_count
       FROM shared_links
       WHERE menu_item_id = ?
       ORDER BY created_at DESC`
    ).bind(menuItemId).all();

    const shares = result.results.map(share => ({
      ...share,
      shareUrl: `${env.CLIENT_URL}/shared/${share.share_token}`,
    }));

    return json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return json({ error: 'Failed to fetch shares' }, 500);
  }
}
