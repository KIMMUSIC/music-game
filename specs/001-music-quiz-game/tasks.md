# Tasks: Music Quiz Game Platform

**Input**: Design documents from `/specs/001-music-quiz-game/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included per Constitution Principle II (Test-Driven Development). Coverage targets: 80% for game logic, 60% for UI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend services**: `backend/services/{auth|quiz|game|social}/src/`
- **Frontend**: `frontend/src/`
- **Shared**: `backend/shared/`
- **Infrastructure**: `infrastructure/terraform/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo structure, and development environment

- [X] T001 Create monorepo root structure with `backend/`, `frontend/`, `infrastructure/` directories
- [X] T002 Initialize backend workspace with NestJS CLI in `backend/package.json`
- [X] T003 [P] Create Auth Service scaffold in `backend/services/auth/` using NestJS CLI
- [X] T004 [P] Create Quiz Service scaffold in `backend/services/quiz/` using NestJS CLI
- [X] T005 [P] Create Game Service scaffold in `backend/services/game/` using NestJS CLI
- [X] T006 [P] Create Social Service scaffold in `backend/services/social/` using NestJS CLI
- [X] T007 Initialize frontend with Vite + React + TypeScript in `frontend/`
- [X] T008 [P] Configure ESLint + Prettier for backend in `backend/.eslintrc.js`
- [X] T009 [P] Configure ESLint + Prettier for frontend in `frontend/.eslintrc.cjs`
- [X] T010 [P] Configure TailwindCSS in `frontend/tailwind.config.js`
- [X] T011 Create shared DTOs package in `backend/shared/dto/`
- [X] T012 Create shared interfaces package in `backend/shared/interfaces/`
- [X] T013 Create `docker-compose.yml` with PostgreSQL, Redis, and all services
- [X] T014 Create `.env.example` files for each service (no secrets)
- [X] T015 [P] Configure Jest for backend services in each service's `jest.config.js`
- [X] T016 [P] Configure Vitest for frontend in `frontend/vitest.config.ts`
- [X] T017 Setup GitHub Actions CI pipeline in `.github/workflows/ci.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Migrations

- [X] T018 Configure TypeORM in Auth Service in `backend/services/auth/src/config/database.config.ts`
- [X] T019 [P] Configure TypeORM in Quiz Service in `backend/services/quiz/src/config/database.config.ts`
- [X] T020 [P] Configure TypeORM in Game Service in `backend/services/game/src/config/database.config.ts`
- [X] T021 [P] Configure TypeORM in Social Service in `backend/services/social/src/config/database.config.ts`

### Redis Configuration

- [X] T022 Configure Redis connection in Auth Service in `backend/services/auth/src/config/redis.config.ts`
- [X] T023 [P] Configure Redis connection in Game Service in `backend/services/game/src/config/redis.config.ts`
- [X] T024 [P] Configure Redis connection in Social Service in `backend/services/social/src/config/redis.config.ts`

### API Infrastructure

- [X] T025 Implement global exception filter in `backend/shared/filters/http-exception.filter.ts`
- [X] T026 [P] Implement request logging middleware in `backend/shared/middleware/logging.middleware.ts`
- [X] T027 [P] Implement request validation pipe in `backend/shared/pipes/validation.pipe.ts`
- [X] T028 Create API response DTOs in `backend/shared/dto/api-response.dto.ts`
- [X] T029 Configure CORS for all services in each service's `main.ts`

### Frontend Infrastructure

- [X] T030 Setup React Router in `frontend/src/App.tsx`
- [X] T031 [P] Create API client base in `frontend/src/services/api.ts`
- [X] T032 [P] Create Socket.IO client in `frontend/src/services/socket.ts`
- [X] T033 Setup auth store (Zustand/Context) in `frontend/src/stores/authStore.ts`
- [X] T034 [P] Create common UI components (Button, Input, Card) in `frontend/src/components/common/`
- [X] T035 [P] Create Layout component with navigation in `frontend/src/components/common/Layout.tsx`

### Internal Service Communication

- [X] T036 Implement internal auth header validation in `backend/shared/guards/internal.guard.ts`
- [X] T037 Create HTTP client for inter-service calls in `backend/shared/services/internal-http.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Third-Party Login and Profile Setup (Priority: P1) 🎯 MVP

