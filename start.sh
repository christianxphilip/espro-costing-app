#!/bin/bash

echo "☕ Café Costing App - One-Command Startup"
echo "=========================================="
echo ""

# Always recreate backend .env to ensure correct settings
echo "📝 Creating backend/.env with defaults..."
cat > backend/.env << EOF
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=8000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development
EOF
echo "✅ Backend environment created"

# Always recreate frontend .env to ensure correct settings
echo "📝 Creating frontend/.env with defaults..."
cat > frontend/.env << EOF
VITE_API_URL=http://localhost:8000/api
EOF
echo "✅ Frontend environment created"

# Check if Docker Compose is available (v2 compose plugin or v1 standalone)
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is not installed. Please install Docker or Rancher Desktop first."
    exit 1
fi

echo ""
echo "🚀 Starting all services with Docker Compose ($COMPOSE_CMD)..."
echo ""
echo "Services will be available at:"
echo "  → Frontend:      http://localhost:3000"
echo "  → Backend API:   http://localhost:8000/api"
echo "  → Mongo Express: http://localhost:8081 (admin/admin123)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start Docker Compose
$COMPOSE_CMD up --build


