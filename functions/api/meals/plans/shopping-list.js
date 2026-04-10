import { requireAuth, json } from '../../../_lib/auth.js';

export async function onRequestPost({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { startDate, endDate, name } = await request.json();
    const userId = data.user.id;

    const list = await env.DB.prepare(
      'INSERT INTO shopping_lists (user_id, name) VALUES (?, ?) RETURNING *'
    ).bind(userId, name || `Shopping List ${new Date().toLocaleDateString()}`).first();

    const ingredients = await env.DB.prepare(`
      SELECT mii.ingredient_id, i.name, SUM(mii.quantity) as total_quantity, mii.unit
      FROM meal_plans mp
      JOIN menu_item_ingredients mii ON mp.menu_item_id = mii.menu_item_id
      JOIN ingredients i ON mii.ingredient_id = i.id
      WHERE mp.user_id = ? AND mp.planned_date >= ? AND mp.planned_date <= ?
      GROUP BY mii.ingredient_id, i.name, mii.unit
    `).bind(userId, startDate, endDate).all();

    for (const ing of ingredients.results) {
      await env.DB.prepare(
        'INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)'
      ).bind(list.id, ing.ingredient_id, ing.total_quantity, ing.unit).run();
    }

    return json(list, 201);
  } catch (error) {
    console.error('Error generating shopping list:', error);
    return json({ error: 'Failed to generate shopping list' }, 500);
  }
}
