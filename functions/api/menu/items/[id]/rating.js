import { requireAuth, json } from '../../../../_lib/auth.js';

export async function onRequestPost({ request, params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const { rating, review } = await request.json();
    const userId = data.user.id;

    const result = await env.DB.prepare(
      `INSERT INTO ratings (menu_item_id, user_id, rating, review)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (menu_item_id, user_id)
       DO UPDATE SET rating = excluded.rating, review = excluded.review, created_at = CURRENT_TIMESTAMP
       RETURNING *`
    ).bind(id, userId, rating, review ?? null).first();

    return json(result, 201);
  } catch (error) {
    console.error('Error adding rating:', error);
    return json({ error: 'Failed to add rating' }, 500);
  }
}
