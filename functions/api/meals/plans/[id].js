import { requireAuth, json } from '../../../_lib/auth.js';
import { normalizeBool } from '../../../_lib/normalize.js';

export async function onRequestPut({ request, params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const { menu_item_id, planned_date, meal_type, notes, completed } = await request.json();
    const userId = data.user.id;

    const result = await env.DB.prepare(
      `UPDATE meal_plans
       SET menu_item_id = ?, planned_date = ?, meal_type = ?, notes = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? RETURNING *`
    ).bind(
      menu_item_id, planned_date, meal_type, notes ?? null,
      completed ? 1 : 0, id, userId
    ).first();

    if (!result) return json({ error: 'Meal plan not found' }, 404);
    return json(normalizeBool(result, 'completed'));
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return json({ error: 'Failed to update meal plan' }, 500);
  }
}

export async function onRequestDelete({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const userId = data.user.id;

    const deleted = await env.DB.prepare(
      'DELETE FROM meal_plans WHERE id = ? AND user_id = ? RETURNING *'
    ).bind(id, userId).first();

    if (!deleted) return json({ error: 'Meal plan not found' }, 404);
    return json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return json({ error: 'Failed to delete meal plan' }, 500);
  }
}
