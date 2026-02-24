import express from 'express';
import pool from '../db.js';
import { isAuthenticated, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get meal plans for a date range
router.get('/plans', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const query = `
      SELECT mp.*, mi.name as meal_name, mi.image_url, mi.category
      FROM meal_plans mp
      JOIN menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.user_id = $1 
        AND mp.planned_date >= $2 
        AND mp.planned_date <= $3
      ORDER BY mp.planned_date, mp.meal_type
    `;

    const result = await pool.query(query, [userId, startDate, endDate]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Get meal plan for a specific day
router.get('/plans/day/:date', isAuthenticated, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT mp.*, mi.name as meal_name, mi.image_url, mi.category, mi.prep_time_minutes, mi.cook_time_minutes
      FROM meal_plans mp
      JOIN menu_items mi ON mp.menu_item_id = mi.id
      WHERE mp.user_id = $1 AND mp.planned_date = $2
      ORDER BY mp.meal_type
    `;

    const result = await pool.query(query, [userId, date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

// Add meal to plan
router.post('/plans', isAuthenticated, async (req, res) => {
  try {
    const { menu_item_id, planned_date, meal_type, notes } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, menu_item_id, planned_date, meal_type, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, menu_item_id, planned_date, meal_type, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding meal plan:', error);
    res.status(500).json({ error: 'Failed to add meal plan' });
  }
});

// Update meal plan
router.put('/plans/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { menu_item_id, planned_date, meal_type, notes, completed } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE meal_plans 
       SET menu_item_id = $1, planned_date = $2, meal_type = $3, notes = $4, completed = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [menu_item_id, planned_date, meal_type, notes, completed, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meal plan:', error);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// Delete meal plan
router.delete('/plans/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// Generate shopping list from meal plans
router.post('/plans/shopping-list', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, name } = req.body;
    const userId = req.user.id;

    // Create shopping list
    const listResult = await pool.query(
      'INSERT INTO shopping_lists (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name || `Shopping List ${new Date().toLocaleDateString()}`]
    );

    const shoppingListId = listResult.rows[0].id;

    // Get all ingredients from meal plans in date range
    const ingredientsQuery = `
      SELECT DISTINCT mii.ingredient_id, i.name, SUM(mii.quantity) as total_quantity, mii.unit
      FROM meal_plans mp
      JOIN menu_item_ingredients mii ON mp.menu_item_id = mii.menu_item_id
      JOIN ingredients i ON mii.ingredient_id = i.id
      WHERE mp.user_id = $1 
        AND mp.planned_date >= $2 
        AND mp.planned_date <= $3
      GROUP BY mii.ingredient_id, i.name, mii.unit
    `;

    const ingredients = await pool.query(ingredientsQuery, [userId, startDate, endDate]);

    // Add ingredients to shopping list
    for (const ing of ingredients.rows) {
      await pool.query(
        `INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, quantity, unit)
         VALUES ($1, $2, $3, $4)`,
        [shoppingListId, ing.ingredient_id, ing.total_quantity, ing.unit]
      );
    }

    res.status(201).json(listResult.rows[0]);
  } catch (error) {
    console.error('Error generating shopping list:', error);
    res.status(500).json({ error: 'Failed to generate shopping list' });
  }
});

// Get all shopping lists for the user
router.get('/shopping-lists', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT sl.*,
        (SELECT COUNT(*) FROM shopping_list_items sli WHERE sli.shopping_list_id = sl.id) as item_count,
        (SELECT COUNT(*) FROM shopping_list_items sli WHERE sli.shopping_list_id = sl.id AND sli.checked = true) as checked_count
       FROM shopping_lists sl
       WHERE sl.user_id = $1
       ORDER BY sl.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

// Get a single shopping list with items
router.get('/shopping-lists/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const listResult = await pool.query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const itemsResult = await pool.query(
      `SELECT sli.*, i.name as ingredient_name, i.category as ingredient_category
       FROM shopping_list_items sli
       JOIN ingredients i ON sli.ingredient_id = i.id
       WHERE sli.shopping_list_id = $1
       ORDER BY i.category, i.name`,
      [id]
    );

    res.json({ ...listResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

// Toggle shopping list item checked
router.patch('/shopping-lists/:listId/items/:itemId', isAuthenticated, async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const listCheck = await pool.query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const result = await pool.query(
      'UPDATE shopping_list_items SET checked = NOT checked WHERE id = $1 AND shopping_list_id = $2 RETURNING *',
      [itemId, listId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling item:', error);
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

// Delete a shopping list
router.delete('/shopping-lists/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    res.json({ message: 'Shopping list deleted' });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

export default router;
