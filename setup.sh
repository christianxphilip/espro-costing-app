#!/bin/bash

echo "🚀 Setting up Café Costing App..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Rancher Desktop or Docker Desktop first."
    exit 1
fi

# Check if Docker Compose is available (v2 compose plugin or v1 standalone)
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is not installed. Please install Docker or Rancher Desktop first."
    exit 1
fi

echo "✅ Docker and $COMPOSE_CMD found"
echo ""

# Check if .env files exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and add your configuration"
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env..."
    echo "VITE_API_URL=http://localhost:5000/api" > frontend/.env
fi

echo "✅ Environment files ready"
echo ""

# Ask user which setup method they prefer
echo "Choose setup method:"
echo "1) Docker (recommended)"
echo "2) Manual setup"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "🐳 Starting with $COMPOSE_CMD..."
    echo ""
    $COMPOSE_CMD up --build
elif [ "$choice" = "2" ]; then
    echo ""
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    echo "✅ Backend dependencies installed"
    echo ""
    
    echo "📦 Installing frontend dependencies..."
    cd ../frontend
    npm install
    echo "✅ Frontend dependencies installed"
    echo ""
    
    echo "✅ Setup complete!"
    echo ""
    echo "To start the application:"
    echo "1. Start MongoDB locally"
    echo "2. In one terminal: cd backend && npm run dev"
    echo "3. In another terminal: cd frontend && npm run dev"
    echo "4. Open http://localhost:3000"
else
    echo "Invalid choice. Exiting."
    exit 1
fi

