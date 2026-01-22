# music_game Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-17

## Active Technologies

- TypeScript 5.x (Backend: Node.js 20 LTS, Frontend: React 18) (001-music-quiz-game)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (Backend: Node.js 20 LTS, Frontend: React 18): Follow standard conventions

## Recent Changes

- 001-music-quiz-game: Added TypeScript 5.x (Backend: Node.js 20 LTS, Frontend: React 18)

<!-- MANUAL ADDITIONS START -->

## Bugfixes Log (2026-01-18)

### 1. Audio File URL Path Mismatch
**Problem**: MP3 audio files uploaded to `uploads/audio/` but URL generated as `/uploads/filename.mp3` (missing `/audio`)
**Root Cause**: `local-storage.service.ts` baseUrl was `/uploads` instead of `/uploads/audio`
**Fix**: `backend/services/quiz/src/services/local-storage.service.ts:15` - Changed baseUrl to include `/audio`
**SQL Fix**: `UPDATE songs SET "audioUrl" = REPLACE("audioUrl", '/uploads/', '/uploads/audio/') WHERE "audioUrl" LIKE '%/uploads/%' AND "audioUrl" NOT LIKE '%/uploads/audio/%'`

### 2. YouTube Quiz "Round 0 of 0" Issue
**Problem**: YouTube quizzes stuck on "Round 0 of 0" and don't progress
**Root Cause**: `sourceType` field not being saved during song creation - defaulted to 'upload' even for YouTube URLs
**Fix**: `backend/services/quiz/src/services/quiz.service.ts` - Added `sourceType` to song creation with auto-detection via `detectSourceType()` helper
**SQL Fix**: `UPDATE songs SET "sourceType" = 'youtube' WHERE "audioUrl" LIKE '%youtube.com%' OR "audioUrl" LIKE '%youtu.be%'`

### 3. Game Service Internal API 404
**Problem**: Game service calling Quiz service internal endpoint returned 404
**Root Cause**: Quiz service has global prefix `/quiz` but Game service was calling `/internal/get-quiz`
**Fix**: `backend/services/game/src/services/game.service.ts` - Changed URL to `/quiz/internal/get-quiz`

### 4. YouTubePlayer React DOM Cleanup Error
**Problem**: After answer submission on YouTube quiz, React throws `NotFoundError: Failed to execute 'removeChild' on 'Node'`
**Root Cause**: YouTube IFrame API replaces the DOM node, React can't clean up a node it didn't create
**Fix**: `frontend/src/components/game/YouTubePlayer.tsx`
- Create dynamic player div outside React's control using `document.createElement`
- Use `innerHTML = ''` for cleanup instead of React's DOM reconciliation
- Add unique player ID with `useRef` to prevent conflicts

### 5. Game Event Listeners Duplicate Registration
**Problem**: Game socket event listeners registered multiple times causing duplicate state updates
**Root Cause**: `initializeListeners()` called without deduplication check
**Fix**: `frontend/src/stores/gameStore.ts`
- Added `listenersInitialized` flag outside store
- Reset flag in `reset()` action
- Skip registration if already initialized

## Architecture Notes

### Service Ports
- Auth Service: 3001
- Quiz Service: 3002
- Game Service: 3003
- Social Service: 3004
- Frontend: 5173

### Internal Service Communication
- Uses `X-Internal-Key` header for service-to-service auth
- Quiz service global prefix: `/quiz`
- Internal endpoints follow pattern: `/{service}/internal/{action}`

### Audio Sources
- **upload**: Local MP3 files served from `/uploads/audio/`
- **youtube**: YouTube links processed via IFrame API

### Socket.IO Namespaces
- Room namespace: `/room`
- Events: `game:initialized`, `game:countdown`, `game:round_started`, `game:round_ended`, `game:leaderboard`, `game:finished`

## Bugfixes Log (2026-01-21)

### 6. Round Timer Carry-Over Bug
**Problem**: First round's remaining time affected second round's timer
**Root Cause**: setTimeout for round end wasn't being cancelled when round ended early (correct answer)
**Fix**: `backend/services/game/src/gateways/room.gateway.ts`
- Added `roundTimers` Map to store timers by roomId
- Added `clearRoundTimer()` method
- Clear timer when correct answer received or skip vote passes

### 7. Room Not Resetting After Game Ends
**Problem**: After game ends, clicking "Play" shows "Round 0 of 0" and game doesn't restart
**Root Cause**: Room status stayed 'finished', game state not reset
**Fix**:
- `backend/services/game/src/services/room.service.ts` - Added `resetForNewGame()` function
- `backend/services/game/src/gateways/room.gateway.ts` - Auto-reset room 2 seconds after game ends, emit `room:reset` event
- `frontend/src/stores/roomStore.ts` - Handle `room:reset` event
- `frontend/src/pages/GamePlay.tsx` - Navigate to lobby when room resets to 'waiting'

### 8. Skip Voting Button Not Showing
**Problem**: Skip Voting button didn't appear even when enabled in room settings
**Root Cause**: `skipVotingEnabled` and `totalPlayers` not sent in `game:initialized` and `game:state` events
**Fix**:
- `backend/services/game/src/gateways/room.gateway.ts` - Added fields to both events
- `frontend/src/stores/gameStore.ts` - Updated handlers to receive new fields

