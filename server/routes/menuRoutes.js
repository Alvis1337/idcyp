import express from 'express';
import pool from '../db.js';
import { optionalAuth, isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Get all menu items with aggregated data
router.get('/items', optionalAuth, async (req, res) => {
  try {
    const { category, search, tags, favorites } = req.query;
    const userId = req.user?.id;
    const activeGroupId = req.user?.active_group_id;

    let query = `
      SELECT 
        mi.*,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', t.id,
          'name', t.name
        )) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM menu_items mi
      LEFT JOIN ratings rat ON mi.id = rat.menu_item_id
      LEFT JOIN menu_item_tags mit ON mi.id = mit.menu_item_id
      LEFT JOIN tags t ON mit.tag_id = t.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Scope to active group, or user's own items, or all if not logged in
    if (activeGroupId) {
      query += ` AND mi.group_id = $${++paramCount}`;
      params.push(activeGroupId);
    } else if (userId) {
      query += ` AND mi.user_id = $${++paramCount}`;
      params.push(userId);
    }

    if (category) {
      paramCount++;
      query += ` AND mi.category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (favorites && userId) {
      query += ` AND mi.is_favorite = true`;
    }

    query += ` GROUP BY mi.id ORDER BY mi.category, mi.name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get a single menu item with full details
router.get('/items/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        mi.*,
        COALESCE(
          (SELECT json_agg(recipe_obj ORDER BY step_number)
           FROM (
             SELECT DISTINCT ON (r.id) 
               jsonb_build_object(
                 'id', r.id,
                 'instructions', r.instructions,
                 'step_number', r.step_number
               ) as recipe_obj,
               r.step_number
             FROM recipes r
             WHERE r.menu_item_id = mi.id
           ) recipes_sub
          ), '[]'
        ) as recipes,
        COALESCE(
          (SELECT json_agg(DISTINCT ingredient_obj)
           FROM (
             SELECT jsonb_build_object(
               'id', i.id,
               'name', i.name,
               'category', i.category,
               'quantity', mii.quantity,
               'unit', mii.unit,
               'notes', mii.notes
             ) as ingredient_obj
             FROM menu_item_ingredients mii
             INNER JOIN ingredients i ON mii.ingredient_id = i.id
             WHERE mii.menu_item_id = mi.id
           ) ingredients_sub
          ), '[]'
        ) as ingredients,
        COALESCE(
          (SELECT json_agg(DISTINCT tag_obj)
           FROM (
             SELECT jsonb_build_object(
               'id', t.id,
               'name', t.name
             ) as tag_obj
             FROM menu_item_tags mit
             INNER JOIN tags t ON mit.tag_id = t.id
             WHERE mit.menu_item_id = mi.id
           ) tags_sub
          ), '[]'
        ) as tags,
        COALESCE(
          (SELECT AVG(rating) FROM ratings WHERE menu_item_id = mi.id), 0
        ) as avg_rating,
        COALESCE(
          (SELECT COUNT(*) FROM ratings WHERE menu_item_id = mi.id), 0
        ) as rating_count,
        COALESCE(
          (SELECT json_agg(review_obj)
           FROM (
             SELECT DISTINCT ON (rat.id) jsonb_build_object(
               'id', rat.id,
               'rating', rat.rating,
               'review', rat.review,
               'user_name', u.name,
               'created_at', rat.created_at
             ) as review_obj
             FROM ratings rat
             LEFT JOIN users u ON rat.user_id = u.id
             WHERE rat.menu_item_id = mi.id
           ) reviews_sub
          ), '[]'
        ) as reviews
      FROM menu_items mi
      WHERE mi.id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create a new menu item
router.post('/items', isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { 
      name, description, category, price, image_url, contributor,
      prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type,
      recipes, ingredients, tags 
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    const userId = req.user.id;
    const groupId = req.user.active_group_id;

    // Insert menu item
    const menuResult = await client.query(
      `INSERT INTO menu_items (
        name, description, category, price, image_url, contributor,
        prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, user_id, group_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [name, description, category, price, image_url, contributor,
       prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, userId, groupId]
    );
    
    const menuItemId = menuResult.rows[0].id;

    // Insert recipes
    if (recipes && recipes.length > 0) {
      for (let i = 0; i < recipes.length; i++) {
        await client.query(
          'INSERT INTO recipes (menu_item_id, instructions, step_number) VALUES ($1, $2, $3)',
          [menuItemId, recipes[i].instructions, i + 1]
        );
      }
    }

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        // Get or create ingredient
        let ingredientResult = await client.query(
          'SELECT id FROM ingredients WHERE name = $1',
          [ing.name]
        );

        let ingredientId;
        if (ingredientResult.rows.length === 0) {
          const newIng = await client.query(
            'INSERT INTO ingredients (name, category) VALUES ($1, $2) RETURNING id',
            [ing.name, ing.category || 'Other']
          );
          ingredientId = newIng.rows[0].id;
        } else {
          ingredientId = ingredientResult.rows[0].id;
        }

        // Link ingredient to menu item
        await client.query(
          'INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
          [menuItemId, ingredientId, ing.quantity, ing.unit, ing.notes]
        );
      }
    }

    // Insert tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        let tagResult = await client.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await client.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        // Link tag to menu item
        await client.query(
          'INSERT INTO menu_item_tags (menu_item_id, tag_id) VALUES ($1, $2)',
          [menuItemId, tagId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch the complete item
    const completeItem = await pool.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [menuItemId]
    );

    res.status(201).json(completeItem.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  } finally {
    client.release();
  }
});

// Update a menu item
router.put('/items/:id', isAuthenticated, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { 
      name, description, category, price, image_url, contributor,
      prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, is_favorite,
      recipes, ingredients, tags
    } = req.body;
    
    const result = await client.query(
      `UPDATE menu_items 
       SET name = $1, description = $2, category = $3, price = $4, 
           image_url = $5, contributor = $6, prep_time_minutes = $7,
           cook_time_minutes = $8, servings = $9, difficulty = $10,
           cuisine_type = $11, is_favorite = COALESCE($12, is_favorite), updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 
       RETURNING *`,
      [name, description, category, price, image_url, contributor,
       prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, is_favorite, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update recipes if provided
    if (recipes !== undefined) {
      await client.query('DELETE FROM recipes WHERE menu_item_id = $1', [id]);
      for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].instructions && recipes[i].instructions.trim()) {
          await client.query(
            'INSERT INTO recipes (menu_item_id, instructions, step_number) VALUES ($1, $2, $3)',
            [id, recipes[i].instructions, i + 1]
          );
        }
      }
    }

    // Update ingredients if provided
    if (ingredients !== undefined) {
      await client.query('DELETE FROM menu_item_ingredients WHERE menu_item_id = $1', [id]);
      for (const ing of ingredients) {
        if (!ing.name || !ing.name.trim()) continue;
        let ingredientResult = await client.query(
          'SELECT id FROM ingredients WHERE name = $1',
          [ing.name]
        );

        let ingredientId;
        if (ingredientResult.rows.length === 0) {
          const newIng = await client.query(
            'INSERT INTO ingredients (name, category) VALUES ($1, $2) RETURNING id',
            [ing.name, ing.category || 'Other']
          );
          ingredientId = newIng.rows[0].id;
        } else {
          ingredientId = ingredientResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
          [id, ingredientId, ing.quantity, ing.unit, ing.notes]
        );
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      await client.query('DELETE FROM menu_item_tags WHERE menu_item_id = $1', [id]);
      for (const tagName of tags) {
        if (!tagName || !tagName.trim()) continue;
        let tagResult = await client.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await client.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO menu_item_tags (menu_item_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  } finally {
    client.release();
  }
});

// Delete a menu item
router.delete('/items/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Toggle favorite
router.post('/items/:id/favorite', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE menu_items SET is_favorite = NOT is_favorite WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Add rating/review
router.post('/items/:id/rating', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO ratings (menu_item_id, user_id, rating, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (menu_item_id, user_id) 
       DO UPDATE SET rating = $3, review = $4, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, userId, rating, review]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

// Get all tags
router.get('/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get all ingredients
router.get('/ingredients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

export default router;
