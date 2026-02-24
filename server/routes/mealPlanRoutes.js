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

export default router;