**Goal**: Users can login via Google/Kakao OAuth and set their unique nickname

**Independent Test**: Complete login flow, set nickname, verify profile persistence

### Tests for User Story 1

- [ ] T038 [P] [US1] Unit test for AuthService in `backend/services/auth/test/auth.service.spec.ts`
- [ ] T039 [P] [US1] Unit test for UserService in `backend/services/auth/test/user.service.spec.ts`
- [ ] T040 [P] [US1] E2E test for OAuth flow in `backend/services/auth/test/auth.e2e-spec.ts`
- [ ] T041 [P] [US1] Frontend component test for Login in `frontend/tests/unit/Login.spec.tsx`

### Backend Implementation for User Story 1

- [ ] T042 [US1] Create User entity in `backend/services/auth/src/entities/user.entity.ts`
- [ ] T043 [US1] Create User migration in `backend/services/auth/src/migrations/001-create-user.ts`
- [ ] T044 [US1] Implement Google OAuth strategy in `backend/services/auth/src/strategies/google.strategy.ts`
- [ ] T045 [P] [US1] Implement Kakao OAuth strategy in `backend/services/auth/src/strategies/kakao.strategy.ts`
- [ ] T046 [US1] Implement JWT strategy in `backend/services/auth/src/strategies/jwt.strategy.ts`
- [ ] T047 [US1] Create session management with Redis in `backend/services/auth/src/services/session.service.ts`
- [ ] T048 [US1] Implement UserService in `backend/services/auth/src/services/user.service.ts`
- [ ] T049 [US1] Implement AuthService in `backend/services/auth/src/services/auth.service.ts`
- [ ] T050 [US1] Create AuthController with OAuth endpoints in `backend/services/auth/src/controllers/auth.controller.ts`
- [ ] T051 [US1] Create UserController with profile endpoints in `backend/services/auth/src/controllers/user.controller.ts`
- [ ] T052 [US1] Implement nickname validation (2-20 chars, unique) in `backend/services/auth/src/validators/nickname.validator.ts`
- [ ] T053 [US1] Create JwtAuthGuard in `backend/services/auth/src/guards/jwt-auth.guard.ts`
- [ ] T054 [US1] Implement internal token validation endpoint in `backend/services/auth/src/controllers/internal.controller.ts`

### Frontend Implementation for User Story 1

- [ ] T055 [US1] Create Login page in `frontend/src/pages/Login.tsx`
- [ ] T056 [US1] Create OAuth callback handler in `frontend/src/pages/AuthCallback.tsx`
- [ ] T057 [US1] Create NicknameSetup component in `frontend/src/components/auth/NicknameSetup.tsx`
- [ ] T058 [US1] Create Profile page in `frontend/src/pages/Profile.tsx`
- [ ] T059 [US1] Implement auth API service in `frontend/src/services/authApi.ts`
- [ ] T060 [US1] Add protected route wrapper in `frontend/src/components/common/ProtectedRoute.tsx`
- [ ] T061 [US1] Create Home page (landing) in `frontend/src/pages/Home.tsx`

**Checkpoint**: User Story 1 complete - users can login and set nickname

---

## Phase 4: User Story 2 - Quiz Set Creation (Priority: P2)

**Goal**: Users can create quiz sets with YouTube/MP3 questions and preview them

**Independent Test**: Create quiz with 3+ questions, preview each, verify playback

### Tests for User Story 2

- [ ] T062 [P] [US2] Unit test for QuizService in `backend/services/quiz/test/quiz.service.spec.ts`
- [ ] T063 [P] [US2] Unit test for QuestionService in `backend/services/quiz/test/question.service.spec.ts`
- [ ] T064 [P] [US2] Unit test for S3 upload in `backend/services/quiz/test/upload.service.spec.ts`
- [ ] T065 [P] [US2] E2E test for quiz CRUD in `backend/services/quiz/test/quiz.e2e-spec.ts`
- [ ] T066 [P] [US2] Frontend test for QuizCreate in `frontend/tests/unit/QuizCreate.spec.tsx`

### Backend Implementation for User Story 2

