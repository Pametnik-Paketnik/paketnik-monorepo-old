# 🚀 Pametni Paketnik

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Development](#development)
- [Code Standards](#code-standards)
- [Services](#services)

## 🎯 Overview

- Frontend (React + Vite)
- Backend (NestJS)
- Face Authentication Service (FastAPI)

## 🏗️ Architecture

```
├── frontend/          # React + Vite frontend
├── backend/          # NestJS backend
└── face-auth-service/ # FastAPI face authentication service
```

## ⚙️ Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- Python 3.11+ (for local development)
- pnpm (for Node.js package management)
- Make (for using Makefile commands)

## 🚀 Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd paketnik-monorepo
   ```

2. Create environment files:
   ```bash
   # Frontend
   cp frontend/.env.template frontend/.env.dev

   # Backend
   cp backend/.env.template backend/.env.dev

   # Face Auth Service
   cp face-auth-service/.env.template face-auth-service/.env.dev
   ```

3. Start the development environment:
   ```bash
   make dev
   ```

## 💻 Development

### Using Make Commands

The project includes a Makefile with various commands to manage the development environment:

```bash
make dev          # Start all services in development mode
make build        # Build all services
make start        # Start all services
make start-d      # Start all services in detached mode
make stop         # Stop all services
make restart      # Restart all services
make logs         # Show logs from all services
make clean        # Clean up Docker environment

# Service-specific logs
make backend-logs
make frontend-logs
make face-auth-logs
```

### Accessing Services

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Face Auth Service: http://localhost:8000

## 📝 Code Standards

We maintain strict code standards to ensure clean, structured, and collaborative development. Please refer to our [Code Standards](docs/code-standards.md) document for:

- Branch naming conventions
- Commit message format
- What to include/exclude in commits
- Recommended workflow
- Pre-commit checklist

## 🔧 Services

### Frontend
- React + Vite
- TypeScript
- Tailwind CSS
- Radix UI

### Backend
- NestJS
- TypeScript
- PostgreSQL
- Prisma

### Face Auth Service
- FastAPI
- OpenCV
- scikit-learnî