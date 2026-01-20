# Implementation Plan: Music Quiz Game Platform

**Branch**: `001-music-quiz-game` | **Date**: 2025-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-music-quiz-game/spec.md`

## Summary

A multiplayer music quiz game web service where users can create quiz sets using YouTube links or MP3 files, host game rooms, and compete with friends in real-time. The platform features OAuth authentication (Google/Kakao), real-time score tracking, and a friend system. Designed as a microservices architecture deployed on AWS ECS for learning MSA patterns, container orchestration, and cloud-native development.

## Technical Context

**Language/Version**: TypeScript 5.x (Backend: Node.js 20 LTS, Frontend: React 18)
**Primary Dependencies**:
- Backend: NestJS (MSA-friendly framework), Socket.IO (real-time), Passport.js (OAuth)
- Frontend: React, Vite, Socket.IO client, TailwindCSS
- Infrastructure: Docker, AWS ECS, ALB, RDS, ElastiCache, S3

**Storage**:
- PostgreSQL (RDS) - User data, quiz sets, game history
- Redis (ElastiCache) - Session management, real-time game state, presence
- S3 - MP3 file uploads

**Testing**: Jest (unit/integration), Playwright (E2E), k6 (load testing)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), AWS ECS Fargate
**Project Type**: Web application (frontend + backend microservices)

**Performance Goals**:
- Real-time sync: <500ms audio latency between players
- Score updates: <1s propagation to all players
- Concurrent capacity: 100 game rooms × 10 players = 1000 concurrent users

**Constraints**:
- Stateless services for horizontal scaling
- WebSocket sticky sessions via ALB
- MP3 upload limit: 10MB per file
- Room code: 6 alphanumeric characters

**Scale/Scope**:
- Initial: 100 concurrent game rooms
- Target: 10,000 registered users
- MSA Services: Auth, Quiz, Game, Social (4 microservices)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | ✅ PASS | NestJS enforces module structure; ESLint/Prettier configured |
| II. Test-Driven Development | ✅ PASS | Jest for TDD; 80% coverage for game logic, 60% for UI |
| III. Incremental Delivery | ✅ PASS | 6 user stories (P1-P6) with independent testability |
| IV. Performance Awareness | ✅ PASS | WebSocket latency targets defined; k6 load testing planned |
| V. Simplicity Over Cleverness | ✅ PASS | Standard patterns (REST, WebSocket, OAuth2) |
| VI. Security & Secrets Protection | ✅ PASS | AWS Secrets Manager for credentials; no secrets in code |
| VII. AWS-Ready Architecture | ✅ PASS | ECS Fargate, RDS, ElastiCache, S3, ALB planned |
| VIII. Frontend/Backend Separation | ✅ PASS | Separate `backend/` and `frontend/` directories; API-only backend |

**Quality Gates Compliance**:
1. Lint Check: ESLint + Prettier (enforced via pre-commit hooks)
2. Type Check: TypeScript strict mode
3. Unit Tests: Jest with coverage thresholds
4. Build: GitHub Actions CI pipeline
5. Review: PR required; at least 1 approval
6. Secrets Scan: git-secrets or similar in CI

## Project Structure

### Documentation (this feature)

```text
specs/001-music-quiz-game/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── services/
│   ├── auth/                    # Auth Service (OAuth, sessions)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── entities/
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── Dockerfile
│   ├── quiz/                    # Quiz Service (quiz sets, questions)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── entities/
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── Dockerfile
│   ├── game/                    # Game Service (rooms, real-time gameplay)
│   │   ├── src/
│   │   │   ├── gateways/        # WebSocket gateways
│   │   │   ├── services/
│   │   │   ├── entities/
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── Dockerfile
│   └── social/                  # Social Service (friends, presence)
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── entities/
│       │   └── main.ts
│       ├── test/
│       └── Dockerfile
├── shared/                      # Shared libraries
│   ├── dto/                     # Data Transfer Objects
│   ├── interfaces/              # Common interfaces
│   └── utils/                   # Utility functions
├── docker-compose.yml           # Local development
└── docker-compose.test.yml      # Integration testing

frontend/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/
│   │   ├── quiz/
│   │   ├── game/
│   │   └── social/
│   ├── pages/                   # Route pages
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── QuizCreate.tsx
│   │   ├── GameRoom.tsx
│   │   └── Profile.tsx
│   ├── services/                # API clients
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── stores/                  # State management
│   └── App.tsx
├── tests/
│   ├── unit/
│   └── e2e/
├── Dockerfile
└── vite.config.ts

infrastructure/
├── terraform/                   # IaC for AWS
│   ├── modules/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   ├── alb/
│   │   └── s3/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── main.tf
└── scripts/
    ├── deploy.sh
    └── migrate.sh
```

**Structure Decision**: Web application with MSA backend (4 services) and SPA frontend. This structure:
- Aligns with Constitution Principle VIII (Frontend/Backend Separation)
- Enables independent deployment of each service (Principle VII: AWS-Ready)
- Supports the user's learning goals for MSA, containers, and cloud concepts

## Complexity Tracking

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| 4 Microservices | Auth, Quiz, Game, Social | Clear domain boundaries; independent scaling; learning MSA patterns |
| Redis for game state | In-memory store | Real-time performance requirement (<500ms sync) |
| WebSocket (Socket.IO) | Real-time communication | Bidirectional communication for gameplay |

**Justification for MSA over monolith**: User explicitly requested MSA for learning purposes. The 4-service split follows domain-driven design with clear boundaries. Trade-off: increased operational complexity, but valuable for educational goals and future scaling.