- [ ] T067 [US2] Create QuizSet entity in `backend/services/quiz/src/entities/quiz-set.entity.ts`
- [ ] T068 [P] [US2] Create Question entity in `backend/services/quiz/src/entities/question.entity.ts`
- [ ] T069 [US2] Create Quiz migrations in `backend/services/quiz/src/migrations/001-create-quiz-tables.ts`
- [ ] T070 [US2] Configure AWS S3 client in `backend/services/quiz/src/config/s3.config.ts`
- [ ] T071 [US2] Implement UploadService for presigned URLs in `backend/services/quiz/src/services/upload.service.ts`
- [ ] T072 [US2] Implement QuestionService in `backend/services/quiz/src/services/question.service.ts`
- [ ] T073 [US2] Implement QuizService in `backend/services/quiz/src/services/quiz.service.ts`
- [ ] T074 [US2] Implement YouTube URL validator in `backend/services/quiz/src/validators/youtube.validator.ts`
- [ ] T075 [US2] Create QuizController in `backend/services/quiz/src/controllers/quiz.controller.ts`
- [ ] T076 [US2] Create UploadController in `backend/services/quiz/src/controllers/upload.controller.ts`
- [ ] T077 [US2] Create internal quiz endpoint for Game Service in `backend/services/quiz/src/controllers/internal.controller.ts`

### Frontend Implementation for User Story 2

- [ ] T078 [US2] Create QuizCreate page in `frontend/src/pages/QuizCreate.tsx`
- [ ] T079 [US2] Create QuizList page in `frontend/src/pages/QuizList.tsx`
- [ ] T080 [US2] Create QuestionForm component in `frontend/src/components/quiz/QuestionForm.tsx`
- [ ] T081 [P] [US2] Create YouTubePlayer component in `frontend/src/components/quiz/YouTubePlayer.tsx`
- [ ] T082 [P] [US2] Create AudioPlayer component (MP3) in `frontend/src/components/quiz/AudioPlayer.tsx`
- [ ] T083 [US2] Create AnswerInput component in `frontend/src/components/quiz/AnswerInput.tsx`
- [ ] T084 [US2] Create QuizPreview component in `frontend/src/components/quiz/QuizPreview.tsx`
- [ ] T085 [US2] Implement quiz API service in `frontend/src/services/quizApi.ts`
- [ ] T086 [US2] Implement file upload with presigned URL in `frontend/src/services/uploadService.ts`

**Checkpoint**: User Story 2 complete - users can create and preview quizzes

---

## Phase 5: User Story 3 - Game Room Creation and Joining (Priority: P3)

**Goal**: Users can create rooms, share invite links, and join via code

**Independent Test**: Create room, share link, have second user join, verify lobby state

### Tests for User Story 3

- [ ] T087 [P] [US3] Unit test for RoomService in `backend/services/game/test/room.service.spec.ts`
- [ ] T088 [P] [US3] E2E test for room endpoints in `backend/services/game/test/room.e2e-spec.ts`
- [ ] T089 [P] [US3] Frontend test for room components in `frontend/tests/unit/GameRoom.spec.tsx`

### Backend Implementation for User Story 3

- [ ] T090 [US3] Create GameRoom entity in `backend/services/game/src/entities/game-room.entity.ts`
- [ ] T091 [P] [US3] Create GameParticipant entity in `backend/services/game/src/entities/game-participant.entity.ts`
- [ ] T092 [US3] Create Game migrations in `backend/services/game/src/migrations/001-create-game-tables.ts`
- [ ] T093 [US3] Implement room code generator in `backend/services/game/src/utils/room-code.util.ts`
- [ ] T094 [US3] Implement RoomService in `backend/services/game/src/services/room.service.ts`
- [ ] T095 [US3] Create RoomController in `backend/services/game/src/controllers/room.controller.ts`
- [ ] T096 [US3] Setup Socket.IO with Redis adapter in `backend/services/game/src/config/socket.config.ts`
- [ ] T097 [US3] Create RoomGateway (WebSocket) in `backend/services/game/src/gateways/room.gateway.ts`
- [ ] T098 [US3] Implement Redis room state management in `backend/services/game/src/services/room-state.service.ts`

### Frontend Implementation for User Story 3

