#!/bin/bash

echo "🍽️  Menu Collection - Quick Start"
echo "=================================="
echo ""

# Check for Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "✅ Docker found!"
    echo ""
    echo "📋 Setup Steps:"
    echo "1. Get Google OAuth credentials: https://console.cloud.google.com/"
    echo "2. Update .env with your credentials"
    echo "3. Add redirect URI: http://localhost:3001/api/auth/google/callback"
    echo ""
    read -p "Ready to start? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Starting containers..."
        docker-compose up --build
    fi
else
    echo "❌ Docker not found. Install Docker Desktop first."
    echo ""
    echo "Or run locally:"
    echo "  npm install"
    echo "  ./setup-db.sh"
    echo "  npm run dev:all"
fi
