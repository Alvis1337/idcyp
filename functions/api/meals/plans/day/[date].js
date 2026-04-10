import { requireAuth, json } from '../../../../_lib/auth.js';
import { normalizeBool } from '../../../../_lib/normalize.js';

export async function onRequestGet({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { date } = params;
    const userId = data.user.id;

    const result = await env.DB.prepare(`
      SELECT mp.*, mi.name as meal_name, mi.image_url, mi.category, mi.prep_time_minutes, mi.cook_time_minutes
      FROM meal_plans mp
      JOIN menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.user_id = ? AND mp.planned_date = ?
      ORDER BY mp.meal_type
    `).bind(userId, date).all();

    return json(result.results.map(r => normalizeBool(r, 'completed')));
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return json({ error: 'Failed to fetch meal plan' }, 500);
  }
}
