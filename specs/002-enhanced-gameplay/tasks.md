# Tasks: Enhanced Gameplay Features

**Input**: Design documents from `/specs/002-enhanced-gameplay/`
**Prerequisites**: 001-music-quiz-game must be fully functional
**Status**: Draft - Ready for implementation

## Format: `[ID] [P?] [Feature] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Feature]**: F1=Chat, F2=First-Correct, F3=Skip, F4=Multi-Answer, F5=Hints, F6=LiveScore

---

## Phase 1: Feature 2 - First-Correct-Answer-Only Scoring (Priority: Highest)

**Goal**: Only first correct answer earns points
**Complexity**: Low | **Impact**: High

### Backend

- [X] T201 [F2] Add `scoringMode` field to room settings in `backend/services/game/src/entities/room.types.ts`
- [X] T202 [F2] No migration needed - using Redis-based room state
- [X] T203 [F2] Update RoomService to support scoring mode in `backend/services/game/src/services/room.service.ts`
- [X] T204 [F2] Implement first-correct logic in `backend/services/game/src/services/game.service.ts`
- [X] T205 [F2] Add `game:first_correct` socket event in `backend/services/game/src/gateways/room.gateway.ts`
- [X] T206 [F2] Update round result to include first correct player info

### Frontend

- [X] T207 [P] [F2] Add scoring mode option to room creation in `frontend/src/pages/CreateRoom.tsx`
- [X] T208 [P] [F2] Update room/game stores to handle scoring mode
- [X] T209 [F2] Add "Someone got it!" notification in `frontend/src/pages/GamePlay.tsx`
- [X] T210 [F2] Highlight first correct player in round results

**Checkpoint**: First-correct scoring mode works end-to-end

---

## Phase 2: Feature 6 - Live Score Display (Priority: High)

**Goal**: Real-time scoreboard visible during gameplay
**Complexity**: Medium | **Impact**: High

### Backend

- [X] T211 [F6] Add `liveScoreDisplay` setting to room settings entity
- [X] T212 [F6] No migration needed - using Redis-based room state
- [X] T213 [F6] Update score broadcast to include rank changes in `backend/services/game/src/gateways/room.gateway.ts`
- [X] T214 [F6] Emit `game:score_update` with previous rank data

### Frontend

- [X] T215 [P] [F6] Create `LiveScoreboard.tsx` component in `frontend/src/components/game/`
- [X] T216 [P] [F6] Add live score display option to room creation
- [X] T217 [F6] Integrate LiveScoreboard into GamePlay page
- [X] T218 [F6] Add score change animations with rank indicator
- [X] T219 [F6] Handle responsive layout (collapsible on mobile)

**Checkpoint**: Live scoreboard updates in real-time during gameplay

---

## Phase 3: Feature 1 - In-Room Chat System (Priority: High)

**Goal**: Players can chat in lobby and during gameplay
**Complexity**: Medium | **Impact**: High

### Backend

- [X] T220 [F1] Create chat socket events in `backend/services/game/src/gateways/room.gateway.ts`
- [X] T221 [F1] Implement Redis chat message storage with TTL
- [X] T222 [F1] Add rate limiting for chat messages (3 per 5 seconds)
- [X] T223 [F1] Add chat history retrieval on room join
- [X] T224 [F1] Add `chatEnabled` room setting and migration

### Frontend

- [X] T225 [P] [F1] Create `ChatPanel.tsx` component in `frontend/src/components/game/`
- [X] T226 [P] [F1] Create `ChatInput.tsx` with emoji picker in `frontend/src/components/game/`
- [X] T227 [P] [F1] Create `ChatMessage.tsx` component in `frontend/src/components/game/`
- [X] T228 [F1] Add chat store in `frontend/src/stores/chatStore.ts`
- [X] T229 [F1] Integrate ChatPanel into RoomLobby page
- [X] T230 [F1] Integrate ChatPanel into GamePlay page
- [X] T231 [F1] Implement client-side mute functionality
- [X] T232 [F1] Add chat toggle for host in room settings

**Checkpoint**: Chat works in lobby and during gameplay

---

## Phase 4: Feature 3 - Skip Voting System (Priority: Medium)

**Goal**: All players can vote to skip to next song
**Complexity**: Low | **Impact**: Medium

### Backend

- [ ] T233 [F3] Add skip voting settings to room entity
- [ ] T234 [F3] Create migration for skip voting columns
- [ ] T235 [F3] Implement skip vote tracking in Redis
- [ ] T236 [F3] Add `game:vote_skip` socket handler
- [ ] T237 [F3] Implement skip threshold check and execution
- [ ] T238 [F3] Add auto-skip timer based on configuration
- [ ] T239 [F3] Emit `game:skip_vote_update` and `game:skip_executed` events

### Frontend

