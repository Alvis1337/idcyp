-- Create the database (run this separately in psql)
-- CREATE DATABASE menu_db;

-- Connect to menu_db and run the following:

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  theme_preference VARCHAR(20) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table (enhanced)
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2),
  image_url TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 4,
  difficulty VARCHAR(50),
  cuisine_type VARCHAR(100),
  is_favorite BOOLEAN DEFAULT false,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contributor VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu item ingredients junction table
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  notes TEXT,
  UNIQUE(menu_item_id, ingredient_id)
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared links table
CREATE TABLE IF NOT EXISTS shared_links (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(menu_item_id, user_id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu item tags junction table
CREATE TABLE IF NOT EXISTS menu_item_tags (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(menu_item_id, tag_id)
);

-- Shopping lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping list items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id SERIAL PRIMARY KEY,
  shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  checked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_contributor ON menu_items(contributor);
CREATE INDEX IF NOT EXISTS idx_menu_items_user_id ON menu_items(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_favorite ON menu_items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(planned_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(share_token);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item_id ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert sample data
INSERT INTO menu_items (name, description, category, price, contributor, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type) VALUES
  ('Spaghetti Carbonara', 'Classic Italian pasta with eggs, cheese, pancetta, and black pepper', 'Main Course', 14.99, 'Chris', 10, 20, 4, 'Medium', 'Italian'),
  ('Caesar Salad', 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan', 'Appetizer', 8.99, 'Girlfriend', 15, 0, 2, 'Easy', 'American'),
  ('Chocolate Lava Cake', 'Warm chocolate cake with a molten center, served with vanilla ice cream', 'Dessert', 7.99, 'Chris', 15, 12, 6, 'Medium', 'French'),
  ('Margherita Pizza', 'Fresh mozzarella, tomatoes, and basil on a wood-fired crust', 'Main Course', 12.99, 'Girlfriend', 20, 15, 4, 'Medium', 'Italian'),
  ('Garlic Bread', 'Toasted bread with garlic butter and herbs', 'Appetizer', 5.99, 'Chris', 5, 10, 6, 'Easy', 'Italian'),
  ('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 'Dessert', 8.99, 'Girlfriend', 30, 0, 8, 'Medium', 'Italian');

-- Insert sample ingredients
INSERT INTO ingredients (name, category) VALUES
  ('Spaghetti', 'Pasta'),
  ('Eggs', 'Dairy'),
  ('Parmesan Cheese', 'Dairy'),
  ('Pancetta', 'Meat'),
  ('Black Pepper', 'Spices'),
  ('Romaine Lettuce', 'Vegetables'),
  ('Croutons', 'Bread'),
  ('Dark Chocolate', 'Baking'),
  ('Flour', 'Baking'),
  ('Butter', 'Dairy'),
  ('Mozzarella', 'Dairy'),
  ('Tomatoes', 'Vegetables'),
  ('Basil', 'Herbs'),
  ('Pizza Dough', 'Baking'),
  ('Garlic', 'Vegetables'),
  ('Bread', 'Bread'),
  ('Ladyfingers', 'Baking'),
  ('Mascarpone', 'Dairy'),
  ('Coffee', 'Beverages'),
  ('Cocoa Powder', 'Baking');

-- Insert sample tags
INSERT INTO tags (name) VALUES
  ('Quick & Easy'),
  ('Family Favorite'),
  ('Date Night'),
  ('Comfort Food'),
  ('Healthy'),
  ('Vegetarian'),
  ('Vegan'),
  ('Gluten Free'),
  ('Low Carb'),
  ('Spicy'),
  ('Sweet'),
  ('Italian'),
  ('Mexican'),
  ('Asian'),
  ('American');

-- Link some ingredients to menu items
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit) VALUES
  (1, 1, 400, 'g'),
  (1, 2, 3, 'whole'),
  (1, 3, 100, 'g'),
  (1, 4, 150, 'g'),
  (1, 5, 2, 'tsp'),
  (2, 6, 1, 'head'),
  (2, 7, 1, 'cup'),
  (2, 3, 50, 'g');
