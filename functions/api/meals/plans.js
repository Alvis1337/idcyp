import { requireAuth, json } from '../../_lib/auth.js';
import { normalizeBool } from '../../_lib/normalize.js';

export async function onRequestGet({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = data.user.id;

    const result = await env.DB.prepare(`
      SELECT mp.*, mi.name as meal_name, mi.image_url, mi.category
      FROM meal_plans mp
      JOIN menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.user_id = ? AND mp.planned_date >= ? AND mp.planned_date <= ?
      ORDER BY mp.planned_date, mp.meal_type
    `).bind(userId, startDate, endDate).all();

    return json(result.results.map(r => normalizeBool(r, 'completed')));
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return json({ error: 'Failed to fetch meal plans' }, 500);
  }
}

export async function onRequestPost({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { menu_item_id, planned_date, meal_type, notes } = await request.json();
    const userId = data.user.id;

    const inserted = await env.DB.prepare(
      'INSERT INTO meal_plans (user_id, menu_item_id, planned_date, meal_type, notes) VALUES (?, ?, ?, ?, ?) RETURNING id'
    ).bind(userId, menu_item_id, planned_date, meal_type, notes ?? null).first();

    const result = await env.DB.prepare(`
      SELECT mp.*, mi.name as meal_name, mi.image_url, mi.category
      FROM meal_plans mp
      JOIN menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.id = ?
    `).bind(inserted.id).first();

    return json(normalizeBool(result, 'completed'), 201);
  } catch (error) {
    console.error('Error adding meal plan:', error);
    return json({ error: 'Failed to add meal plan' }, 500);
  }
}