### 9. Chat/Answer Submission Logic
**Problem**: Any chat message marked user as "Answered", preventing subsequent correct answer attempts
**Root Cause**: Backend blocked multiple submissions; frontend set `hasAnswered: true` on any submission
**Fix** (Policy: users can submit multiple times until correct):
- `backend/services/game/src/services/game.service.ts` - Only block if player already has correct answer
- `backend/services/game/src/gateways/room.gateway.ts` - Return `isCorrect` in response
- `frontend/src/stores/gameStore.ts` - Only set `hasAnswered: true` when answer is correct
- `frontend/src/components/game/GameChat.tsx` - Updated UI messages

## Game Flow Notes

### Answer Submission Policy
- Chat and answer are integrated (not separate)
- Users can submit multiple answers until they get the correct one
- Once correct answer is submitted, `hasAnswered` becomes true
- Other players can still submit their own answers

### Round Timer Management
- Each room has its own timer stored in `roundTimers` Map
- Timer is cleared when:
  - Correct answer is submitted
  - Skip vote threshold is reached
  - Round naturally ends

### Room Lifecycle
1. `waiting` → Players join, set ready
2. `playing` → Game in progress
3. `finished` → Game ended, shows results
4. Room is deleted 5 seconds after game ends (players redirected to home)

## Bugfixes Log (2026-01-22)

### 10. Chat Message Duplication
**Problem**: When one person sends a chat message, others see it multiple times
**Root Cause**: Socket listeners in `chatStore.ts` weren't being removed on reset, causing accumulation
**Fix**: `frontend/src/stores/chatStore.ts`
- Added `socket.off('chat:message')` in the reset function to clean up listeners

### 11. Room Deletion After Game
**Problem**: Room was resetting to waiting state instead of being deleted after game ends
**Root Cause**: Room used `resetForNewGame()` instead of deleting
**Fix**:
- `backend/services/game/src/services/room.service.ts` - Made `deleteRoom` public with player mapping cleanup
- `backend/services/game/src/gateways/room.gateway.ts` - Delete room 5 seconds after game ends, emit `room:closed` event
- `frontend/src/pages/GamePlay.tsx` - Navigate to home when room is null after game

### 12. WebSocket CORS Wildcard Security Issue
**Problem**: WebSocket CORS was set to wildcard `*`, allowing any origin
**Root Cause**: Security oversight in initial implementation
**Fix**: `backend/services/game/src/gateways/room.gateway.ts`
- Replaced wildcard with domain-specific validation function
- Allows localhost for development and `*.musicquiz.cloud` for production

### 13. Socket Listener Duplication in roomStore
**Problem**: Room socket listeners accumulated on reconnection
**Root Cause**: `connect()` didn't remove existing listeners before adding new ones
**Fix**: `frontend/src/stores/roomStore.ts`
- Added `socket.off()` calls for all event types before registering new listeners

### 14. Socket Duplicate Connections in friendsStore
**Problem**: Friends socket creating multiple connections
**Root Cause**: No check for existing connected socket
**Fix**: `frontend/src/stores/friendsStore.ts`
- Check if socket is already connected before creating new connection
- Clean up existing socket before creating new one

### 15. Missing Error Boundary
**Problem**: React errors caused white screen without recovery option
**Root Cause**: No error boundary in the application
**Fix**: `frontend/src/App.tsx`
- Added `ErrorBoundary` class component wrapping the entire app
- Shows error message with refresh button on errors

### 16. SSL Certificate Verification Issue
**Problem**: Database connections failing in production due to SSL certificate verification
**Root Cause**: Hardcoded `rejectUnauthorized: false` not configurable
**Fix**: All 4 `database.config.ts` files (auth, quiz, game, social)
- Added `DB_SSL_MODE` environment variable support
- Options: `disable`, `no-verify`, `require` (default)

### 17. Input Validation Missing on Query Parameters
**Problem**: No validation on `limit` and `offset` parameters in quiz API
**Root Cause**: Direct use of query parameters without sanitization
**Fix**: `backend/services/quiz/src/controllers/quiz.controller.ts`
- Added max limits (MAX_LIMIT=100, MAX_OFFSET=10000)
- Validate and sanitize all limit/offset parameters

### 18. Scoring Mode Removal (Feature Change)
**Problem**: Scoring mode option was confusing, wanted to simplify to first-correct-only
**Change**: Removed `scoringMode` option entirely, always use first-correct-only mode
**Files Modified**:
- `backend/services/game/src/entities/room.types.ts` - Removed `ScoringMode` type and `scoringMode` field
- `backend/services/game/src/entities/game.types.ts` - Removed `scoringMode` field
- `backend/services/game/src/services/room.service.ts` - Removed from default settings
- `backend/services/game/src/services/game.service.ts` - Always use first_correct_only logic
- `backend/services/game/src/gateways/room.gateway.ts` - Removed from game state response
- `frontend/src/services/room.ts` - Removed `ScoringMode` type
- `frontend/src/stores/gameStore.ts` - Removed `scoringMode` state
- `frontend/src/pages/CreateRoom.tsx` - Removed scoring mode UI
- `frontend/src/pages/GamePlay.tsx` - Removed `scoringMode` usage

## Scoring System

### Current Behavior (First Correct Only)
- Only the first player to answer correctly earns points
- Base points: 1000 + time bonus (up to 500)
- Subsequent correct answers receive 0 points
- If hint is revealed: 10% point penalty

### Point Calculation
```
points = (basePoints + timeBonus) * (1 - hintPenalty)
where:
  basePoints = 1000
  timeBonus = (timeRemaining / totalTime) * 500
  hintPenalty = 0.10 if hint revealed, else 0
```

<!-- MANUAL ADDITIONS END -->
