# Feature Specification: Enhanced Gameplay Features

**Feature ID**: 002-enhanced-gameplay
**Status**: Draft
**Created**: 2026-01-18
**Priority**: P2 (Post-MVP)

## Overview

This specification defines 6 enhanced gameplay features for the Music Quiz Game platform. These features improve user engagement, game fairness, and social interaction during gameplay.

---

## Feature 1: In-Room Chat System

### Description
Players can communicate via text chat within game rooms, both in the lobby and during active gameplay.

### User Stories
- **US-CHAT-1**: As a player, I want to chat with other players in the lobby before the game starts
- **US-CHAT-2**: As a player, I want to send quick messages during gameplay without interrupting my answer submission
- **US-CHAT-3**: As a player, I want to see chat history when I join an ongoing game

### Requirements

#### Functional Requirements
1. **Lobby Chat**
   - Chat available from the moment a player joins the room
   - Messages display sender nickname and timestamp
   - New players see last 50 messages when joining

2. **In-Game Chat**
   - Chat remains active during gameplay phases (countdown, playing, revealing, leaderboard)
   - Chat input should not interfere with answer submission (separate input fields)
   - Quick emoji reactions for minimal typing

3. **Chat Controls**
   - Mute/unmute individual players (client-side only)
   - Host can disable chat for the room
   - Rate limiting: max 3 messages per 5 seconds per user

#### Non-Functional Requirements
- Message delivery latency < 200ms
- Maximum message length: 200 characters
- Support for basic text only (no images/links)

### Data Model

```typescript
interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

// Redis key: room:{roomId}:chat (List, max 100 messages)
```

### Socket Events

```typescript
// Client → Server
'chat:send' → { roomId: string; content: string; type?: 'message' | 'emoji' }

// Server → Client
'chat:message' → ChatMessage
'chat:history' → { messages: ChatMessage[] }
```

### UI Components
- `ChatPanel.tsx` - Collapsible chat panel on the right side
- `ChatInput.tsx` - Input field with emoji picker
- `ChatMessage.tsx` - Individual message display
- Position: Right sidebar, collapsible on mobile

---

## Feature 2: First-Correct-Answer-Only Scoring

### Description
Only the first player to submit the correct answer earns points for that round. All other correct answers receive no points.

### User Stories
- **US-FIRST-1**: As a host, I want to enable "first correct only" mode when creating a room
- **US-FIRST-2**: As a player, I want to see who won each round (first correct answerer)
- **US-FIRST-3**: As a player, I want a visual indicator showing someone already got it right

### Requirements

#### Functional Requirements
1. **Room Configuration**
   - New room setting: `scoringMode: 'all_correct' | 'first_correct_only'`
   - Default: `all_correct` (current behavior)
   - Host can change before game starts

2. **Scoring Logic**
   - First correct answer receives full points (base + time bonus)
   - Subsequent correct answers receive 0 points
   - Incorrect answers always receive 0 points

3. **Real-time Feedback**
   - When first correct answer is submitted, broadcast to all players
   - Show "Someone got it!" notification (without revealing who)
   - Players can still submit answers for statistics tracking

4. **Round Results**
   - Highlight the winner of each round
   - Show "First correct: [nickname]" prominently

#### Non-Functional Requirements
- Answer validation must be atomic (prevent race conditions)
- Winner determination must be consistent across all clients

### Data Model

```typescript
interface RoomSettings {
  // ... existing fields
  scoringMode: 'all_correct' | 'first_correct_only';
}

interface RoundResult {
  // ... existing fields
  firstCorrectPlayerId: string | null;
  firstCorrectNickname: string | null;
}
```

### Socket Events

```typescript
// Server → Client (new event)
'game:first_correct' → { round: number; playerId: string; nickname: string }
```

---

## Feature 3: Skip Voting System

### Description
Players can vote to skip the current song. If all active players vote to skip, the round ends immediately and moves to the next song.

### User Stories
- **US-SKIP-1**: As a player, I want to vote to skip a song I don't recognize
- **US-SKIP-2**: As a player, I want to see how many players have voted to skip
- **US-SKIP-3**: As a host, I can choose to always skip after X seconds with no correct answers

