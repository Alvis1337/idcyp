#!/bin/zsh

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node 24.13.0
echo "📦 Installing Node v24.13.0..."
nvm install 24.13.0
nvm use 24.13.0

echo ""
echo "✅ Node version:"
node --version

echo ""
echo "✅ npm version:"
npm --version

echo ""
echo "🔄 Reinstalling dependencies..."
cd /Users/chrisalvis/IdeaProjects/idcyp
rm -rf node_modules package-lock.json
npm install

echo ""
echo "✅ Done! Node v24.13.0 is now active."
echo ""
echo "To use this Node version in your terminal:"
echo "  nvm use 24.13.0"
