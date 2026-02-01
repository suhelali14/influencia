#!/bin/bash
# Quick Deploy Script for Influencia Platform
# This script helps you deploy quickly to production

set -e

echo "🚀 Influencia Quick Deploy Script"
echo "=================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    echo "Please copy .env.example to .env.production and fill in your values."
    echo ""
    echo "Run: cp .env.example .env.production"
    echo "Then edit .env.production with your credentials"
    exit 1
fi

echo "✅ Found .env.production"
echo ""

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
REQUIRED_VARS=("DATABASE_URL" "REDIS_HOST" "JWT_SECRET" "GEMINI_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '%s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these in .env.production"
    exit 1
fi

echo "✅ All required environment variables present"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and deploy
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

# Check backend
if docker-compose -f docker-compose.prod.yml ps | grep -q "influencia_backend.*Up"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check AI service
if docker-compose -f docker-compose.prod.yml ps | grep -q "influencia_ai.*Up"; then
    echo "✅ AI service is running"
else
    echo "❌ AI service failed to start"
    docker-compose -f docker-compose.prod.yml logs ai
    exit 1
fi

# Check frontend
if docker-compose -f docker-compose.prod.yml ps | grep -q "influencia_frontend.*Up"; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend failed to start"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Your services are now running:"
echo "  Frontend:  http://localhost:80"
echo "  Backend:   http://localhost:3000"
echo "  AI:        http://localhost:5001"
echo ""
echo "Next steps:"
echo "  1. Run database migrations:"
echo "     docker exec -it influencia_backend npm run migration:run"
echo ""
echo "  2. Check logs:"
echo "     docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "  3. Test health endpoints:"
echo "     curl http://localhost:3000/health"
echo "     curl http://localhost:5001/health"
echo ""
echo "For more information, see COMPLETE_DEPLOYMENT_GUIDE.md"
