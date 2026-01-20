# Research: Music Quiz Game Platform

**Branch**: `001-music-quiz-game`
**Date**: 2025-01-17
**Purpose**: Resolve technical decisions and document best practices for implementation

## Table of Contents

1. [MSA Architecture Decisions](#1-msa-architecture-decisions)
2. [Real-time Communication](#2-real-time-communication)
3. [OAuth Integration](#3-oauth-integration)
4. [Audio Handling](#4-audio-handling)
5. [AWS Infrastructure](#5-aws-infrastructure)
6. [Service Communication](#6-service-communication)

---

## 1. MSA Architecture Decisions

### Decision: 4-Service Architecture

**Services**:
| Service | Responsibility | Port | Dependencies |
|---------|---------------|------|--------------|
| Auth | OAuth2 login, sessions, user profiles | 3001 | PostgreSQL, Redis |
| Quiz | Quiz sets, questions, MP3 uploads | 3002 | PostgreSQL, S3 |
| Game | Rooms, real-time gameplay, scoring | 3003 | PostgreSQL, Redis |
| Social | Friends, presence, notifications | 3004 | PostgreSQL, Redis |

**Rationale**:
- Domain-driven boundaries align with business capabilities
- Independent scaling: Game service needs more resources during peak usage
- Team autonomy: Each service can evolve independently
- Learning value: Demonstrates core MSA patterns

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| Monolith | Doesn't meet learning goals for MSA |
| 2-service (API + Game) | Less clear boundaries; Game still coupled to user management |
| 6+ services | Over-engineering for current scope; increased operational burden |

### Service Communication Patterns

**Synchronous (REST)**:
- Auth → Quiz: Validate user owns quiz set
- Game → Quiz: Fetch quiz details when game starts
- Social → Auth: Resolve user profiles for friend list

**Asynchronous (Redis Pub/Sub)**:
- Game → Social: Player joined/left room (presence updates)
- Auth → All: User logged out (invalidate sessions)

---

## 2. Real-time Communication

### Decision: Socket.IO with Redis Adapter

**Rationale**:
- Built-in room support (maps to game rooms)
- Automatic reconnection handling
- Redis adapter enables horizontal scaling
- Fallback to HTTP long-polling if WebSocket unavailable

**Configuration**:
```
Client <-> ALB (sticky sessions) <-> Game Service <-> Redis Pub/Sub
```

**Key Patterns**:

| Event | Direction | Payload |
|-------|-----------|---------|
| `room:join` | Client → Server | `{ roomCode, userId }` |
| `room:state` | Server → Client | `{ players, status, currentQuestion }` |
| `game:start` | Server → Room | `{ questionIndex, audioUrl, startTime }` |
| `answer:submit` | Client → Server | `{ answer, timestamp }` |
| `score:update` | Server → Room | `{ userId, score, correct }` |
| `game:end` | Server → Room | `{ rankings, stats }` |

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| WebSocket (raw) | No room abstraction; manual reconnection handling |
| Server-Sent Events | Unidirectional; need bidirectional for answers |
| AWS AppSync | Additional complexity; GraphQL subscription learning curve |

### Sticky Sessions Configuration

**ALB Settings**:
- Stickiness: Application-based cookie
- Cookie name: `AWSALB`
- Duration: 1 hour (typical game session)

**Why Needed**: Socket.IO handshake requires same server instance. Redis adapter broadcasts events across instances, but initial connection must be stable.

---

## 3. OAuth Integration

### Decision: Passport.js with Google and Kakao Strategies

**Flow**:
```
1. User clicks "Login with Google"
2. Redirect to Google OAuth consent
3. Google redirects to /auth/google/callback with code
4. Auth Service exchanges code for tokens
5. Create/update user in DB
6. Issue JWT + set HttpOnly cookie
7. Redirect to frontend with success
```

**Token Strategy**:
| Token Type | Storage | Lifetime | Purpose |
|------------|---------|----------|---------|
| Access Token (JWT) | HttpOnly Cookie | 15 minutes | API authentication |
| Refresh Token | Redis + HttpOnly Cookie | 7 days | Token renewal |
| OAuth Tokens | Not stored | N/A | Only used during login flow |

**Rationale**:
- Passport.js: De-facto standard for Node.js OAuth
- JWT in HttpOnly cookie: XSS protection
- Short-lived access tokens: Minimize exposure window

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| AWS Cognito | Additional complexity; Passport.js sufficient for learning |
| Session-only (no JWT) | Harder to validate across microservices |
| LocalStorage JWT | Vulnerable to XSS attacks |

### Kakao OAuth Setup Notes

- Register app at https://developers.kakao.com
- Required scopes: `profile_nickname`, `account_email`
- Callback URL: `https://{domain}/auth/kakao/callback`

---

## 4. Audio Handling

### Decision: YouTube IFrame API + S3 for MP3

**YouTube Questions**:
```
1. Store YouTube video ID + start/end timestamps in DB
2. Frontend loads YouTube IFrame API
3. On question start, seek to start time and play
4. Stop at end time or on answer/timeout
```

**Constraints**:
- Cannot extract raw audio (ToS violation)
- Must use IFrame embed (no direct download)
- Playback sync relies on client-side timing

**MP3 Questions**:
```
1. User uploads MP3 via signed S3 URL
2. Store S3 key + start/end timestamps in DB
3. On question start, generate presigned URL (15 min expiry)
4. Frontend fetches and plays with HTML5 Audio API
```

**S3 Configuration**:
- Bucket: `music-quiz-uploads-{env}`
- Path pattern: `mp3/{userId}/{quizId}/{questionId}.mp3`
- Max size: 10MB
- Content-Type validation: `audio/mpeg`

**Sync Strategy**:
- Server broadcasts `game:start` with `serverTime`
- Clients calculate local offset: `localTime - serverTime`
- Playback starts at adjusted timestamp
- Acceptable drift: <500ms (casual gaming tolerance)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| Server-side audio streaming | Expensive bandwidth; unnecessary complexity |
| FFmpeg server processing | Not needed; browser handles playback |
| YouTube Data API | Doesn't solve playback; IFrame API is correct choice |

---

## 5. AWS Infrastructure

### Decision: ECS Fargate with ALB

**Architecture**:
```
Internet
    │
    ▼
CloudFront (Frontend CDN)
    │
    ▼
ALB ─────────────────────────────────────────────
    │         │         │         │
    ▼         ▼         ▼         ▼
  Auth      Quiz      Game      Social
 Service   Service   Service   Service
    │         │         │         │
    └─────────┴─────────┴─────────┘
              │         │
              ▼         ▼
           RDS      ElastiCache
        (Postgres)   (Redis)
              │
              ▼
             S3
         (MP3 files)
```

**Service Configuration**:
| Service | CPU | Memory | Min Tasks | Max Tasks |
|---------|-----|--------|-----------|-----------|
| Auth | 256 | 512MB | 1 | 4 |
| Quiz | 256 | 512MB | 1 | 4 |
| Game | 512 | 1GB | 2 | 10 |
| Social | 256 | 512MB | 1 | 4 |

**Rationale**:
- Fargate: No EC2 management; pay per task; simpler for learning
- ALB: Path-based routing, WebSocket support, sticky sessions
- CloudFront: Static asset caching, HTTPS termination

**Learning Concepts Covered**:
| Concept | AWS Service | Implementation |
|---------|-------------|----------------|
| Load Balancing | ALB | Path routing: `/auth/*`, `/quiz/*`, `/game/*`, `/social/*` |
| Container Orchestration | ECS Fargate | Task definitions, service auto-scaling |
| ACL/Security Groups | VPC + SG | Private subnets for services, public for ALB |
| Service Discovery | Cloud Map | Internal DNS: `auth.musicquiz.local` |

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| EKS (Kubernetes) | Higher complexity; overkill for 4 services |
| EC2 directly | Manual scaling; more ops burden |
| Lambda | Cold starts unsuitable for WebSocket |

---

## 6. Service Communication

### Decision: REST + Redis Pub/Sub

**Synchronous (REST)**:
```
Auth Service:
  POST /internal/validate-token  → { valid, userId }
  GET  /internal/users/:id       → { id, nickname, avatarUrl }

Quiz Service:
  GET  /internal/quizzes/:id     → { id, title, questions }
  GET  /internal/quizzes/:id/questions → [{ audioSource, startTime, endTime, answers }]
```

**Asynchronous (Redis Pub/Sub)**:
```
Channels:
  user:logout:{userId}     → Session invalidation
  presence:{userId}        → Online/offline status
  room:{roomCode}:events   → Game state broadcasts
```

**API Gateway Pattern**:
- Not implementing: Direct ALB routing is simpler
- Future consideration: AWS API Gateway for rate limiting, caching

**Internal Communication Security**:
- Services in private subnet (no public access)
- Internal endpoints authenticated via shared secret header
- Secret rotated via AWS Secrets Manager

**Rationale**:
- REST for query/command: Simple, well-understood
- Redis Pub/Sub for events: Low latency, already using Redis

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|-----------------|
| gRPC | Additional complexity; REST sufficient for this scale |
| AWS SQS/SNS | Adds latency; Redis already in stack |
| Event Sourcing | Over-engineering for current requirements |

---

## Summary of Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, Vite, TailwindCSS | SPA with modern tooling |
| Backend | NestJS, TypeScript | MSA framework with decorators |
| Real-time | Socket.IO + Redis Adapter | WebSocket with scaling |
| Auth | Passport.js, JWT | OAuth2 + token auth |
| Database | PostgreSQL (RDS) | Relational data |
| Cache | Redis (ElastiCache) | Sessions, pub/sub, game state |
| Storage | S3 | MP3 file uploads |
| Compute | ECS Fargate | Containerized services |
| CDN | CloudFront | Frontend static assets |
| IaC | Terraform | Infrastructure automation |
| CI/CD | GitHub Actions | Build, test, deploy |

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How to sync audio across clients? | Server broadcasts start time; clients adjust locally |
| Cognito vs custom OAuth? | Custom Passport.js for learning; simpler control |
| How many microservices? | 4 services with clear domain boundaries |
| Message broker choice? | Redis Pub/Sub (already in stack for caching) |
| Kubernetes vs ECS? | ECS Fargate (simpler, sufficient for scope) |
