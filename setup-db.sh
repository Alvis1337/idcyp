#!/bin/bash

echo "🍽️  Setting up Menu Collection Database..."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   macOS: brew install postgresql@14"
    echo "   Then run: brew services start postgresql@14"
    exit 1
fi

echo "📊 Creating database..."

# Try to create database (will fail if already exists, which is fine)
psql -U postgres -c "CREATE DATABASE menu_db;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database 'menu_db' created successfully"
else
    echo "ℹ️  Database 'menu_db' already exists, skipping creation"
fi

echo ""
echo "📋 Running database schema..."

# Run schema file
psql -U postgres -d menu_db -f server/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema applied successfully"
    echo "✅ Sample data inserted"
    echo ""
    echo "🎉 Database setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Update .env file if needed (default settings should work)"
    echo "  2. Run: npm run dev:all"
    echo "  3. Open http://localhost:5173 in your browser"
    echo ""
else
    echo "❌ Failed to apply database schema"
    echo "   Make sure PostgreSQL is running and you have the correct credentials"
    exit 1
fi