### Requirements

#### Functional Requirements
1. **Skip Voting**
   - Each player can vote to skip once per round
   - Skip button available during `playing` phase only
   - Cannot unvote once voted

2. **Skip Threshold**
   - Skip requires 100% of active players to vote
   - Or configurable percentage (e.g., 75%)
   - Skip triggers immediately when threshold reached

3. **Skip Execution**
   - End current round with no winner
   - Reveal correct answer as normal
   - Proceed to leaderboard phase
   - All players who voted skip can still see the answer

4. **Host Controls**
   - Enable/disable skip voting per room
   - Configure skip threshold percentage
   - Auto-skip after configurable timeout with no correct answers

#### Non-Functional Requirements
- Vote registration < 100ms
- Skip execution immediate upon threshold

### Data Model

```typescript
interface RoomSettings {
  // ... existing fields
  skipVotingEnabled: boolean;
  skipThresholdPercent: number; // 50-100, default 100
  autoSkipSeconds: number | null; // null = disabled
}

interface RoundState {
  // ... existing fields
  skipVotes: Set<string>; // playerIds who voted to skip
}
```

### Socket Events

```typescript
// Client → Server
'game:vote_skip' → { roomId: string }

// Server → Client
'game:skip_vote_update' → { count: number; total: number; percent: number }
'game:skip_executed' → { reason: 'unanimous' | 'threshold' | 'auto_timeout' }
```

---

## Feature 4: Multiple Accepted Answers (Title-Only Matching)

### Description
Quiz creators can specify multiple accepted answers per song, supporting title-only matching or alternative titles/spellings.

### User Stories
- **US-MULTI-1**: As a quiz creator, I want to specify that only the song title is required (not artist)
- **US-MULTI-2**: As a quiz creator, I want to add alternative accepted answers (e.g., Korean and English titles)
- **US-MULTI-3**: As a player, I want to know what level of specificity is required for answers

### Requirements

#### Functional Requirements
1. **Answer Configuration**
   - Primary answer: required (title - artist format)
   - `matchMode`: `'title_only' | 'title_and_artist' | 'exact'`
   - Additional accepted answers: array of strings

2. **Match Mode Behavior**
   - `title_only`: Only song title required, ignore artist
   - `title_and_artist`: Both required but order flexible
   - `exact`: Must match primary answer exactly (fuzzy matching still applied)

3. **Alternative Answers**
   - Quiz creator can add up to 5 alternative answers per song
   - Each alternative is checked independently
   - Any match counts as correct

4. **Player Guidance**
   - Display match mode hint in gameplay UI
   - "Title only" / "Title and Artist" indicator

#### Non-Functional Requirements
- Fuzzy matching still applies to all answer types
- All accepted answers stored in database, not computed

### Data Model

```typescript
interface Song {
  // ... existing fields
  matchMode: 'title_only' | 'title_and_artist' | 'exact';
  alternativeAnswers: string[]; // max 5
}

// Update quiz creation form to support these fields
```

### UI Changes
- QuestionForm: Add matchMode selector
- QuestionForm: Add alternative answers input (repeatable)
- GamePlay: Show match mode indicator ("Answer with: Title only")

---

## Feature 5: Hint System

### Description
Display configurable hints during gameplay to help players identify songs.

### User Stories
- **US-HINT-1**: As a host, I want to enable hints that reveal song info after X seconds
- **US-HINT-2**: As a player, I want to see progressive hints as time passes
- **US-HINT-3**: As a host, I want to choose what hints are shown (genre, year, first letter)

### Requirements

#### Functional Requirements
1. **Hint Types**
   - `genre`: Display song genre
   - `year`: Display release year
   - `first_letter`: Display first letter of title/artist
   - `word_count`: Display number of words in title

2. **Hint Configuration (Per Quiz)**
   - Enable/disable hints
   - Select which hint types to show
   - Configure delay before each hint appears (seconds)
   - Hints reduce points earned (configurable penalty)

3. **Hint Display**
   - Hints appear sequentially based on configured timing
   - Example: Genre at 5s, Year at 10s, First letter at 15s
   - Hints visible to all players simultaneously

