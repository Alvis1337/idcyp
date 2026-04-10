import { requireAuth, json } from '../../_lib/auth.js';
import { normalizeItem, normalizeItems } from '../../_lib/normalize.js';

export async function onRequestGet({ request, env, data }) {
  try {
    const url = new URL(request.url);
    const { category, search, favorites } = Object.fromEntries(url.searchParams);
    const user = data.user;
    const userId = user?.id;
    const activeGroupId = user?.active_group_id;

    let query = `
      SELECT
        mi.*,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count,
        IFNULL(
          (SELECT json_group_array(json_object('id', t.id, 'name', t.name))
           FROM menu_item_tags mit2
           JOIN tags t ON mit2.tag_id = t.id
           WHERE mit2.menu_item_id = mi.id),
          '[]'
        ) as tags
      FROM menu_items mi
      LEFT JOIN ratings rat ON mi.id = rat.menu_item_id
      WHERE 1=1
    `;

    const params = [];

    if (activeGroupId) {
      query += ' AND mi.group_id = ?';
      params.push(activeGroupId);
    } else if (userId) {
      query += ' AND mi.user_id = ?';
      params.push(userId);
    } else {
      // Not logged in — return empty
      return json([]);
    }

    if (category) {
      query += ' AND mi.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (LOWER(mi.name) LIKE LOWER(?) OR LOWER(mi.description) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (favorites && userId) {
      query += ' AND mi.is_favorite = 1';
    }

    query += ' GROUP BY mi.id ORDER BY mi.category, mi.name';

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();
    return json(normalizeItems(result.results));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return json({ error: 'Failed to fetch menu items' }, 500);
  }
}

export async function onRequestPost({ request, env, data }) {
  const authError = requireAuth(data.user);
  if (authError) return authError;

  try {
    const {
      name, description, category, price, image_url, contributor,
      prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type,
      recipes, ingredients, tags,
    } = await request.json();

    if (!name || !name.trim()) return json({ error: 'Name is required' }, 400);
    if (!category || !category.trim()) return json({ error: 'Category is required' }, 400);

    const userId = data.user.id;
    const groupId = data.user.active_group_id;

    // Insert menu item
    const menuItem = await env.DB.prepare(
      `INSERT INTO menu_items (
        name, description, category, price, image_url, contributor,
        prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, user_id, group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(
      name, description, category, price ?? null, image_url ?? null, contributor ?? null,
      prep_time_minutes ?? null, cook_time_minutes ?? null, servings ?? 4,
      difficulty ?? null, cuisine_type ?? null, userId, groupId ?? null
    ).first();

    const menuItemId = menuItem.id;

    // Insert recipes
    if (recipes?.length) {
      for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].instructions?.trim()) {
          await env.DB.prepare(
            'INSERT INTO recipes (menu_item_id, instructions, step_number) VALUES (?, ?, ?)'
          ).bind(menuItemId, recipes[i].instructions, i + 1).run();
        }
      }
    }

    // Insert ingredients (get-or-create pattern)
    if (ingredients?.length) {
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
        ).bind(menuItemId, ingredient.id, ing.quantity ?? null, ing.unit ?? null, ing.notes ?? null).run();
      }
    }

    // Insert tags (get-or-create pattern)
    if (tags?.length) {
      for (const tagName of tags) {
        if (!tagName?.trim()) continue;
        await env.DB.prepare(
          'INSERT OR IGNORE INTO tags (name) VALUES (?)'
        ).bind(tagName).run();

        const tag = await env.DB.prepare(
          'SELECT id FROM tags WHERE name = ?'
        ).bind(tagName).first();

        await env.DB.prepare(
          'INSERT OR IGNORE INTO menu_item_tags (menu_item_id, tag_id) VALUES (?, ?)'
        ).bind(menuItemId, tag.id).run();
      }
    }

    return json(normalizeItem(menuItem), 201);
  } catch (error) {
    console.error('Error creating menu item:', error);
    return json({ error: 'Failed to create menu item' }, 500);
  }
}