- [ ] T099 [US3] Create RoomCreate page in `frontend/src/pages/RoomCreate.tsx`
- [ ] T100 [US3] Create RoomJoin page in `frontend/src/pages/RoomJoin.tsx`
- [ ] T101 [US3] Create RoomLobby component in `frontend/src/components/game/RoomLobby.tsx`
- [ ] T102 [US3] Create PlayerList component in `frontend/src/components/game/PlayerList.tsx`
- [ ] T103 [US3] Create InviteLink component in `frontend/src/components/game/InviteLink.tsx`
- [ ] T104 [US3] Implement room socket hooks in `frontend/src/hooks/useRoomSocket.ts`
- [ ] T105 [US3] Create room store in `frontend/src/stores/roomStore.ts`
- [ ] T106 [US3] Implement room API service in `frontend/src/services/roomApi.ts`

**Checkpoint**: User Story 3 complete - users can create and join rooms

---

## Phase 6: User Story 4 - Real-time Gameplay (Priority: P4)

**Goal**: Host starts game, questions play audio, players submit answers, scores update live

**Independent Test**: 2+ players complete a full quiz with score tracking

### Tests for User Story 4

- [ ] T107 [P] [US4] Unit test for GameService in `backend/services/game/test/game.service.spec.ts`
- [ ] T108 [P] [US4] Unit test for ScoringService in `backend/services/game/test/scoring.service.spec.ts`
- [ ] T109 [P] [US4] Unit test for AnswerService in `backend/services/game/test/answer.service.spec.ts`
- [ ] T110 [P] [US4] WebSocket test for game events in `backend/services/game/test/game.gateway.spec.ts`
- [ ] T111 [P] [US4] Frontend test for gameplay in `frontend/tests/unit/Gameplay.spec.tsx`

### Backend Implementation for User Story 4

- [ ] T112 [US4] Create AnswerSubmission entity in `backend/services/game/src/entities/answer-submission.entity.ts`
- [ ] T113 [US4] Add AnswerSubmission migration in `backend/services/game/src/migrations/002-create-answer-submission.ts`
- [ ] T114 [US4] Implement ScoringService with speed bonus in `backend/services/game/src/services/scoring.service.ts`
- [ ] T115 [US4] Implement AnswerService (comparison logic) in `backend/services/game/src/services/answer.service.ts`
- [ ] T116 [US4] Implement GameService (game flow) in `backend/services/game/src/services/game.service.ts`
- [ ] T117 [US4] Create GameGateway (WebSocket events) in `backend/services/game/src/gateways/game.gateway.ts`
- [ ] T118 [US4] Implement question timer in `backend/services/game/src/services/timer.service.ts`
- [ ] T119 [US4] Implement real-time score broadcast in `backend/services/game/src/services/score-broadcast.service.ts`
- [ ] T120 [US4] Add audio sync timestamp to game:start event in `backend/services/game/src/gateways/game.gateway.ts`

### Frontend Implementation for User Story 4

- [ ] T121 [US4] Create GameRoom page (main gameplay) in `frontend/src/pages/GameRoom.tsx`
- [ ] T122 [US4] Create QuestionDisplay component in `frontend/src/components/game/QuestionDisplay.tsx`
- [ ] T123 [US4] Create AnswerInput component in `frontend/src/components/game/AnswerInput.tsx`
- [ ] T124 [US4] Create Scoreboard component in `frontend/src/components/game/Scoreboard.tsx`
- [ ] T125 [US4] Create Timer component in `frontend/src/components/game/Timer.tsx`
- [ ] T126 [US4] Create AudioSync utility in `frontend/src/utils/audioSync.ts`
- [ ] T127 [US4] Implement game socket hooks in `frontend/src/hooks/useGameSocket.ts`
- [ ] T128 [US4] Create game store in `frontend/src/stores/gameStore.ts`
- [ ] T129 [US4] Create CorrectAnswerReveal component in `frontend/src/components/game/CorrectAnswerReveal.tsx`

**Checkpoint**: User Story 4 complete - full gameplay loop works

---

## Phase 7: User Story 5 - Game Results and Rankings (Priority: P5)

**Goal**: After game ends, show final rankings with stats

**Independent Test**: Complete game and verify all players see consistent rankings

### Tests for User Story 5

- [ ] T130 [P] [US5] Unit test for ResultsService in `backend/services/game/test/results.service.spec.ts`
- [ ] T131 [P] [US5] Frontend test for Results in `frontend/tests/unit/Results.spec.tsx`

### Backend Implementation for User Story 5

