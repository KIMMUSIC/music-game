# Quickstart: Music Quiz Game Platform

**Branch**: `001-music-quiz-game`
**Date**: 2025-01-17

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- AWS CLI (configured for deployment)
- Git

## Local Development Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repo-url>
cd music-quiz-game

# Install dependencies for all services
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup

```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env with your values:
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
# - KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - DATABASE_URL (docker-compose provides default)
# - REDIS_URL (docker-compose provides default)

# IMPORTANT: In frontend/.env, set VITE_API_BASE_URL to empty:
# VITE_API_BASE_URL=
# This ensures API calls go through the Vite proxy for proper routing.
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose logs -f postgres  # Wait for "ready to accept connections"
```

### 4. Database Setup

```bash
# Run migrations for each service
cd backend/services/auth && npm run migration:run
cd ../quiz && npm run migration:run
cd ../game && npm run migration:run
cd ../social && npm run migration:run
```

### 5. Start Services

**Option A: All services via Docker**
```bash
docker-compose up
```

**Option B: Individual services for development**
```bash
# Terminal 1: Auth Service
cd backend/services/auth && npm run start:dev

# Terminal 2: Quiz Service
cd backend/services/quiz && npm run start:dev

# Terminal 3: Game Service
cd backend/services/game && npm run start:dev

# Terminal 4: Social Service
cd backend/services/social && npm run start:dev

# Terminal 5: Frontend
cd frontend && npm run dev
```

### 6. Access Application

- **Frontend**: http://localhost:5173
- **Auth Service**: http://localhost:3001
- **Quiz Service**: http://localhost:3002
- **Game Service**: http://localhost:3003
- **Social Service**: http://localhost:3004

## Running Tests

```bash
# Unit tests (all services)
cd backend && npm run test

# E2E tests
cd backend && npm run test:e2e

# Frontend tests
cd frontend && npm run test

# With coverage
npm run test:cov
```

## Common Development Tasks

### Adding a New API Endpoint

1. Define the endpoint in the appropriate service's controller
2. Add DTOs in `shared/dto/`
3. Update the OpenAPI spec in `specs/001-music-quiz-game/contracts/`
4. Write tests first (TDD)
5. Implement the service logic

### Creating a Database Migration

```bash
cd backend/services/<service-name>

# Generate migration from entity changes
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Testing WebSocket Events

```bash
# Install wscat for testing
npm install -g wscat

# Connect to game service
wscat -c ws://localhost:3003

# Send test message
{"event": "room:join", "data": {"roomCode": "ABC123", "wsToken": "..."}}
```

## Docker Commands

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f <service-name>

# Stop all services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d postgres redis
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to database directly
docker-compose exec postgres psql -U postgres -d musicquiz
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker-compose ps redis

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

### OAuth Callback Issues
- Ensure redirect URIs are registered with OAuth providers
- For local development, use `http://localhost:3001/auth/google/callback`
- Check that environment variables are set correctly
- After OAuth callback, the token is passed via URL query parameter due to cross-origin cookie limitations in development

### API Proxy Issues
- If API calls go to the wrong port (e.g., quiz upload going to port 3001 instead of 3002):
  - Check that `VITE_API_BASE_URL` is empty in `frontend/.env`
  - The Vite proxy configuration in `vite.config.ts` routes requests to the correct services
- Each service has a specific port: Auth (3001), Quiz (3002), Game (3003), Social (3004)

### Quiz Creation - Audio Sources
- Quiz songs support two audio source types:
  1. **Upload**: MP3 files uploaded to S3 (max 10MB per file)
  2. **YouTube**: YouTube video URLs (audio extracted via YouTube IFrame API)
- When creating a quiz, select the source type for each song
- YouTube URLs are validated using pattern matching for various formats (watch, short, embed)

## Project Structure Quick Reference

```
music-quiz-game/
├── backend/
│   ├── services/
│   │   ├── auth/         # OAuth, sessions, users
│   │   ├── quiz/         # Quiz sets, questions, uploads
│   │   ├── game/         # Rooms, real-time gameplay
│   │   └── social/       # Friends, presence, notifications
│   └── shared/           # Common DTOs, interfaces, utils
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API clients
│   │   └── stores/       # State management
│   └── tests/
├── infrastructure/
│   └── terraform/        # AWS IaC
├── specs/
│   └── 001-music-quiz-game/
│       ├── spec.md       # Feature specification
│       ├── plan.md       # Implementation plan
│       ├── research.md   # Technical decisions
│       ├── data-model.md # Database schema
│       ├── contracts/    # OpenAPI specs
│       └── quickstart.md # This file
└── docker-compose.yml
```

## Next Steps

1. **Set up OAuth credentials** with Google and Kakao
2. **Run the application** locally
3. **Create a quiz** to test the quiz creation flow
4. **Test multiplayer** by opening two browser windows
5. **Review contracts** in `specs/001-music-quiz-game/contracts/`

## Useful Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
