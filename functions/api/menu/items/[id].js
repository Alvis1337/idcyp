import { requireAuth, json } from '../../../_lib/auth.js';
import { normalizeItem } from '../../../_lib/normalize.js';

export async function onRequestGet({ params, env }) {
  try {
    const { id } = params;

    const item = await env.DB.prepare(`
      SELECT
        mi.*,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(rat.id) as rating_count,
        IFNULL(
          (SELECT json_group_array(json_object('id', r.id, 'instructions', r.instructions, 'step_number', r.step_number))
           FROM recipes r WHERE r.menu_item_id = mi.id ORDER BY r.step_number),
          '[]'
        ) as recipes,
        IFNULL(
          (SELECT json_group_array(json_object('id', i.id, 'name', i.name, 'category', i.category, 'quantity', mii.quantity, 'unit', mii.unit, 'notes', mii.notes))
           FROM menu_item_ingredients mii JOIN ingredients i ON mii.ingredient_id = i.id WHERE mii.menu_item_id = mi.id),
          '[]'
        ) as ingredients,
        IFNULL(
          (SELECT json_group_array(json_object('id', t.id, 'name', t.name))
           FROM menu_item_tags mit2 JOIN tags t ON mit2.tag_id = t.id WHERE mit2.menu_item_id = mi.id),
          '[]'
        ) as tags,
        IFNULL(
          (SELECT json_group_array(json_object('id', rat2.id, 'rating', rat2.rating, 'review', rat2.review, 'user_name', u.name, 'created_at', rat2.created_at))
           FROM ratings rat2 LEFT JOIN users u ON rat2.user_id = u.id WHERE rat2.menu_item_id = mi.id),
          '[]'
        ) as reviews
      FROM menu_items mi
      LEFT JOIN ratings rat ON mi.id = rat.menu_item_id
      WHERE mi.id = ?
      GROUP BY mi.id
    `).bind(id).first();

    if (!item) return json({ error: 'Menu item not found' }, 404);
    return json(normalizeItem(item));
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return json({ error: 'Failed to fetch menu item' }, 500);
  }
}

export async function onRequestPut({ request, params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const {
      name, description, category, price, image_url, contributor,
      prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, is_favorite,
      recipes, ingredients, tags,
    } = await request.json();

    const updated = await env.DB.prepare(
      `UPDATE menu_items
       SET name = ?, description = ?, category = ?, price = ?,
           image_url = ?, contributor = ?, prep_time_minutes = ?,
           cook_time_minutes = ?, servings = ?, difficulty = ?,
           cuisine_type = ?, is_favorite = COALESCE(?, is_favorite), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? RETURNING *`
    ).bind(
      name, description, category, price ?? null,
      image_url ?? null, contributor ?? null, prep_time_minutes ?? null,
      cook_time_minutes ?? null, servings ?? null, difficulty ?? null,
      cuisine_type ?? null,
      is_favorite != null ? (is_favorite ? 1 : 0) : null,
      id
    ).first();

    if (!updated) return json({ error: 'Menu item not found' }, 404);

    // Update recipes if provided
    if (recipes !== undefined) {
      await env.DB.prepare('DELETE FROM recipes WHERE menu_item_id = ?').bind(id).run();
      for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].instructions?.trim()) {
          await env.DB.prepare(
            'INSERT INTO recipes (menu_item_id, instructions, step_number) VALUES (?, ?, ?)'
          ).bind(id, recipes[i].instructions, i + 1).run();
        }
      }
    }

    // Update ingredients if provided
    if (ingredients !== undefined) {
      await env.DB.prepare('DELETE FROM menu_item_ingredients WHERE menu_item_id = ?').bind(id).run();
      for (const ing of ingredients) {
        if (!ing.name?.trim()) continue;
        await env.DB.prepare(
          'INSERT OR IGNORE INTO ingredients (name, category) VALUES (?, ?)'
        ).bind(ing.name, ing.category || 'Other').run();

        const ingredient = await env.DB.prepare(
          'SELECT id FROM ingredients WHERE name = ?'
        ).bind(ing.name).first();

        await env.DB.prepare(
          'INSERT OR IGNORE INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, ingredient.id, ing.quantity ?? null, ing.unit ?? null, ing.notes ?? null).run();
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      await env.DB.prepare('DELETE FROM menu_item_tags WHERE menu_item_id = ?').bind(id).run();
      for (const tagName of tags) {
        if (!tagName?.trim()) continue;
        await env.DB.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(tagName).run();
        const tag = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
        await env.DB.prepare(
          'INSERT OR IGNORE INTO menu_item_tags (menu_item_id, tag_id) VALUES (?, ?)'
        ).bind(id, tag.id).run();
      }
    }

    return json(normalizeItem(updated));
  } catch (error) {
    console.error('Error updating menu item:', error);
    return json({ error: 'Failed to update menu item' }, 500);
  }
}

export async function onRequestDelete({ params, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const { id } = params;
    const deleted = await env.DB.prepare(
      'DELETE FROM menu_items WHERE id = ? RETURNING *'
    ).bind(id).first();

    if (!deleted) return json({ error: 'Menu item not found' }, 404);
    return json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return json({ error: 'Failed to delete menu item' }, 500);
  }
}