- [ ] T132 [US5] Implement ResultsService in `backend/services/game/src/services/results.service.ts`
- [ ] T133 [US5] Add results endpoint in `backend/services/game/src/controllers/room.controller.ts`
- [ ] T134 [US5] Add game:end event with full stats in `backend/services/game/src/gateways/game.gateway.ts`
- [ ] T135 [US5] Implement play-again room reset in `backend/services/game/src/services/room.service.ts`

### Frontend Implementation for User Story 5

- [ ] T136 [US5] Create Results page in `frontend/src/pages/Results.tsx`
- [ ] T137 [US5] Create RankingList component in `frontend/src/components/game/RankingList.tsx`
- [ ] T138 [US5] Create PlayerStats component in `frontend/src/components/game/PlayerStats.tsx`
- [ ] T139 [US5] Create PlayAgain component in `frontend/src/components/game/PlayAgain.tsx`

**Checkpoint**: User Story 5 complete - game results display correctly

---

## Phase 8: User Story 6 - Friend System (Priority: P6)

**Goal**: Users can add friends, see online status, invite to rooms

**Independent Test**: Send friend request, accept, verify both see each other with status

### Tests for User Story 6

- [ ] T140 [P] [US6] Unit test for FriendService in `backend/services/social/test/friend.service.spec.ts`
- [ ] T141 [P] [US6] Unit test for PresenceService in `backend/services/social/test/presence.service.spec.ts`
- [ ] T142 [P] [US6] E2E test for friend endpoints in `backend/services/social/test/friend.e2e-spec.ts`
- [ ] T143 [P] [US6] Frontend test for Friends in `frontend/tests/unit/Friends.spec.tsx`

### Backend Implementation for User Story 6

- [ ] T144 [US6] Create FriendRelationship entity in `backend/services/social/src/entities/friend-relationship.entity.ts`
- [ ] T145 [US6] Create Notification entity in `backend/services/social/src/entities/notification.entity.ts`
- [ ] T146 [US6] Create Social migrations in `backend/services/social/src/migrations/001-create-social-tables.ts`
- [ ] T147 [US6] Implement FriendService in `backend/services/social/src/services/friend.service.ts`
- [ ] T148 [US6] Implement PresenceService (Redis) in `backend/services/social/src/services/presence.service.ts`
- [ ] T149 [US6] Implement NotificationService in `backend/services/social/src/services/notification.service.ts`
- [ ] T150 [US6] Implement InviteService in `backend/services/social/src/services/invite.service.ts`
- [ ] T151 [US6] Create FriendController in `backend/services/social/src/controllers/friend.controller.ts`
- [ ] T152 [US6] Create PresenceController in `backend/services/social/src/controllers/presence.controller.ts`
- [ ] T153 [US6] Create NotificationController in `backend/services/social/src/controllers/notification.controller.ts`
- [ ] T154 [US6] Create InviteController in `backend/services/social/src/controllers/invite.controller.ts`

### Frontend Implementation for User Story 6

- [ ] T155 [US6] Create Friends page in `frontend/src/pages/Friends.tsx`
- [ ] T156 [US6] Create FriendList component in `frontend/src/components/social/FriendList.tsx`
- [ ] T157 [US6] Create FriendSearch component in `frontend/src/components/social/FriendSearch.tsx`
- [ ] T158 [US6] Create FriendRequests component in `frontend/src/components/social/FriendRequests.tsx`
- [ ] T159 [US6] Create OnlineStatus indicator in `frontend/src/components/social/OnlineStatus.tsx`
- [ ] T160 [US6] Create Notifications component in `frontend/src/components/social/Notifications.tsx`
- [ ] T161 [US6] Create InviteFriends modal in `frontend/src/components/social/InviteFriends.tsx`
- [ ] T162 [US6] Implement social API service in `frontend/src/services/socialApi.ts`
- [ ] T163 [US6] Create social store in `frontend/src/stores/socialStore.ts`

**Checkpoint**: User Story 6 complete - full friend system works

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, performance, and documentation

