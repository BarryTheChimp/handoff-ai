#!/bin/bash

# Handoff AI - Setup Script

set -e

echo ""
echo "🤝 =================================================="
echo "   Handoff AI - Development Setup"
echo "=================================================="
echo ""

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 18+"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found - needed for PostgreSQL"
fi

# Install deps
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env
if [ ! -f .env ]; then
    echo "📝 Creating .env..."
    cp .env.example .env
    echo "⚠️  Edit .env and add your CLAUDE_API_KEY"
fi

# Create uploads dir
mkdir -p uploads

# Start DB
if command -v docker &> /dev/null; then
    echo "🐘 Starting PostgreSQL..."
    docker-compose up -d db
    sleep 3
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your CLAUDE_API_KEY"
echo "  2. Run: npm run dev"
echo ""
