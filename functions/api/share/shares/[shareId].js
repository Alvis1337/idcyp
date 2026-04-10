import { json } from '../../../_lib/auth.js';

export async function onRequestDelete({ params, env, data }) {
  try {
    const { shareId } = params;
    const userId = data.user?.id ?? null;

    const deleted = await env.DB.prepare(
      'DELETE FROM shared_links WHERE id = ? AND (created_by = ? OR ? IS NULL) RETURNING *'
    ).bind(shareId, userId, userId).first();

    if (!deleted) return json({ error: 'Share link not found' }, 404);
    return json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('Error deleting share link:', error);
    return json({ error: 'Failed to delete share link' }, 500);
  }
}