- [ ] T164 [P] Create Dockerfile for Auth Service in `backend/services/auth/Dockerfile`
- [ ] T165 [P] Create Dockerfile for Quiz Service in `backend/services/quiz/Dockerfile`
- [ ] T166 [P] Create Dockerfile for Game Service in `backend/services/game/Dockerfile`
- [ ] T167 [P] Create Dockerfile for Social Service in `backend/services/social/Dockerfile`
- [ ] T168 [P] Create Dockerfile for Frontend in `frontend/Dockerfile`
- [ ] T169 Create Terraform ECS module in `infrastructure/terraform/modules/ecs/`
- [ ] T170 [P] Create Terraform RDS module in `infrastructure/terraform/modules/rds/`
- [ ] T171 [P] Create Terraform ElastiCache module in `infrastructure/terraform/modules/elasticache/`
- [ ] T172 [P] Create Terraform ALB module in `infrastructure/terraform/modules/alb/`
- [ ] T173 [P] Create Terraform S3 module in `infrastructure/terraform/modules/s3/`
- [ ] T174 Create dev environment config in `infrastructure/terraform/environments/dev/`
- [ ] T175 Add health check endpoints to all services in each service's `health.controller.ts`
- [ ] T176 [P] Implement graceful shutdown handlers in each service's `main.ts`
- [ ] T177 Add API rate limiting in `backend/shared/guards/rate-limit.guard.ts`
- [ ] T178 [P] Add request logging with correlation IDs in all services
- [ ] T179 Run quickstart.md validation
- [ ] T180 [P] Run security audit (npm audit, secrets scan)
- [ ] T181 Performance testing with k6 in `tests/load/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - US1 (Auth) → US2, US3, US4, US5, US6 all depend on US1
  - US2 (Quiz) → US3, US4 depend on US2
  - US3 (Room) → US4, US5 depend on US3
  - US4 (Gameplay) → US5 depends on US4
  - US6 (Friends) → Can be done in parallel after US1
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
           US1 (Auth)
          /    |    \
         /     |     \
      US2    US6     (parallel)
     (Quiz)  (Friends)
        |
      US3
     (Room)
        |
      US4
   (Gameplay)
        |
      US5
   (Results)
```

- **US1 (P1)**: Foundation - all others depend on this
- **US2 (P2)**: Requires US1 (auth). Quiz content is needed before rooms
- **US3 (P3)**: Requires US1, US2. Rooms need auth and quizzes
- **US4 (P4)**: Requires US1, US2, US3. Gameplay needs everything
- **US5 (P5)**: Requires US4. Results come after gameplay
- **US6 (P6)**: Requires only US1. Can parallel with US2-US5

### Parallel Opportunities

- All `[P]` tasks within a phase can run in parallel
- US6 (Friends) can be developed in parallel with US2-US5
- All 4 service scaffolds (T003-T006) can run in parallel
- All Dockerfiles (T164-T168) can run in parallel
- All Terraform modules (T169-T173) can run in parallel

---

## Parallel Example: User Story 4

```bash
# Launch all tests for US4 together:
Task: "Unit test for GameService in backend/services/game/test/game.service.spec.ts"
Task: "Unit test for ScoringService in backend/services/game/test/scoring.service.spec.ts"
Task: "Unit test for AnswerService in backend/services/game/test/answer.service.spec.ts"
Task: "WebSocket test for game events in backend/services/game/test/game.gateway.spec.ts"

# After entities created, these services can be parallelized:
Task: "Implement ScoringService in backend/services/game/src/services/scoring.service.ts"
Task: "Implement AnswerService in backend/services/game/src/services/answer.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Auth)
4. **STOP and VALIDATE**: Users can login and set nickname
5. Deploy to dev environment

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Auth) → Test independently → Deploy (MVP!)
3. Add US2 (Quiz) → Test independently → Deploy
4. Add US3 (Room) → Test independently → Deploy
5. Add US4 (Gameplay) → Test independently → Deploy (Core game works!)
6. Add US5 (Results) → Test independently → Deploy
7. Add US6 (Friends) → Test independently → Deploy (Full feature set!)
8. Polish → Deploy to production

### Parallel Team Strategy

With 2+ developers:

1. Team completes Setup + Foundational together
2. Once US1 is done:
   - Developer A: US2 → US3 → US4 → US5
   - Developer B: US6 → Polish/DevOps
3. Merge and integrate at each checkpoint

---

## Notes

- [P] tasks = different files, no dependencies
- [USx] label maps task to specific user story for traceability
- Each service has its own Dockerfile for independent deployment
- All services share DTOs via `backend/shared/`
- WebSocket events documented in contracts/game-service.yaml
- Redis keys documented in data-model.md
- Score calculation formula in data-model.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
