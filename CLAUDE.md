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
4. Auto-reset to `waiting` after 2 seconds

<!-- MANUAL ADDITIONS END -->
