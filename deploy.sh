#!/bin/bash

# Deployment script for Paketnik application

set -e

echo "🚀 Starting deployment process..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please copy env.prod.example to .env and fill in your values:"
    echo "cp env.prod.example .env"
    exit 1
fi

# Load environment variables
source .env

# Check if DOCKER_USERNAME is set
if [ -z "$DOCKER_USERNAME" ]; then
    echo "❌ DOCKER_USERNAME not set in .env file"
    exit 1
fi

echo "📦 Pulling latest Docker images..."

# Pull latest images
docker pull $DOCKER_USERNAME/paketnik-frontend:latest
docker pull $DOCKER_USERNAME/paketnik-backend:latest
docker pull $DOCKER_USERNAME/paketnik-face-auth:latest

echo "🔄 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🏗️  Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"
echo ""
echo "Services are available at:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost:3000"
echo "  Face Auth Service: http://localhost:8000"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down" 