4. **Point Penalty**
   - Each revealed hint reduces max points by configurable percentage
   - Example: -10% per hint
   - Minimum points still apply

#### Non-Functional Requirements
- Hints must be synchronized across all clients (server timestamp)
- Hint reveal timing based on round start, not individual player timing

### Data Model

```typescript
interface QuizSettings {
  // ... existing fields
  hintsEnabled: boolean;
  hintConfig: HintConfig[];
}

interface HintConfig {
  type: 'genre' | 'year' | 'first_letter' | 'word_count';
  delaySeconds: number;
  pointPenaltyPercent: number; // 0-50
}

interface Song {
  // ... existing fields
  genre?: string;
  releaseYear?: number;
}
```

### Socket Events

```typescript
// Server → Client
'game:hint' → {
  round: number;
  hintType: string;
  hintValue: string;
  currentPenaltyPercent: number;
}
```

### UI Components
- `HintDisplay.tsx` - Shows revealed hints
- `QuizSettings` update for hint configuration
- `SongForm` update for genre/year fields

---

## Feature 6: Live Score Display During Game

### Description
Display a live scoreboard visible throughout gameplay, updating in real-time as answers are submitted.

### User Stories
- **US-LIVE-1**: As a player, I want to see my current rank while playing
- **US-LIVE-2**: As a player, I want to see score changes in real-time
- **US-LIVE-3**: As a host, I want to toggle live scores on/off

### Requirements

#### Functional Requirements
1. **Live Scoreboard**
   - Compact scoreboard visible during `playing` phase
   - Shows: Rank, Nickname, Score, Correct count
   - Updates immediately when answers are evaluated

2. **Display Modes**
   - `full`: Show all scores (current behavior in leaderboard phase)
   - `compact`: Mini scoreboard on side (rank + score only)
   - `hidden`: No scores visible until round end

3. **Real-time Updates**
   - Score updates broadcast immediately after answer evaluation
   - Animation for score changes
   - Rank changes highlighted

4. **Configuration**
   - Host can set display mode per room
   - Default: `hidden` (to avoid pressure)

#### Non-Functional Requirements
- Score updates < 200ms after answer evaluation
- UI should not distract from gameplay

### Data Model

```typescript
interface RoomSettings {
  // ... existing fields
  liveScoreDisplay: 'full' | 'compact' | 'hidden';
}
```

### Socket Events

```typescript
// Server → Client (enhance existing)
'game:score_update' → {
  leaderboard: Array<{
    playerId: string;
    nickname: string;
    score: number;
    rank: number;
    correctCount: number;
    previousRank: number; // For animation
  }>;
}
```

### UI Components
- `LiveScoreboard.tsx` - Compact real-time scoreboard
- Position: Top-right corner, semi-transparent
- Collapsible on mobile

---

## Implementation Priority

1. **Feature 2: First-Correct-Answer-Only** - Low complexity, high engagement impact
2. **Feature 6: Live Score Display** - Medium complexity, good UX improvement
3. **Feature 1: Chat System** - Medium complexity, essential social feature
4. **Feature 3: Skip Voting** - Low complexity, quality of life improvement
5. **Feature 4: Multiple Answers** - Medium complexity, quiz flexibility
6. **Feature 5: Hint System** - High complexity, can be deferred

## Dependencies

- All features depend on existing 001-music-quiz-game implementation
- Feature 1 (Chat) is independent, can be developed first
- Features 2, 3, 6 modify game scoring/flow, should be coordinated
- Features 4, 5 extend quiz creation, can be grouped

## Technical Considerations

### Backend Changes
- Game Service: New socket events, scoring logic changes
- Quiz Service: Extended song/quiz models
- Redis: Chat message storage, skip vote tracking

### Frontend Changes
- New components for chat, hints, live scoreboard
- Room settings UI expansion
- Quiz creation form extensions

### Database Migrations
- Add new columns to `quizzes` table (hint config)
- Add new columns to `songs` table (match mode, alternatives, genre, year)
- Add new columns to `rooms` table (scoring mode, skip settings, live score display)