- [ ] T240 [P] [F3] Add skip vote button to GamePlay page
- [ ] T241 [P] [F3] Create `SkipVoteIndicator.tsx` showing vote progress
- [ ] T242 [F3] Add skip voting settings to room creation
- [ ] T243 [F3] Handle skip execution UI transition
- [ ] T244 [F3] Update game store for skip voting state

**Checkpoint**: Skip voting works with configurable threshold

---

## Phase 5: Feature 4 - Multiple Accepted Answers (Priority: Medium)

**Goal**: Quiz creators can define multiple valid answers
**Complexity**: Medium | **Impact**: Medium

### Backend

- [ ] T245 [F4] Add `matchMode` and `alternativeAnswers` to Song entity
- [ ] T246 [F4] Create migration for answer configuration columns
- [ ] T247 [F4] Update answer validation in `backend/services/game/src/services/answer.service.ts`
- [ ] T248 [F4] Update quiz creation/update DTOs for new fields
- [ ] T249 [F4] Update quiz internal endpoint to include match mode

### Frontend

- [ ] T250 [P] [F4] Add match mode selector to QuestionForm
- [ ] T251 [P] [F4] Add alternative answers input (repeatable field)
- [ ] T252 [F4] Show match mode indicator in GamePlay ("Answer with: Title only")
- [ ] T253 [F4] Update quiz API service for new fields
- [ ] T254 [F4] Validate alternative answers count (max 5)

**Checkpoint**: Multiple answer configurations work with fuzzy matching

---

## Phase 6: Feature 5 - Hint System (Priority: Low)

**Goal**: Progressive hints reveal during gameplay
**Complexity**: High | **Impact**: Medium

### Backend

- [ ] T255 [F5] Add `genre` and `releaseYear` to Song entity
- [ ] T256 [F5] Add hint configuration to Quiz entity
- [ ] T257 [F5] Create migration for hint-related columns
- [ ] T258 [F5] Implement hint scheduler in `backend/services/game/src/services/hint.service.ts`
- [ ] T259 [F5] Calculate point penalty based on revealed hints
- [ ] T260 [F5] Emit `game:hint` socket event at configured intervals

### Frontend

- [ ] T261 [P] [F5] Add genre/year fields to QuestionForm
- [ ] T262 [P] [F5] Create hint configuration UI in quiz settings
- [ ] T263 [P] [F5] Create `HintDisplay.tsx` component
- [ ] T264 [F5] Integrate hints into GamePlay page
- [ ] T265 [F5] Show current point penalty indicator
- [ ] T266 [F5] Update quiz store for hint configuration

**Checkpoint**: Hints appear at configured times with point penalty

---

## Dependencies & Execution Order

### Feature Dependencies
```
F2 (First-Correct) ─┐
                    ├─→ Can be done in any order
F6 (Live Score) ────┘

F1 (Chat) ──────────→ Independent, can start anytime

F3 (Skip) ──────────→ Depends on F2 scoring changes being stable

F4 (Multi-Answer) ──→ Independent quiz model changes

F5 (Hints) ─────────→ Depends on F4 (quiz model extensions)
```

### Recommended Order
1. **F2 + F6** - Can be developed in parallel
2. **F1** - Start after F2, independent work
3. **F3** - After F2 is stable
4. **F4** - Can start anytime
5. **F5** - After F4, most complex

### Parallel Opportunities
- F2 Frontend (T207-T210) can parallel with F2 Backend (T201-T206)
- F6 Frontend (T215-T219) can parallel with F6 Backend (T211-T214)
- F1, F4, F5 have internal parallel tasks marked with [P]

---

## Testing Checklist

### Feature 2 Tests
- [ ] First correct answer gets points, others get 0
- [ ] Mode toggles correctly before game starts
- [ ] "Someone got it!" notification appears for all players
- [ ] Round results highlight winner

### Feature 6 Tests
- [ ] Scoreboard updates in real-time
- [ ] Rank changes animate correctly
- [ ] Display mode changes work
- [ ] Mobile layout collapses properly

### Feature 1 Tests
- [ ] Messages send/receive in lobby
- [ ] Messages work during gameplay
- [ ] Rate limiting prevents spam
- [ ] Chat history loads on join
- [ ] Mute functionality works

### Feature 3 Tests
- [ ] Skip vote registers correctly
- [ ] Threshold calculation is accurate
- [ ] Skip executes immediately at threshold
- [ ] Auto-skip timer works
- [ ] Round ends properly after skip

### Feature 4 Tests
- [ ] Title-only mode accepts title without artist
- [ ] Alternative answers all work
- [ ] Fuzzy matching applies to all answer types
- [ ] UI indicates required answer format

### Feature 5 Tests
- [ ] Hints appear at correct times
- [ ] Point penalty applies correctly
- [ ] All hint types work (genre, year, first letter, word count)
- [ ] Hints sync across all clients

---

## Notes

- All features should maintain backward compatibility
- Room settings changes require migration coordination
- Socket events should follow existing patterns
- Test with both single player and multiplayer scenarios
- Consider Korean language support for fuzzy matching improvements
